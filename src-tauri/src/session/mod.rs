use crate::network::{ConnectionFactory, ConnectionManager};
use crate::types::{SessionConfig, ConnectionStatus, NetworkResult, NetworkError, NetworkEvent};
use tokio::sync::mpsc;
use tauri::AppHandle;

pub mod manager;
pub mod state;
pub mod buffer;

pub use manager::SessionManager;
pub use state::SessionState;
pub use buffer::SessionBuffer;

/// Represents an active network session
#[derive(Debug)]
pub struct Session {
    pub id: String,
    pub config: SessionConfig,
    pub state: SessionState,
    #[allow(dead_code)]
    pub buffer: SessionBuffer,
    connection_manager: ConnectionManager,
    event_sender: Option<mpsc::Sender<NetworkEvent>>,
}

impl Session {
    pub fn new(id: String, config: SessionConfig) -> Self {
        let connection_manager = ConnectionManager::new(
            id.clone(),
            config.timeout,
            config.retry_attempts,
            config.retry_delay,
        );

        Self {
            id: id.clone(),
            config,
            state: SessionState::new(id.clone()),
            buffer: SessionBuffer::new(),
            connection_manager,
            event_sender: None,
        }
    }

    /// Connect the session using the configured protocol with timeout and retry
    pub async fn connect(&mut self) -> NetworkResult<()> {
        // Check if already connecting
        if self.connection_manager.is_connecting().await {
            return Err(NetworkError::ConnectionFailed("Connection already in progress".to_string()));
        }

        // Create status channel for connection updates
        let (status_tx, status_rx) = mpsc::channel(100);

        // Clone necessary data for the connection factory
        let session_id = self.id.clone();
        let protocol = self.config.protocol.clone();
        let connection_type = self.config.connection_type.clone();
        let config_value = serde_json::to_value(&self.config)?;

        // Create connection factory closure that can be called multiple times
        let connection_factory = {
            let session_id = session_id.clone();
            let protocol = protocol.clone();
            let connection_type = connection_type.clone();
            let config_value = config_value.clone();
            let app_handle = self.state.get_app_handle();

            move || {
                let session_id = session_id.clone();
                let protocol = protocol.clone();
                let connection_type = connection_type.clone();
                let config_value = config_value.clone();
                let app_handle = app_handle.clone();

                async move {
                    eprintln!("Creating connection for session {} with protocol {} and type {}", session_id, protocol, connection_type);
                    ConnectionFactory::create_connection(
                        session_id,
                        &protocol,
                        &connection_type,
                        config_value,
                        app_handle,
                    )
                }
            }
        };

        // Spawn background task to handle status updates
        let state_clone = self.state.clone();
        tokio::spawn(async move {
            let mut status_rx = status_rx;
            while let Some(status) = status_rx.recv().await {
                state_clone.set_status(status);
            }
        });

        // Attempt connection with timeout and retry
        self.connection_manager.connect_with_retry(connection_factory, status_tx).await?;

        // Immediately set app handle on the connection after successful connection
        if let Some(app_handle) = self.state.get_app_handle() {
            eprintln!("Session: Setting app handle on connection manager after successful connection for session {}", self.id);
            self.connection_manager.set_app_handle(app_handle).await;
        } else {
            eprintln!("Session: WARNING - No app handle available to set on connection for session {}", self.id);
        }

        // Check if any configuration has changed after connection (e.g., port changes for TCP server)
        self.check_and_emit_config_changes().await?;

        Ok(())
    }

    /// Set the app handle for event emission
    pub async fn set_app_handle(&mut self, app_handle: AppHandle) {
        self.state.set_app_handle(app_handle.clone());

        // Set the app handle on the connection if it exists
        self.connection_manager.set_app_handle(app_handle).await;
    }

    /// Check if configuration has changed after connection and emit updates
    async fn check_and_emit_config_changes(&self) -> NetworkResult<()> {
        // Check if this is a TCP server that might have changed ports
        if self.config.protocol == "tcp" && self.config.connection_type == "server" {
            // Try to get the actual port from the connection
            if let Some(actual_port) = self.connection_manager.get_actual_port().await {
                if actual_port != self.config.port {
                    eprintln!("Session: Port changed from {} to {} for session {}",
                        self.config.port, actual_port, self.id);

                    // Emit configuration update to frontend
                    let config_updates = serde_json::json!({
                        "port": actual_port,
                        "originalPort": self.config.port
                    });

                    self.state.emit_config_update(config_updates);
                }
            }
        }
        Ok(())
    }

    /// Cancel ongoing connection attempt
    pub async fn cancel_connection(&mut self) -> NetworkResult<()> {
        self.connection_manager.cancel_connection().await;
        self.state.set_status(ConnectionStatus::Disconnected);
        Ok(())
    }

    /// Pause auto-reconnect for a TCP client session
    pub async fn pause_auto_reconnect(&mut self) -> NetworkResult<()> {
        eprintln!("Session: Attempting to pause auto-reconnect for session {}", self.id);
        self.connection_manager.pause_auto_reconnect().await?;
        eprintln!("Session: Auto-reconnect paused successfully for session {}", self.id);
        Ok(())
    }

    /// Resume auto-reconnect for a TCP client session
    pub async fn resume_auto_reconnect(&mut self) -> NetworkResult<()> {
        eprintln!("Session: Attempting to resume auto-reconnect for session {}", self.id);
        self.connection_manager.resume_auto_reconnect().await?;
        eprintln!("Session: Auto-reconnect resumed successfully for session {}", self.id);
        Ok(())
    }



    /// Disconnect the session and cleanup resources
    pub async fn disconnect(&mut self) -> NetworkResult<()> {
        // Cancel any ongoing connection attempts and disconnect
        self.connection_manager.disconnect().await?;

        // Update state
        self.state.set_status(ConnectionStatus::Disconnected);

        // Cleanup channels
        self.event_sender = None;

        Ok(())
    }

    /// Disconnect a specific client from a server session
    pub async fn disconnect_client(&mut self, client_id: &str) -> NetworkResult<()> {
        // Delegate to connection manager
        self.connection_manager.disconnect_client(client_id).await
    }

    /// Send data to a specific client (server mode)
    pub async fn send_to_client(&mut self, client_id: &str, data: &[u8]) -> NetworkResult<usize> {
        eprintln!("Session: Delegating send_to_client to connection manager for session {} client {}", self.id, client_id);
        // Delegate to connection manager
        match self.connection_manager.send_to_client(client_id, data).await {
            Ok(bytes_sent) => {
                eprintln!("Session: Successfully sent {} bytes to client {} in session {}", bytes_sent, client_id, self.id);
                Ok(bytes_sent)
            }
            Err(e) => {
                eprintln!("Session: Failed to send to client {} in session {}: {}", client_id, self.id, e);
                Err(e)
            }
        }
    }

    /// Broadcast data to all clients (server mode)
    pub async fn broadcast(&mut self, data: &[u8]) -> NetworkResult<usize> {
        // Delegate to connection manager
        self.connection_manager.broadcast(data).await
    }

    /// Send data through the connection
    pub async fn send(&mut self, data: &[u8]) -> NetworkResult<usize> {
        // Delegate to connection manager
        self.connection_manager.send(data).await
    }

    /// Send UDP message to specific address
    pub async fn send_udp_message(&mut self, data: &[u8], target_host: &str, target_port: u16) -> NetworkResult<usize> {
        // Delegate to connection manager
        self.connection_manager.send_udp_message(data, target_host, target_port).await
    }

    /// Get connection manager reference for protocol-specific operations
    pub fn get_connection_manager(&self) -> &ConnectionManager {
        &self.connection_manager
    }

    /// Check if the session is connected
    #[allow(dead_code)]
    pub fn is_connected(&self) -> bool {
        matches!(self.state.get_status(), ConnectionStatus::Connected)
    }

    /// Get current connection status
    #[allow(dead_code)]
    pub fn get_connection_status(&self) -> ConnectionStatus {
        self.state.get_status()
    }

    /// Get the current connection status
    #[allow(dead_code)]
    pub fn get_status(&self) -> ConnectionStatus {
        self.state.get_status()
    }

    /// Get session statistics
    #[allow(dead_code)]
    pub fn get_statistics(&self) -> SessionStatistics {
        SessionStatistics {
            bytes_sent: self.buffer.bytes_sent(),
            bytes_received: self.buffer.bytes_received(),
            messages_sent: self.buffer.messages_sent(),
            messages_received: self.buffer.messages_received(),
            connection_time: self.state.connection_time(),
            last_activity: self.state.last_activity(),
        }
    }
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct SessionStatistics {
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub messages_sent: u64,
    pub messages_received: u64,
    pub connection_time: Option<std::time::Duration>,
    pub last_activity: Option<std::time::Instant>,
}
