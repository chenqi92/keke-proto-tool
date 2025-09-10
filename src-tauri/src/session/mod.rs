use crate::network::{ConnectionFactory, ConnectionManager};
use crate::types::{SessionConfig, ConnectionStatus, NetworkResult, NetworkError, NetworkEvent};
use tokio::sync::mpsc;

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

        // Create connection factory closure
        let connection_factory = move || {
            let session_id = session_id.clone();
            let protocol = protocol.clone();
            let connection_type = connection_type.clone();
            let config_value = config_value.clone();

            async move {
                ConnectionFactory::create_connection(
                    session_id,
                    &protocol,
                    &connection_type,
                    config_value,
                )
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

    /// Send data through the connection
    pub async fn send(&mut self, _data: &[u8]) -> NetworkResult<usize> {
        // For now, return an error indicating the connection needs to be redesigned
        // This is a temporary fix to get compilation working
        Err(NetworkError::ConnectionFailed("Send functionality temporarily disabled during refactoring".to_string()))
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
