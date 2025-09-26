use crate::network::{Connection, ServerConnection};
use crate::network::tcp::TcpServer;
use crate::network::websocket::WebSocketServer;
use crate::network::udp::{UdpClient, UdpServer};
use crate::types::{NetworkResult, NetworkError, ConnectionStatus};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{RwLock, mpsc};
use tokio::time::{timeout, sleep};

/// Connection manager that handles timeout, retry logic, and cleanup
#[derive(Debug, Clone)]
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
        // Use shorter default timeout for better user experience
        let default_timeout = 10000; // 10 seconds instead of 30
        let timeout_duration = Duration::from_millis(timeout_ms.unwrap_or(default_timeout));

        eprintln!("ConnectionManager: Creating new manager for session {} with timeout {}ms",
            session_id, timeout_duration.as_millis());

        Self {
            connection: Arc::new(RwLock::new(None)),
            session_id,
            timeout_duration,
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
                let error_msg = format!("Connection cancelled for session {}", self.session_id);
                eprintln!("ConnectionManager: {}", error_msg);
                let _ = status_callback.send(ConnectionStatus::Error(error_msg.clone())).await;
                return Err(NetworkError::ConnectionFailed(error_msg));
            }

            *self.current_attempt.write().await = attempt;

            // Update status with session context
            let status = if attempt == 0 {
                ConnectionStatus::Connecting
            } else {
                ConnectionStatus::Reconnecting(attempt)
            };
            eprintln!("ConnectionManager: Session {} - Attempt {} - Status: {:?}",
                self.session_id, attempt + 1, status);
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

                            // Immediately set app handle if available (this will be set by session manager)
                            // Note: The app handle will be set by the session manager after this method returns

                            let _ = status_callback.send(ConnectionStatus::Connected).await;
                            return Ok(());
                        }
                        Ok(Err(e)) => {
                            eprintln!("ConnectionManager: Session {} - Connection establishment failed on attempt {}: {}",
                                self.session_id, attempt + 1, e);

                            // Check if this is a permanent error that shouldn't be retried
                            if e.is_permanent() {
                                eprintln!("ConnectionManager: Session {} - Permanent error detected, stopping retries",
                                    self.session_id);
                                let _ = status_callback.send(ConnectionStatus::Error(e.to_string())).await;
                                return Err(e);
                            }

                            if attempt == self.max_retries {
                                let error_msg = format!("Session {} - Connection failed after {} attempts: {}",
                                    self.session_id, self.max_retries + 1, e);
                                eprintln!("ConnectionManager: {}", error_msg);
                                let _ = status_callback.send(ConnectionStatus::Error(error_msg.clone())).await;
                                return Err(NetworkError::ConnectionFailed(error_msg));
                            }
                        }
                        Err(_) => {
                            let timeout_msg = format!("Session {} - Connection establishment timed out on attempt {} ({}ms timeout)",
                                self.session_id, attempt + 1, self.timeout_duration.as_millis());
                            eprintln!("ConnectionManager: {}", timeout_msg);

                            if attempt == self.max_retries {
                                let _ = status_callback.send(ConnectionStatus::TimedOut).await;
                                return Err(NetworkError::ConnectionFailed(timeout_msg));
                            }
                        }
                    }
                }
                Ok(Err(e)) => {
                    eprintln!("ConnectionManager: Session {} - Connection creation failed on attempt {}: {}",
                        self.session_id, attempt + 1, e);

                    // Check if this is a permanent error that shouldn't be retried
                    if e.is_permanent() {
                        eprintln!("ConnectionManager: Session {} - Permanent error detected, stopping retries",
                            self.session_id);
                        let _ = status_callback.send(ConnectionStatus::Error(e.to_string())).await;
                        return Err(e);
                    }

                    if attempt == self.max_retries {
                        let error_msg = format!("Session {} - Connection creation failed after {} attempts: {}",
                            self.session_id, self.max_retries + 1, e);
                        eprintln!("ConnectionManager: {}", error_msg);
                        let _ = status_callback.send(ConnectionStatus::Error(error_msg.clone())).await;
                        return Err(e);
                    }
                }
                Err(_) => {
                    let timeout_msg = format!("Session {} - Connection creation timed out on attempt {} ({}ms timeout)",
                        self.session_id, attempt + 1, self.timeout_duration.as_millis());
                    eprintln!("ConnectionManager: {}", timeout_msg);

                    if attempt == self.max_retries {
                        let _ = status_callback.send(ConnectionStatus::TimedOut).await;
                        return Err(NetworkError::ConnectionFailed(timeout_msg));
                    }
                }
            }

            // Wait before retry with exponential backoff
            if attempt < self.max_retries {
                let delay = self.base_retry_delay * 2_u32.pow(attempt);
                let max_delay = Duration::from_secs(30); // Cap at 30 seconds
                let actual_delay = std::cmp::min(delay, max_delay);

                eprintln!("ConnectionManager: Session {} - Retrying connection in {:?} (attempt {}/{})",
                    self.session_id, actual_delay, attempt + 2, self.max_retries + 1);

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

    /// Pause auto-reconnect for a TCP client session
    pub async fn pause_auto_reconnect(&self) -> NetworkResult<()> {
        eprintln!("ConnectionManager: Attempting to pause auto-reconnect for session {}", self.session_id);

        // Get the connection and call the pause_auto_reconnect method
        let connection_guard = self.connection.read().await;
        if let Some(connection) = connection_guard.as_ref() {
            eprintln!("ConnectionManager: Connection found for session {}, calling pause_auto_reconnect", self.session_id);
            connection.pause_auto_reconnect()?;
            eprintln!("ConnectionManager: Auto-reconnect paused successfully for session {}", self.session_id);
            Ok(())
        } else {
            eprintln!("ConnectionManager: No connection found for session {}", self.session_id);
            Err(NetworkError::SessionNotFound(format!("No connection found for session {}", self.session_id)))
        }
    }

    /// Resume auto-reconnect for a TCP client session
    pub async fn resume_auto_reconnect(&self) -> NetworkResult<()> {
        eprintln!("ConnectionManager: Attempting to resume auto-reconnect for session {}", self.session_id);

        // Get the connection and call the resume_auto_reconnect method
        let connection_guard = self.connection.read().await;
        if let Some(connection) = connection_guard.as_ref() {
            eprintln!("ConnectionManager: Connection found for session {}, calling resume_auto_reconnect", self.session_id);
            connection.resume_auto_reconnect()?;
            eprintln!("ConnectionManager: Auto-reconnect resumed successfully for session {}", self.session_id);
            Ok(())
        } else {
            eprintln!("ConnectionManager: No connection found for session {}", self.session_id);
            Err(NetworkError::SessionNotFound(format!("No connection found for session {}", self.session_id)))
        }
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

    /// Send data through the connection
    pub async fn send(&self, data: &[u8]) -> NetworkResult<usize> {
        let mut connection_guard = self.connection.write().await;
        if let Some(connection) = connection_guard.as_mut() {
            connection.send(data).await
        } else {
            Err(crate::types::NetworkError::ConnectionFailed("No active connection".to_string()))
        }
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

    /// Send data to a specific client (server mode)
    pub async fn send_to_client(&self, client_id: &str, data: &[u8]) -> NetworkResult<usize> {
        eprintln!("ConnectionManager: Attempting to send {} bytes to client {} for session {}", data.len(), client_id, self.session_id);

        if let Some(connection) = self.connection.write().await.as_mut() {
            eprintln!("ConnectionManager: Found connection for session {}, attempting downcast", self.session_id);
            // Try to downcast to ServerConnection
            if let Some(server_connection) = connection.as_any_mut().downcast_mut::<TcpServer>() {
                eprintln!("ConnectionManager: Successfully downcast to TcpServer for session {}", self.session_id);
                match server_connection.send_to_client(client_id, data).await {
                    Ok(bytes_sent) => {
                        eprintln!("ConnectionManager: TcpServer sent {} bytes to client {} for session {}", bytes_sent, client_id, self.session_id);
                        Ok(bytes_sent)
                    }
                    Err(e) => {
                        eprintln!("ConnectionManager: TcpServer failed to send to client {} for session {}: {}", client_id, self.session_id, e);
                        Err(e)
                    }
                }
            } else if let Some(server_connection) = connection.as_any_mut().downcast_mut::<WebSocketServer>() {
                eprintln!("ConnectionManager: Successfully downcast to WebSocketServer for session {}", self.session_id);
                server_connection.send_to_client(client_id, data).await
            } else if let Some(server_connection) = connection.as_any_mut().downcast_mut::<UdpServer>() {
                eprintln!("ConnectionManager: Successfully downcast to UdpServer for session {}", self.session_id);
                server_connection.send_to_client(client_id, data).await
            } else {
                let error_msg = "Connection does not support server operations".to_string();
                eprintln!("ConnectionManager: {}", error_msg);
                Err(crate::types::NetworkError::ConnectionFailed(error_msg))
            }
        } else {
            let error_msg = "No active connection".to_string();
            eprintln!("ConnectionManager: {}", error_msg);
            Err(crate::types::NetworkError::ConnectionFailed(error_msg))
        }
    }

    /// Broadcast data to all clients (server mode)
    pub async fn broadcast(&self, data: &[u8]) -> NetworkResult<usize> {
        if let Some(connection) = self.connection.write().await.as_mut() {
            // Try to downcast to ServerConnection
            if let Some(server_connection) = connection.as_any_mut().downcast_mut::<TcpServer>() {
                server_connection.broadcast(data).await
            } else if let Some(server_connection) = connection.as_any_mut().downcast_mut::<WebSocketServer>() {
                server_connection.broadcast(data).await
            } else if let Some(server_connection) = connection.as_any_mut().downcast_mut::<UdpServer>() {
                server_connection.broadcast(data).await
            } else {
                Err(crate::types::NetworkError::ConnectionFailed("Connection does not support server operations".to_string()))
            }
        } else {
            Err(crate::types::NetworkError::ConnectionFailed("No active connection".to_string()))
        }
    }

    /// Send UDP message to specific address
    pub async fn send_udp_message(&self, data: &[u8], target_host: &str, target_port: u16) -> NetworkResult<usize> {
        eprintln!("🚀 ConnectionManager: Attempting to send UDP message to {}:{} for session {}", target_host, target_port, self.session_id);

        if let Some(connection) = self.connection.write().await.as_mut() {
            eprintln!("🔧 ConnectionManager: Found connection for session {}, attempting UDP downcast", self.session_id);

            // Try to downcast to UdpClient first
            if let Some(udp_connection) = connection.as_any_mut().downcast_mut::<UdpClient>() {
                eprintln!("📤 ConnectionManager: Successfully downcast to UdpClient for session {}", self.session_id);
                // For UDP client, use send() method instead of send_to() to maintain socket consistency
                // UDP client already has the target address set during connection
                match udp_connection.send(data).await {
                    Ok(bytes_sent) => {
                        eprintln!("✅ ConnectionManager: UdpClient sent {} bytes to {}:{} for session {}", bytes_sent, target_host, target_port, self.session_id);
                        Ok(bytes_sent)
                    }
                    Err(e) => {
                        eprintln!("❌ ConnectionManager: UdpClient failed to send to {}:{} for session {}: {}", target_host, target_port, self.session_id, e);
                        Err(e)
                    }
                }
            }
            // Try to downcast to UdpServer and use ServerConnection trait
            else if let Some(udp_server) = connection.as_any_mut().downcast_mut::<UdpServer>() {
                eprintln!("🏠 ConnectionManager: Successfully downcast to UdpServer for session {}", self.session_id);

                // For UDP server, we need to use send_to_client method with the target address as client_id
                let client_id = format!("{}:{}", target_host, target_port);
                eprintln!("🎯 ConnectionManager: UdpServer sending to client_id: {}", client_id);

                match udp_server.send_to_client(&client_id, data).await {
                    Ok(bytes_sent) => {
                        eprintln!("✅ ConnectionManager: UdpServer sent {} bytes to client {} for session {}", bytes_sent, client_id, self.session_id);
                        Ok(bytes_sent)
                    }
                    Err(e) => {
                        eprintln!("❌ ConnectionManager: UdpServer failed to send to client {} for session {}: {}", client_id, self.session_id, e);
                        Err(e)
                    }
                }
            } else {
                let error_msg = "Connection does not support UDP operations".to_string();
                eprintln!("❌ ConnectionManager: {}", error_msg);
                Err(crate::types::NetworkError::ConnectionFailed(error_msg))
            }
        } else {
            let error_msg = "No active connection".to_string();
            eprintln!("❌ ConnectionManager: {}", error_msg);
            Err(crate::types::NetworkError::ConnectionFailed(error_msg))
        }
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

    /// Set the app handle for event emission on the current connection
    pub async fn set_app_handle(&self, app_handle: tauri::AppHandle) {
        if let Some(ref mut connection) = *self.connection.write().await {
            // Check if this is a TCP server and set the app handle
            if let Some(tcp_server) = connection.as_any_mut().downcast_mut::<TcpServer>() {
                eprintln!("ConnectionManager: Setting app handle on TCP server for session {}", self.session_id);
                tcp_server.set_app_handle(app_handle.clone()).await;
            }
            // Add UDP server support
            else if let Some(udp_server) = connection.as_any_mut().downcast_mut::<UdpServer>() {
                eprintln!("ConnectionManager: Setting app handle on UDP server for session {}", self.session_id);
                udp_server.set_app_handle(app_handle.clone()).await;
            }
            // Add UDP client support
            else if let Some(udp_client) = connection.as_any_mut().downcast_mut::<UdpClient>() {
                eprintln!("ConnectionManager: Setting app handle on UDP client for session {}", self.session_id);
                udp_client.set_app_handle(app_handle.clone()).await;
            }
            // Add WebSocket server support
            else if let Some(_ws_server) = connection.as_any_mut().downcast_mut::<WebSocketServer>() {
                eprintln!("ConnectionManager: Setting app handle on WebSocket server for session {}", self.session_id);
                // WebSocket server doesn't have set_app_handle method yet, but we can add it later
            }
        } else {
            eprintln!("ConnectionManager: Warning - No connection available to set app handle for session {}", self.session_id);
        }
    }
}
