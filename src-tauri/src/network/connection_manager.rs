use crate::network::{Connection, ServerConnection};
use crate::network::tcp::TcpServer;
use crate::network::websocket::WebSocketServer;
use crate::types::{NetworkResult, NetworkError, ConnectionStatus};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{RwLock, mpsc};
use tokio::time::{timeout, sleep};

/// Connection manager that handles timeout, retry logic, and cleanup
#[derive(Debug)]
pub struct ConnectionManager {
    connection: Arc<RwLock<Option<Box<dyn Connection>>>>,
    #[allow(dead_code)]
    session_id: String,
    timeout_duration: Duration,
    max_retries: u32,
    base_retry_delay: Duration,
    current_attempt: Arc<RwLock<u32>>,
    is_connecting: Arc<RwLock<bool>>,
    should_cancel: Arc<RwLock<bool>>,
}

impl ConnectionManager {
    pub fn new(
        session_id: String,
        timeout_ms: Option<u64>,
        max_retries: Option<u32>,
        retry_delay_ms: Option<u64>,
    ) -> Self {
        Self {
            connection: Arc::new(RwLock::new(None)),
            session_id,
            timeout_duration: Duration::from_millis(timeout_ms.unwrap_or(30000)), // Default 30s
            max_retries: max_retries.unwrap_or(3),
            base_retry_delay: Duration::from_millis(retry_delay_ms.unwrap_or(1000)), // Default 1s
            current_attempt: Arc::new(RwLock::new(0)),
            is_connecting: Arc::new(RwLock::new(false)),
            should_cancel: Arc::new(RwLock::new(false)),
        }
    }

    /// Connect with timeout and retry logic
    pub async fn connect_with_retry<F, Fut>(
        &self,
        connection_factory: F,
        status_callback: mpsc::Sender<ConnectionStatus>,
    ) -> NetworkResult<()>
    where
        F: FnMut() -> Fut + Send,
        Fut: std::future::Future<Output = NetworkResult<Box<dyn Connection>>> + Send,
    {
        eprintln!("ConnectionManager: Starting connection attempt for session {}", self.session_id);

        // Check if already connecting
        {
            let is_connecting = self.is_connecting.read().await;
            if *is_connecting {
                let error_msg = "Connection already in progress".to_string();
                eprintln!("ConnectionManager: {}", error_msg);
                let _ = status_callback.send(ConnectionStatus::Error(error_msg.clone())).await;
                return Err(NetworkError::ConnectionFailed(error_msg));
            }
        }

        // Set connecting state
        *self.is_connecting.write().await = true;
        *self.current_attempt.write().await = 0;

        // Reset cancellation flag
        *self.should_cancel.write().await = false;

        // Add a global timeout safeguard - maximum time for all retries
        let global_timeout = Duration::from_secs(300); // 5 minutes total
        let result = timeout(
            global_timeout,
            self.attempt_connection_with_retries(connection_factory, status_callback.clone())
        ).await;

        let final_result = match result {
            Ok(connection_result) => connection_result,
            Err(_) => {
                let error_msg = format!("Global connection timeout after {:?} for session {}", global_timeout, self.session_id);
                eprintln!("ConnectionManager: {}", error_msg);
                let _ = status_callback.send(ConnectionStatus::TimedOut).await;
                Err(NetworkError::ConnectionFailed(error_msg))
            }
        };

        // Reset connecting state and ensure final status is sent
        *self.is_connecting.write().await = false;

        // Ensure we always send a final status update
        match &final_result {
            Ok(_) => {
                eprintln!("ConnectionManager: Connection successful for session {}", self.session_id);
                let _ = status_callback.send(ConnectionStatus::Connected).await;
            }
            Err(e) => {
                eprintln!("ConnectionManager: Connection failed for session {}: {}", self.session_id, e);
                let _ = status_callback.send(ConnectionStatus::Error(e.to_string())).await;
            }
        }

        final_result
    }

    async fn attempt_connection_with_retries<F, Fut>(
        &self,
        mut connection_factory: F,
        status_callback: mpsc::Sender<ConnectionStatus>,
    ) -> NetworkResult<()>
    where
        F: FnMut() -> Fut + Send,
        Fut: std::future::Future<Output = NetworkResult<Box<dyn Connection>>> + Send,
    {
        for attempt in 0..=self.max_retries {
            // Check for cancellation
            if *self.should_cancel.read().await {
                let error_msg = "Connection cancelled".to_string();
                eprintln!("ConnectionManager: {}", error_msg);
                let _ = status_callback.send(ConnectionStatus::Error(error_msg.clone())).await;
                return Err(NetworkError::ConnectionFailed(error_msg));
            }

            *self.current_attempt.write().await = attempt;

            // Update status
            let status = if attempt == 0 {
                ConnectionStatus::Connecting
            } else {
                ConnectionStatus::Reconnecting(attempt)
            };
            eprintln!("ConnectionManager: Attempt {} - Status: {:?}", attempt + 1, status);
            let _ = status_callback.send(status).await;

            // Attempt connection with timeout
            let connection_result = timeout(
                self.timeout_duration,
                connection_factory()
            ).await;

            match connection_result {
                Ok(Ok(mut connection)) => {
                    // Connection successful, now try to establish it
                    match timeout(self.timeout_duration, connection.connect()).await {
                        Ok(Ok(_)) => {
                            // Success! Store the connection
                            *self.connection.write().await = Some(connection);
                            let _ = status_callback.send(ConnectionStatus::Connected).await;
                            return Ok(());
                        }
                        Ok(Err(e)) => {
                            eprintln!("Connection establishment failed on attempt {}: {}", attempt + 1, e);

                            // Check if this is a permanent error that shouldn't be retried
                            if e.is_permanent() {
                                eprintln!("ConnectionManager: Permanent error detected, stopping retries");
                                let _ = status_callback.send(ConnectionStatus::Error(e.to_string())).await;
                                return Err(e);
                            }

                            if attempt == self.max_retries {
                                let _ = status_callback.send(ConnectionStatus::Error(e.to_string())).await;
                                return Err(e);
                            }
                        }
                        Err(_) => {
                            eprintln!("Connection establishment timed out on attempt {}", attempt + 1);
                            if attempt == self.max_retries {
                                let _ = status_callback.send(ConnectionStatus::TimedOut).await;
                                return Err(NetworkError::ConnectionFailed("Connection timed out".to_string()));
                            }
                        }
                    }
                }
                Ok(Err(e)) => {
                    eprintln!("Connection creation failed on attempt {}: {}", attempt + 1, e);

                    // Check if this is a permanent error that shouldn't be retried
                    if e.is_permanent() {
                        eprintln!("ConnectionManager: Permanent error detected, stopping retries");
                        let _ = status_callback.send(ConnectionStatus::Error(e.to_string())).await;
                        return Err(e);
                    }

                    if attempt == self.max_retries {
                        let _ = status_callback.send(ConnectionStatus::Error(e.to_string())).await;
                        return Err(e);
                    }
                }
                Err(_) => {
                    eprintln!("Connection creation timed out on attempt {}", attempt + 1);
                    if attempt == self.max_retries {
                        let _ = status_callback.send(ConnectionStatus::TimedOut).await;
                        return Err(NetworkError::ConnectionFailed("Connection timed out".to_string()));
                    }
                }
            }

            // Wait before retry with exponential backoff
            if attempt < self.max_retries {
                let delay = self.base_retry_delay * 2_u32.pow(attempt);
                let max_delay = Duration::from_secs(30); // Cap at 30 seconds
                let actual_delay = std::cmp::min(delay, max_delay);

                eprintln!("ConnectionManager: Retrying connection in {:?} (attempt {}/{})",
                    actual_delay, attempt + 2, self.max_retries + 1);

                // Sleep with periodic cancellation checks
                let sleep_duration = Duration::from_millis(100); // Check every 100ms
                let mut remaining = actual_delay;
                let start_time = std::time::Instant::now();

                while remaining > Duration::ZERO {
                    if *self.should_cancel.read().await {
                        let error_msg = "Connection cancelled during retry".to_string();
                        eprintln!("ConnectionManager: {}", error_msg);
                        let _ = status_callback.send(ConnectionStatus::Error(error_msg.clone())).await;
                        return Err(NetworkError::ConnectionFailed(error_msg));
                    }

                    let sleep_time = std::cmp::min(remaining, sleep_duration);
                    sleep(sleep_time).await;
                    remaining = remaining.saturating_sub(sleep_time);
                }

                eprintln!("ConnectionManager: Retry delay completed after {:?}", start_time.elapsed());
            }
        }

        // All retries exhausted - send final error status
        let final_error = format!("Failed to connect after {} attempts", self.max_retries + 1);
        eprintln!("ConnectionManager: {}", final_error);
        let _ = status_callback.send(ConnectionStatus::Error(final_error.clone())).await;
        Err(NetworkError::ConnectionFailed(final_error))
    }

    /// Cancel ongoing connection attempt
    pub async fn cancel_connection(&self) {
        *self.should_cancel.write().await = true;
    }

    /// Disconnect and cleanup
    pub async fn disconnect(&self) -> NetworkResult<()> {
        // Cancel any ongoing connection attempts
        self.cancel_connection().await;

        // Disconnect existing connection
        if let Some(mut connection) = self.connection.write().await.take() {
            connection.disconnect().await?;
        }

        *self.is_connecting.write().await = false;
        *self.current_attempt.write().await = 0;

        Ok(())
    }

    /// Disconnect a specific client from a server connection
    pub async fn disconnect_client(&self, client_id: &str) -> NetworkResult<()> {
        if let Some(connection) = self.connection.write().await.as_mut() {
            // Try to downcast to ServerConnection
            if let Some(server_connection) = connection.as_any_mut().downcast_mut::<TcpServer>() {
                server_connection.disconnect_client(client_id).await?;
            } else if let Some(server_connection) = connection.as_any_mut().downcast_mut::<WebSocketServer>() {
                server_connection.disconnect_client(client_id).await?;
            } else {
                return Err(crate::types::NetworkError::ConnectionFailed("Connection does not support client disconnection".to_string()));
            }
        }
        Ok(())
    }

    /// Execute an async operation with the connection
    #[allow(dead_code)]
    pub async fn with_connection_async<F, Fut, R>(&self, f: F) -> NetworkResult<R>
    where
        F: FnOnce(&mut Box<dyn Connection>) -> Fut,
        Fut: std::future::Future<Output = NetworkResult<R>>,
    {
        let mut connection_guard = self.connection.write().await;
        if let Some(ref mut connection) = *connection_guard {
            f(connection).await
        } else {
            Err(NetworkError::ConnectionFailed("No active connection".to_string()))
        }
    }

    /// Check if there's an active connection
    #[allow(dead_code)]
    pub async fn has_connection(&self) -> bool {
        self.connection.read().await.is_some()
    }

    /// Check if the connection is active
    #[allow(dead_code)]
    pub async fn is_connection_active(&self) -> bool {
        if let Some(ref connection) = *self.connection.read().await {
            connection.is_connected()
        } else {
            false
        }
    }

    /// Check if currently connecting
    pub async fn is_connecting(&self) -> bool {
        *self.is_connecting.read().await
    }

    /// Get current attempt number
    #[allow(dead_code)]
    pub async fn current_attempt(&self) -> u32 {
        *self.current_attempt.read().await
    }

    /// Get the actual port from the current connection (for configuration checks)
    pub async fn get_actual_port(&self) -> Option<u16> {
        if let Some(ref connection) = *self.connection.read().await {
            connection.get_actual_port()
        } else {
            None
        }
    }
}
