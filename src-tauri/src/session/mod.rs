use crate::network::{Connection, ConnectionFactory};
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
    pub buffer: SessionBuffer,
    connection: Option<Box<dyn Connection>>,
    event_sender: Option<mpsc::Sender<NetworkEvent>>,
}

impl Session {
    pub fn new(id: String, config: SessionConfig) -> Self {
        Self {
            id: id.clone(),
            config,
            state: SessionState::new(id.clone()),
            buffer: SessionBuffer::new(),
            connection: None,
            event_sender: None,
        }
    }

    /// Connect the session using the configured protocol
    pub async fn connect(&mut self) -> NetworkResult<()> {
        if self.connection.is_some() && self.is_connected() {
            return Ok(());
        }

        // Create connection based on protocol
        let mut connection = ConnectionFactory::create_connection(
            self.id.clone(),
            &self.config.protocol,
            &self.config.connection_type,
            serde_json::to_value(&self.config)?,
        )?;

        // Update state to connecting
        self.state.set_status(ConnectionStatus::Connecting);

        // Attempt connection
        match connection.connect().await {
            Ok(_) => {
                self.state.set_status(ConnectionStatus::Connected);
                
                // Start receiving data
                let _event_receiver = connection.start_receiving().await?;
                
                // Store connection
                self.connection = Some(connection);
                
                // TODO: Start background task to handle incoming events
                // and forward them to the frontend
                
                Ok(())
            }
            Err(e) => {
                self.state.set_status(ConnectionStatus::Error(e.to_string()));
                Err(e)
            }
        }
    }

    /// Disconnect the session
    pub async fn disconnect(&mut self) -> NetworkResult<()> {
        if let Some(mut connection) = self.connection.take() {
            connection.disconnect().await?;
        }
        
        self.state.set_status(ConnectionStatus::Disconnected);
        self.event_sender = None;
        
        Ok(())
    }

    /// Send data through the connection
    pub async fn send(&mut self, data: &[u8]) -> NetworkResult<usize> {
        match &mut self.connection {
            Some(connection) => {
                let bytes_sent = connection.send(data).await?;
                
                // Add to buffer for tracking
                self.buffer.add_outgoing(data.to_vec());
                
                Ok(bytes_sent)
            }
            None => Err(NetworkError::ConnectionFailed("No active connection".to_string())),
        }
    }

    /// Check if the session is connected
    pub fn is_connected(&self) -> bool {
        match &self.connection {
            Some(connection) => connection.is_connected(),
            None => false,
        }
    }

    /// Get the current connection status
    pub fn get_status(&self) -> ConnectionStatus {
        self.state.get_status()
    }

    /// Get session statistics
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
pub struct SessionStatistics {
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub messages_sent: u64,
    pub messages_received: u64,
    pub connection_time: Option<std::time::Duration>,
    pub last_activity: Option<std::time::Instant>,
}
