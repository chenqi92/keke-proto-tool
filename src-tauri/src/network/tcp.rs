use async_trait::async_trait;
use crate::network::{Connection, ServerConnection};
use crate::types::{NetworkResult, NetworkError, NetworkEvent};
use crate::utils::{parse_socket_addr, validate_port, is_common_port};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio::io::{AsyncReadExt, AsyncWriteExt, ReadHalf, WriteHalf};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::{AppHandle, Emitter};

/// TCP Client implementation
#[derive(Debug)]
pub struct TcpClient {
    session_id: String,
    host: String,
    port: u16,
    timeout: Option<u64>,
    write_half: Option<Arc<RwLock<WriteHalf<TcpStream>>>>,
    connected: bool,
    validate_internal_server: bool, // 是否验证内部服务端
    app_handle: Option<AppHandle>,
}

impl TcpClient {
    pub fn new(session_id: String, config: serde_json::Value, app_handle: Option<AppHandle>) -> NetworkResult<Self> {
        let host = config.get("host")
            .and_then(|v| v.as_str())
            .unwrap_or("127.0.0.1")
            .to_string();

        let port = config.get("port")
            .and_then(|v| v.as_u64())
            .unwrap_or(8080) as u16;

        let timeout = config.get("timeout")
            .and_then(|v| v.as_u64());

        // 默认启用内部服务端验证，可通过配置禁用
        let validate_internal_server = config.get("validateInternalServer")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);

        Ok(Self {
            session_id,
            host,
            port,
            timeout,
            write_half: None,
            connected: false,
            validate_internal_server,
            app_handle,
        })
    }

    async fn start_receiving_with_read_half(&mut self, read_half: ReadHalf<TcpStream>) -> NetworkResult<()> {
        let session_id = self.session_id.clone();
        let app_handle = self.app_handle.clone();
        let mut read_stream = read_half;

        // Spawn background task to read from stream
        tokio::spawn(async move {
            let mut buffer = [0u8; 8192];

            loop {
                match read_stream.read(&mut buffer).await {
                    Ok(0) => {
                        // Connection closed
                        eprintln!("TCPClient: Session {} - Connection closed by server", session_id);
                        break;
                    }
                    Ok(n) => {
                        // Data received from server
                        eprintln!("TCPClient: Session {} - Received {} bytes from server", session_id, n);

                        // Emit message-received event for server-to-client data transmission
                        if let Some(app_handle) = &app_handle {
                            let payload = serde_json::json!({
                                "sessionId": session_id,
                                "data": buffer[..n].to_vec(),
                                "direction": "in"
                            });

                            if let Err(e) = app_handle.emit("message-received", payload) {
                                eprintln!("TCPClient: Failed to emit message-received event for server-to-client transmission: {}", e);
                            } else {
                                eprintln!("TCPClient: Successfully emitted message-received event for {} bytes received from server", n);
                            }
                        }
                    }
                    Err(e) => {
                        // Error occurred
                        eprintln!("TCPClient: Session {} - Error reading from server: {}", session_id, e);
                        break;
                    }
                }
            }
        });

        Ok(())
    }
}

#[async_trait]
impl Connection for TcpClient {
    async fn connect(&mut self) -> NetworkResult<()> {
        eprintln!("TCPClient: Attempting to connect to {}:{}", self.host, self.port);

        // 验证端口范围
        if self.port == 0 || self.port > 65535 {
            let error_msg = format!("Invalid port number: {}. Port must be between 1 and 65535", self.port);
            eprintln!("TCPClient: {}", error_msg);
            return Err(NetworkError::ConnectionFailed(error_msg));
        }

        // 验证内部服务端（如果启用）
        if self.validate_internal_server {
            // 注意：这里我们无法直接访问SessionManager，因为它在不同的层级
            // 实际的验证逻辑应该在连接建立之前在更高层级进行
            // 这里只是记录验证意图
            eprintln!("TCPClient: Internal server validation is enabled for {}:{}", self.host, self.port);
        }

        let addr = parse_socket_addr(&self.host, self.port)
            .map_err(|e| {
                let error_msg = format!("Invalid address {}:{} - {}", self.host, self.port, e);
                eprintln!("TCPClient: {}", error_msg);
                NetworkError::ConnectionFailed(error_msg)
            })?;

        let stream = if let Some(timeout_ms) = self.timeout {
            eprintln!("TCPClient: Session {} - Connecting with {}ms timeout to {}:{}",
                self.session_id, timeout_ms, self.host, self.port);
            tokio::time::timeout(
                std::time::Duration::from_millis(timeout_ms),
                TcpStream::connect(addr)
            ).await
            .map_err(|_| {
                let error_msg = format!("Session {} - Connection timeout after {}ms to {}:{}",
                    self.session_id, timeout_ms, self.host, self.port);
                eprintln!("TCPClient: {}", error_msg);
                NetworkError::ConnectionFailed(error_msg)
            })?
            .map_err(|e| {
                let error_msg = format!("Session {} - {}",
                    self.session_id, format_tcp_connection_error(&e, &self.host, self.port));
                eprintln!("TCPClient: {}", error_msg);
                NetworkError::ConnectionFailed(error_msg)
            })?
        } else {
            eprintln!("TCPClient: Session {} - Connecting without timeout to {}:{}",
                self.session_id, self.host, self.port);
            TcpStream::connect(addr).await
                .map_err(|e| {
                    let error_msg = format!("Session {} - {}",
                        self.session_id, format_tcp_connection_error(&e, &self.host, self.port));
                    eprintln!("TCPClient: {}", error_msg);
                    NetworkError::ConnectionFailed(error_msg)
                })?
        };

        eprintln!("TCPClient: Session {} - Successfully connected to {}:{}",
            self.session_id, self.host, self.port);

        // Split the stream into read and write halves to avoid conflicts
        let (read_half, write_half) = tokio::io::split(stream);
        self.write_half = Some(Arc::new(RwLock::new(write_half)));
        self.connected = true;

        // Start receiving data from server immediately after connection
        eprintln!("TCPClient: Session {} - Starting to receive data from server", self.session_id);
        self.start_receiving_with_read_half(read_half).await?;
        eprintln!("TCPClient: Session {} - Successfully started receiving data from server", self.session_id);

        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if let Some(write_half) = self.write_half.take() {
            drop(write_half); // Close the write half
        }
        self.connected = false;
        Ok(())
    }

    async fn send(&mut self, data: &[u8]) -> NetworkResult<usize> {
        match &self.write_half {
            Some(write_half_arc) => {
                eprintln!("TCPClient: Session {} - Sending {} bytes to server", self.session_id, data.len());

                let mut write_half = write_half_arc.write().await;
                write_half.write_all(data).await
                    .map_err(|e| NetworkError::SendFailed(e.to_string()))?;
                write_half.flush().await
                    .map_err(|e| NetworkError::SendFailed(e.to_string()))?;

                eprintln!("TCPClient: Session {} - Successfully sent {} bytes to server", self.session_id, data.len());

                // Emit message-received event for client-to-server data transmission
                if let Some(app_handle) = &self.app_handle {
                    let payload = serde_json::json!({
                        "sessionId": self.session_id,
                        "data": data.to_vec(),
                        "direction": "out"
                    });

                    if let Err(e) = app_handle.emit("message-received", payload) {
                        eprintln!("TCPClient: Failed to emit message-received event for client-to-server transmission: {}", e);
                    } else {
                        eprintln!("TCPClient: Successfully emitted message-received event for {} bytes sent to server", data.len());
                    }
                }

                Ok(data.len())
            }
            None => Err(NetworkError::SendFailed("Not connected".to_string())),
        }
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    fn status(&self) -> String {
        if self.connected {
            format!("Connected to {}:{}", self.host, self.port)
        } else {
            "Disconnected".to_string()
        }
    }

    fn get_actual_port(&self) -> Option<u16> {
        if self.connected {
            Some(self.port)
        } else {
            None
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        let (tx, rx) = mpsc::channel(1000);
        // This method is required by the trait but not used in the new implementation
        // The actual receiving is started in start_receiving_with_read_half
        Ok(rx)
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

/// TCP Server implementation
#[derive(Debug)]
pub struct TcpServer {
    session_id: String,
    host: String,
    port: u16,
    listener: Option<TcpListener>,
    clients: Arc<RwLock<HashMap<String, Arc<RwLock<WriteHalf<TcpStream>>>>>>,
    connected: bool,
    app_handle: Arc<RwLock<Option<AppHandle>>>,
}

impl TcpServer {
    pub fn new(session_id: String, config: serde_json::Value) -> NetworkResult<Self> {
        let host = config.get("host")
            .and_then(|v| v.as_str())
            .unwrap_or("0.0.0.0")
            .to_string();

        let port = config.get("port")
            .and_then(|v| v.as_u64())
            .unwrap_or(8080) as u16;

        Ok(Self {
            session_id,
            host,
            port,
            listener: None,
            clients: Arc::new(RwLock::new(HashMap::new())),
            connected: false,
            app_handle: Arc::new(RwLock::new(None)),
        })
    }

    /// Set the app handle for event emission
    pub async fn set_app_handle(&mut self, app_handle: AppHandle) {
        eprintln!("TcpServer: Setting app handle for session {}", self.session_id);
        *self.app_handle.write().await = Some(app_handle);
        eprintln!("TcpServer: App handle set successfully for session {}", self.session_id);
    }

    /// Emit an event to the frontend
    async fn emit_event(&self, event_type: &str, client_id: Option<String>, data: Option<Vec<u8>>, error: Option<String>) {
        if let Some(app_handle) = self.app_handle.read().await.as_ref() {
            let payload = match event_type {
                    "client-connected" => {
                        if let Some(client_id) = &client_id {
                            // Parse client_id to get address and port
                            let parts: Vec<&str> = client_id.split(':').collect();
                            if parts.len() == 2 {
                                serde_json::json!({
                                    "sessionId": self.session_id,
                                    "clientId": client_id,
                                    "remoteAddress": parts[0],
                                    "remotePort": parts[1].parse::<u16>().unwrap_or(0)
                                })
                            } else {
                                serde_json::json!({
                                    "sessionId": self.session_id,
                                    "clientId": client_id,
                                    "remoteAddress": "unknown",
                                    "remotePort": 0
                                })
                            }
                        } else {
                            return;
                        }
                    }
                    "client-disconnected" => {
                        if let Some(client_id) = &client_id {
                            serde_json::json!({
                                "sessionId": self.session_id,
                                "clientId": client_id
                            })
                        } else {
                            return;
                        }
                    }
                    "message-received" => {
                        if let (Some(data), Some(client_id)) = (&data, &client_id) {
                            serde_json::json!({
                                "sessionId": self.session_id,
                                "data": data,
                                "direction": "in",
                                "clientId": client_id
                            })
                        } else {
                            return;
                        }
                    }
                    _ => return,
                };

            if let Err(e) = app_handle.emit(event_type, payload) {
                eprintln!("TCPServer: Failed to emit {} event for session {}: {}", event_type, self.session_id, e);
            }
        }
    }

    /// Try to bind to the requested port, and if it fails due to address in use,
    /// try alternative ports automatically
    async fn try_bind_with_alternatives(&self) -> NetworkResult<(TcpListener, u16)> {
        let original_port = self.port;

        // First, try the requested port
        match self.try_bind_to_port(original_port).await {
            Ok(listener) => {
                return Ok((listener, original_port));
            }
            Err(e) => {
                // Check if it's a permanent error (permission denied, etc.)
                if e.is_permanent() {
                    eprintln!("TCPServer: Permanent error for port {}, not trying alternatives", original_port);
                    return Err(e);
                }

                // Check if it's an "address in use" error (retryable)
                if let NetworkError::ConnectionFailed(msg) = &e {
                    if msg.contains("Port already in use") {
                        eprintln!("TCPServer: Port {} is in use, trying alternative ports...", original_port);
                    } else {
                        // For other retryable errors, don't try alternatives
                        return Err(e);
                    }
                } else {
                    return Err(e);
                }
            }
        }

        // Generate alternative ports to try
        let alternative_ports = generate_alternative_ports(original_port);

        for &port in &alternative_ports {
            eprintln!("TCPServer: Trying alternative port {}", port);
            match self.try_bind_to_port(port).await {
                Ok(listener) => {
                    eprintln!("TCPServer: Successfully bound to alternative port {}", port);
                    return Ok((listener, port));
                }
                Err(e) => {
                    // If it's a permanent error, stop trying alternatives
                    if e.is_permanent() {
                        eprintln!("TCPServer: Permanent error on port {}, stopping alternatives", port);
                        return Err(e);
                    }

                    // For retryable errors, check if it's port conflict
                    if let NetworkError::ConnectionFailed(msg) = &e {
                        if msg.contains("Port already in use") {
                            eprintln!("TCPServer: Port {} also in use, continuing...", port);
                            continue;
                        } else {
                            // For other retryable errors, stop trying
                            eprintln!("TCPServer: Failed to bind to port {} with error: {}", port, msg);
                            break;
                        }
                    }
                }
            }
        }

        // If all alternatives failed, return the original error with suggestions
        let error_msg = format!(
            "Server startup failed: Unable to start TCP server on {}:{} - Port already in use. Tried alternative ports: {:?}. Please choose a different port or stop the service using these ports.",
            self.host, original_port, alternative_ports
        );
        Err(NetworkError::ConnectionFailed(error_msg))
    }

    /// Try to bind to a specific port
    async fn try_bind_to_port(&self, port: u16) -> NetworkResult<TcpListener> {
        let addr = parse_socket_addr(&self.host, port)
            .map_err(|e| {
                let error_msg = format!("Invalid server address {}:{} - {}", self.host, port, e);
                NetworkError::ConnectionFailedPermanent(error_msg)
            })?;

        TcpListener::bind(addr).await
            .map_err(|e| format_tcp_bind_error(&e, &self.host, port))
    }

    /// Start accepting client connections in the background
    async fn start_accepting_connections(&mut self) -> NetworkResult<()> {
        // Take the listener that was already created and bound in connect()
        let listener = self.listener.take()
            .ok_or_else(|| NetworkError::ConnectionFailed("No listener available".to_string()))?;

        let session_id = self.session_id.clone();
        let clients = self.clients.clone();
        let app_handle = self.app_handle.clone();

        eprintln!("TCPServer: Starting background task to accept connections");
        eprintln!("TCPServer: Current clients count before spawning task: {}", clients.read().await.len());

        // Use a channel to confirm the background task has started successfully
        let (startup_tx, startup_rx) = tokio::sync::oneshot::channel::<Result<(), String>>();

        // Spawn background task to accept connections
        eprintln!("TCPServer: About to spawn background task");
        eprintln!("TCPServer: Background task will use clients Arc address: {:p}", &*clients);
        let task_handle = tokio::spawn(async move {
            eprintln!("TCPServer: Background task started, now accepting connections");
            eprintln!("TCPServer: Background task using clients Arc address: {:p}", &*clients);

            // Verify listener is still working after being moved to the task
            match listener.local_addr() {
                Ok(addr) => {
                    eprintln!("TCPServer: Background task confirmed listener is bound to: {}", addr);
                }
                Err(e) => {
                    let error_msg = format!("Background task error - listener not bound: {}", e);
                    eprintln!("TCPServer: {}", error_msg);
                    // Signal startup failure before returning
                    let _ = startup_tx.send(Err(error_msg));
                    return;
                }
            }

            // Signal that the task has started successfully
            if let Err(_) = startup_tx.send(Ok(())) {
                eprintln!("TCPServer: Warning - startup confirmation channel closed");
            }

            eprintln!("TCPServer: Entering connection acceptance loop");

            // Double-check that the listener is still bound and working
            match listener.local_addr() {
                Ok(addr) => {
                    eprintln!("TCPServer: Confirmed listener is bound to: {} before entering accept loop", addr);
                }
                Err(e) => {
                    eprintln!("TCPServer: ERROR - Listener lost binding before accept loop: {}", e);
                    return;
                }
            }

            let mut accept_count = 0;
            loop {
                accept_count += 1;
                eprintln!("TCPServer: Waiting for incoming connections... (iteration {})", accept_count);

                // Verify listener is still valid before each accept
                match listener.local_addr() {
                    Ok(addr) => {
                        eprintln!("TCPServer: Listener still bound to: {}", addr);
                    }
                    Err(e) => {
                        eprintln!("TCPServer: ERROR - Listener lost binding during accept loop: {}", e);
                        break;
                    }
                }

                match listener.accept().await {
                    Ok((stream, addr)) => {
                        let client_id = format!("{}:{}", addr.ip(), addr.port());

                        eprintln!("TCPServer: Client {} connected from {}:{}",
                            client_id, addr.ip(), addr.port());

                        // Split the stream into read and write halves to avoid deadlock
                        let (read_half, write_half) = tokio::io::split(stream);
                        let write_half_arc = Arc::new(RwLock::new(write_half));

                        // Add client write half to the list FIRST before emitting events
                        {
                            let mut clients_write = clients.write().await;
                            eprintln!("TCPServer: [BACKGROUND TASK] Before adding client {}, current clients count: {}", client_id, clients_write.len());
                            eprintln!("TCPServer: [BACKGROUND TASK] Current clients: {:?}", clients_write.keys().collect::<Vec<_>>());
                            eprintln!("TCPServer: [BACKGROUND TASK] Clients Arc address: {:p}", &*clients);

                            match clients_write.insert(client_id.clone(), write_half_arc.clone()) {
                                Some(_) => eprintln!("TCPServer: [BACKGROUND TASK] Replaced existing client {}", client_id),
                                None => eprintln!("TCPServer: [BACKGROUND TASK] Added new client {}", client_id),
                            }

                            eprintln!("TCPServer: [BACKGROUND TASK] After adding client {}, current clients count: {}", client_id, clients_write.len());
                            eprintln!("TCPServer: [BACKGROUND TASK] Updated clients: {:?}", clients_write.keys().collect::<Vec<_>>());
                        }

                        // Spawn task to handle this client using the read half
                        let clients_clone = clients.clone();
                        let client_id_clone = client_id.clone();
                        let session_id_clone = session_id.clone();
                        let app_handle_clone = app_handle.clone();

                        tokio::spawn(async move {
                            eprintln!("TCPServer: Starting client handler for {}", client_id_clone);
                            let mut buffer = [0u8; 8192];
                            let mut read_half = read_half;

                            loop {
                                let read_result = read_half.read(&mut buffer).await;

                                match read_result {
                                    Ok(0) => {
                                        // Client disconnected
                                        eprintln!("TCPServer: [CLIENT HANDLER] Client {} disconnected", client_id_clone);
                                        eprintln!("TCPServer: [CLIENT HANDLER] Removing client {} from clients list", client_id_clone);
                                        eprintln!("TCPServer: [CLIENT HANDLER] Clients Arc address: {:p}", &*clients_clone);

                                        // Use a flag to prevent double removal
                                        let removed = clients_clone.write().await.remove(&client_id_clone);
                                        if removed.is_some() {
                                            eprintln!("TCPServer: [CLIENT HANDLER] Successfully removed client {}", client_id_clone);

                                            // Only emit disconnect event if we actually removed the client
                                            if let Some(app_handle_ref) = app_handle_clone.read().await.as_ref() {
                                                let payload = serde_json::json!({
                                                    "sessionId": session_id_clone,
                                                    "clientId": client_id_clone
                                                });

                                                if let Err(e) = app_handle_ref.emit("client-disconnected", payload) {
                                                    eprintln!("TCPServer: Failed to emit client-disconnected event: {}", e);
                                                } else {
                                                    eprintln!("TCPServer: Successfully emitted client-disconnected event for {}", client_id_clone);
                                                }
                                            }
                                        } else {
                                            eprintln!("TCPServer: [CLIENT HANDLER] Client {} was already removed", client_id_clone);
                                        }

                                        break;
                                    }
                                    Ok(n) => {
                                        // Data received from client
                                        eprintln!("TCPServer: Received {} bytes from client {}", n, client_id_clone);

                                        // Emit message-received event
                                        if let Some(app_handle_ref) = app_handle_clone.read().await.as_ref() {
                                            let payload = serde_json::json!({
                                                "sessionId": session_id_clone,
                                                "data": buffer[..n].to_vec(),
                                                "direction": "in",
                                                "clientId": client_id_clone
                                            });

                                            if let Err(e) = app_handle_ref.emit("message-received", payload) {
                                                eprintln!("TCPServer: Failed to emit message-received event: {}", e);
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        // Error occurred
                                        eprintln!("TCPServer: Error reading from client {}: {}", client_id_clone, e);

                                        // Use a flag to prevent double removal
                                        let removed = clients_clone.write().await.remove(&client_id_clone);
                                        if removed.is_some() {
                                            eprintln!("TCPServer: [CLIENT HANDLER] Successfully removed client {} due to read error", client_id_clone);

                                            // Only emit disconnect event if we actually removed the client
                                            if let Some(app_handle_ref) = app_handle_clone.read().await.as_ref() {
                                                let payload = serde_json::json!({
                                                    "sessionId": session_id_clone,
                                                    "clientId": client_id_clone
                                                });

                                                if let Err(e) = app_handle_ref.emit("client-disconnected", payload) {
                                                    eprintln!("TCPServer: Failed to emit client-disconnected event: {}", e);
                                                } else {
                                                    eprintln!("TCPServer: Successfully emitted client-disconnected event for {} due to read error", client_id_clone);
                                                }
                                            }
                                        } else {
                                            eprintln!("TCPServer: [CLIENT HANDLER] Client {} was already removed", client_id_clone);
                                        }

                                        break;
                                    }
                                }
                            }
                            eprintln!("TCPServer: Client handler for {} terminated", client_id_clone);
                        });

                        // Give a small delay to ensure all async operations are settled
                        tokio::time::sleep(std::time::Duration::from_millis(10)).await;

                        // NOW emit client-connected event after everything is set up
                        if let Some(app_handle_ref) = app_handle.read().await.as_ref() {
                            eprintln!("TCPServer: App handle available, emitting client-connected event for {}", client_id);
                            let parts: Vec<&str> = client_id.split(':').collect();
                            let payload = if parts.len() == 2 {
                                serde_json::json!({
                                    "sessionId": session_id,
                                    "clientId": client_id,
                                    "remoteAddress": parts[0],
                                    "remotePort": parts[1].parse::<u16>().unwrap_or(0)
                                })
                            } else {
                                serde_json::json!({
                                    "sessionId": session_id,
                                    "clientId": client_id,
                                    "remoteAddress": "unknown",
                                    "remotePort": 0
                                })
                            };

                            eprintln!("TCPServer: Emitting client-connected event with payload: {}", payload);
                            if let Err(e) = app_handle_ref.emit("client-connected", payload) {
                                eprintln!("TCPServer: Failed to emit client-connected event: {}", e);
                            } else {
                                eprintln!("TCPServer: Successfully emitted client-connected event for {}", client_id);
                            }
                        } else {
                            eprintln!("TCPServer: WARNING - App handle not available, cannot emit client-connected event for {}", client_id);
                        }
                    }
                    Err(e) => {
                        eprintln!("TCPServer: Error accepting connection: {}", e);
                        // Check if this is a fatal error
                        if e.kind() == std::io::ErrorKind::InvalidInput ||
                           e.kind() == std::io::ErrorKind::AddrNotAvailable {
                            eprintln!("TCPServer: Fatal error in accept loop, terminating: {}", e);
                            break;
                        }
                        // Continue accepting other connections for non-fatal errors
                        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                    }
                }
            }
            eprintln!("TCPServer: Accept loop terminated");
        });

        eprintln!("TCPServer: Background task spawned, waiting for startup confirmation");

        // Wait for the background task to confirm it has started
        match tokio::time::timeout(std::time::Duration::from_secs(5), startup_rx).await {
            Ok(Ok(Ok(()))) => {
                eprintln!("TCPServer: Background task confirmed to be running and accepting connections");
            }
            Ok(Ok(Err(error_msg))) => {
                eprintln!("TCPServer: Background task startup failed: {}", error_msg);
                return Err(NetworkError::ConnectionFailed(format!("Background task startup failed: {}", error_msg)));
            }
            Ok(Err(_)) => {
                eprintln!("TCPServer: Background task startup channel closed unexpectedly");
                return Err(NetworkError::ConnectionFailed("Background task startup channel closed".to_string()));
            }
            Err(_) => {
                eprintln!("TCPServer: Background task startup timeout");
                return Err(NetworkError::ConnectionFailed("Background task startup timeout".to_string()));
            }
        }

        // Give the task a moment to settle
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        // Double-check that the task is still running
        if task_handle.is_finished() {
            eprintln!("TCPServer: Background task terminated immediately after startup");
            return Err(NetworkError::ConnectionFailed("Background task terminated immediately after startup".to_string()));
        }

        eprintln!("TCPServer: Connection acceptance setup completed successfully");

        Ok(())
    }
}

#[async_trait]
impl Connection for TcpServer {
    async fn connect(&mut self) -> NetworkResult<()> {
        // Check if already connected
        if self.connected {
            eprintln!("TCPServer: Already connected to {}:{}", self.host, self.port);
            return Ok(());
        }

        eprintln!("TCPServer: Attempting to bind to {}:{}", self.host, self.port);

        // Validate port before attempting to bind
        if let Err(port_error) = validate_port(self.port) {
            eprintln!("TCPServer: Port validation failed - {}", port_error);
            return Err(NetworkError::ConnectionFailed(port_error));
        }

        // Check if it's a commonly used port
        if let Some(service) = is_common_port(self.port) {
            eprintln!("TCPServer: Warning - Port {} is commonly used by {} service", self.port, service);
        }

        // Try to bind to the requested port first, then try alternatives if it fails
        let (listener, actual_port) = self.try_bind_with_alternatives().await?;

        if actual_port != self.port {
            eprintln!("TCPServer: Original port {} was in use, successfully bound to alternative port {}", self.port, actual_port);
            // Update the port to the one we actually bound to
            self.port = actual_port;

            // TODO: Emit port update event to frontend
            // This would require access to the app handle, which we don't have here
            // The port update should be handled at a higher level (in session manager)
        } else {
            eprintln!("TCPServer: Successfully bound to requested port {}", self.port);
        }

        self.listener = Some(listener);
        self.connected = true;

        // Start accepting client connections immediately after binding
        eprintln!("TCPServer: Starting to accept client connections on {}:{}", self.host, self.port);
        self.start_accepting_connections().await?;

        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        // Note: The listener has been moved to the background task in start_accepting_connections()
        // We can't directly stop the background task, but we can mark as disconnected
        // and clear client connections

        // Close all client connections
        let mut clients = self.clients.write().await;
        clients.clear();

        self.connected = false;
        eprintln!("TCPServer: Disconnected from {}:{}", self.host, self.port);
        Ok(())
    }

    async fn send(&mut self, data: &[u8]) -> NetworkResult<usize> {
        // For server, send means broadcast to all clients
        self.broadcast(data).await
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    fn status(&self) -> String {
        if self.connected {
            format!("Listening on {}:{}", self.host, self.port)
        } else {
            "Not listening".to_string()
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        let (tx, rx) = mpsc::channel(1000);

        // Note: The listener has already been moved to the background task in start_accepting_connections()
        // This method now just returns a receiver for events that would be generated by the background task
        // For now, we'll return an empty receiver since the connection handling is done in start_accepting_connections()

        eprintln!("TCPServer: start_receiving called - connection handling already started in background");

        // TODO: In a future refactor, we should integrate the event system with the background connection handler
        // For now, just return the receiver

        Ok(rx)
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

#[async_trait]
impl ServerConnection for TcpServer {
    async fn send_to_client(&mut self, client_id: &str, data: &[u8]) -> NetworkResult<usize> {
        eprintln!("TCPServer: [SEND_TO_CLIENT] Attempting to send {} bytes to client {} in session {}", data.len(), client_id, self.session_id);
        eprintln!("TCPServer: [SEND_TO_CLIENT] TcpServer instance address: {:p}", self);
        eprintln!("TCPServer: [SEND_TO_CLIENT] Clients Arc address: {:p}", &*self.clients);

        // First, check if client exists
        {
            let clients = self.clients.read().await;
            eprintln!("TCPServer: [SEND_TO_CLIENT] Current clients count: {}", clients.len());
            eprintln!("TCPServer: [SEND_TO_CLIENT] Available clients: {:?}", clients.keys().collect::<Vec<_>>());

            if !clients.contains_key(client_id) {
                let error_msg = format!("Client {} not found in session {}", client_id, self.session_id);
                eprintln!("TCPServer: {}", error_msg);
                eprintln!("TCPServer: Available clients: {:?}", clients.keys().collect::<Vec<_>>());
                return Err(NetworkError::SendFailed(error_msg));
            }
        }

        // Get the write half and attempt to send data
        let write_half_arc = {
            let clients = self.clients.read().await;
            clients.get(client_id).cloned()
        };

        if let Some(write_half_arc) = write_half_arc {
            eprintln!("TCPServer: Found client {} in session {}", client_id, self.session_id);
            let mut write_half = write_half_arc.write().await;

            match write_half.write_all(data).await {
                Ok(_) => {
                    eprintln!("TCPServer: Successfully wrote {} bytes to client {} in session {}", data.len(), client_id, self.session_id);
                    match write_half.flush().await {
                        Ok(_) => {
                            eprintln!("TCPServer: Successfully flushed data to client {} in session {}", client_id, self.session_id);

                            // Emit message-received event for server-to-client data transmission
                            if let Some(app_handle) = self.app_handle.read().await.as_ref() {
                                let payload = serde_json::json!({
                                    "sessionId": self.session_id,
                                    "data": data.to_vec(),
                                    "direction": "out",
                                    "clientId": client_id
                                });

                                if let Err(e) = app_handle.emit("message-received", payload) {
                                    eprintln!("TCPServer: Failed to emit message-received event for server-to-client transmission: {}", e);
                                } else {
                                    eprintln!("TCPServer: Successfully emitted message-received event for {} bytes sent to client {}", data.len(), client_id);
                                }
                            }

                            Ok(data.len())
                        }
                        Err(e) => {
                            let error_msg = format!("Failed to flush data to client {}: {}", client_id, e);
                            eprintln!("TCPServer: {} - Removing disconnected client", error_msg);

                            // Remove the disconnected client from the clients list (prevent double removal)
                            let removed = self.clients.write().await.remove(client_id);
                            if removed.is_some() {
                                eprintln!("TCPServer: [SEND_TO_CLIENT] Successfully removed client {} due to flush error", client_id);

                                // Only emit disconnect event if we actually removed the client
                                if let Some(app_handle) = self.app_handle.read().await.as_ref() {
                                    let payload = serde_json::json!({
                                        "sessionId": self.session_id,
                                        "clientId": client_id
                                    });
                                    if let Err(emit_err) = app_handle.emit("client-disconnected", payload) {
                                        eprintln!("TCPServer: Failed to emit client-disconnected event: {}", emit_err);
                                    } else {
                                        eprintln!("TCPServer: Successfully emitted client-disconnected event for {} due to flush error", client_id);
                                    }
                                }
                            } else {
                                eprintln!("TCPServer: [SEND_TO_CLIENT] Client {} was already removed", client_id);
                            }

                            Err(NetworkError::SendFailed(error_msg))
                        }
                    }
                }
                Err(e) => {
                    let error_msg = format!("Failed to write data to client {}: {}", client_id, e);
                    eprintln!("TCPServer: {} - Removing disconnected client", error_msg);

                    // Remove the disconnected client from the clients list (prevent double removal)
                    let removed = self.clients.write().await.remove(client_id);
                    if removed.is_some() {
                        eprintln!("TCPServer: [SEND_TO_CLIENT] Successfully removed client {} due to write error", client_id);

                        // Only emit disconnect event if we actually removed the client
                        if let Some(app_handle) = self.app_handle.read().await.as_ref() {
                            let payload = serde_json::json!({
                                "sessionId": self.session_id,
                                "clientId": client_id
                            });
                            if let Err(emit_err) = app_handle.emit("client-disconnected", payload) {
                                eprintln!("TCPServer: Failed to emit client-disconnected event: {}", emit_err);
                            } else {
                                eprintln!("TCPServer: Successfully emitted client-disconnected event for {} due to write error", client_id);
                            }
                        }
                    } else {
                        eprintln!("TCPServer: [SEND_TO_CLIENT] Client {} was already removed", client_id);
                    }

                    Err(NetworkError::SendFailed(error_msg))
                }
            }
        } else {
            let error_msg = format!("Client {} not found in session {}", client_id, self.session_id);
            eprintln!("TCPServer: {}", error_msg);
            Err(NetworkError::SendFailed(error_msg))
        }
    }

    async fn broadcast(&mut self, data: &[u8]) -> NetworkResult<usize> {
        let mut total_sent = 0;
        let mut disconnected_clients = Vec::new();

        // Get client list for iteration
        let client_ids: Vec<String> = {
            let clients = self.clients.read().await;
            clients.keys().cloned().collect()
        };

        for client_id in client_ids {
            let write_half_arc = {
                let clients = self.clients.read().await;
                clients.get(&client_id).cloned()
            };

            if let Some(write_half_arc) = write_half_arc {
                let mut write_half = write_half_arc.write().await;
                match write_half.write_all(data).await {
                    Ok(_) => {
                        match write_half.flush().await {
                            Ok(_) => {
                                total_sent += data.len();

                                // Emit message-received event for broadcast to each client
                                if let Some(app_handle) = self.app_handle.read().await.as_ref() {
                                    let payload = serde_json::json!({
                                        "sessionId": self.session_id,
                                        "data": data.to_vec(),
                                        "direction": "out",
                                        "clientId": client_id
                                    });

                                    if let Err(e) = app_handle.emit("message-received", payload) {
                                        eprintln!("TCPServer: Failed to emit message-received event for broadcast to client {}: {}", client_id, e);
                                    } else {
                                        eprintln!("TCPServer: Successfully emitted message-received event for {} bytes broadcast to client {}", data.len(), client_id);
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("TCPServer: Failed to flush broadcast data to client {}: {}", client_id, e);
                                disconnected_clients.push(client_id.clone());
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("TCPServer: Failed to write broadcast data to client {}: {}", client_id, e);
                        disconnected_clients.push(client_id.clone());
                    }
                }
            }
        }

        // Clean up disconnected clients
        if !disconnected_clients.is_empty() {
            let mut clients = self.clients.write().await;
            for client_id in &disconnected_clients {
                eprintln!("TCPServer: Removing disconnected client {} during broadcast", client_id);
                clients.remove(client_id);

                // Emit client-disconnected event
                if let Some(app_handle) = self.app_handle.read().await.as_ref() {
                    let payload = serde_json::json!({
                        "sessionId": self.session_id,
                        "clientId": client_id
                    });
                    let _ = app_handle.emit("client-disconnected", payload);
                }
            }
        }

        Ok(total_sent)
    }

    fn get_clients(&self) -> Vec<String> {
        // Since this is a synchronous method, we need to use try_read() instead of read().await
        // This will return the current client list without blocking
        match self.clients.try_read() {
            Ok(clients_guard) => clients_guard.keys().cloned().collect(),
            Err(_) => {
                // If we can't acquire the lock immediately, return empty list
                // This prevents blocking but might miss some clients in rare cases
                eprintln!("TCPServer: Warning - Could not acquire clients lock for get_clients()");
                Vec::new()
            }
        }
    }

    async fn disconnect_client(&mut self, client_id: &str) -> NetworkResult<()> {
        let mut clients = self.clients.write().await;
        if let Some(write_half_arc) = clients.remove(client_id) {
            // The write half will be dropped, closing the connection
            drop(write_half_arc);
        }
        Ok(())
    }
}

/// Format TCP connection error with helpful suggestions
fn format_tcp_connection_error(error: &std::io::Error, host: &str, port: u16) -> String {
    let base_msg = format!("Connection failed: Unable to connect to {}:{}", host, port);

    match error.kind() {
        std::io::ErrorKind::ConnectionRefused => {
            format!("{} - Connection refused. Check if the server is running and the port is correct.", base_msg)
        }
        std::io::ErrorKind::TimedOut => {
            format!("{} - Connection timed out. Check network connectivity and firewall settings.", base_msg)
        }
        std::io::ErrorKind::PermissionDenied => {
            format!("{} - Permission denied. Try running as administrator or use a different port.", base_msg)
        }
        std::io::ErrorKind::AddrNotAvailable => {
            format!("{} - Address not available. Check if the host address is correct.", base_msg)
        }
        _ => {
            // Check for Windows error 10013 (WSAEACCES)
            if let Some(os_error) = error.raw_os_error() {
                if os_error == 10013 {
                    return format!("{} - Access denied (Windows error 10013). Try running as administrator or use a port >= 1024.", base_msg);
                }
            }
            format!("{} - {}", base_msg, error)
        }
    }
}

/// Format TCP bind error with helpful suggestions and return appropriate error type
fn format_tcp_bind_error(error: &std::io::Error, host: &str, port: u16) -> NetworkError {
    let base_msg = format!("Server startup failed: Unable to start TCP server on {}:{}", host, port);

    // Debug: Print the actual error details
    eprintln!("TCPServer: Bind error details - Kind: {:?}, OS Error: {:?}, Error: {}",
              error.kind(), error.raw_os_error(), error);

    match error.kind() {
        std::io::ErrorKind::AddrInUse => {
            // Address in use is retryable - we can try alternative ports
            let msg = format!("{} - Port already in use. Will try alternative ports automatically.", base_msg);
            NetworkError::ConnectionFailed(msg)
        }
        std::io::ErrorKind::PermissionDenied => {
            // Check for Windows error 10013 which can mean either permission denied OR address in use
            if let Some(os_error) = error.raw_os_error() {
                if os_error == 10013 {
                    // Windows error 10013 (WSAEACCES) can mean:
                    // 1. Address already in use (retryable)
                    // 2. Actual permission denied (permanent)
                    // We'll treat it as address in use for ports >= 1024, permission denied for < 1024
                    if port < 1024 {
                        let msg = format!("{} - Permission denied. Ports below 1024 require administrator privileges. Please run as administrator or use port 8080 or higher.", base_msg);
                        return NetworkError::ConnectionFailedPermanent(msg);
                    } else {
                        // For ports >= 1024, Windows error 10013 usually means address in use
                        let msg = format!("{} - Port already in use (Windows error 10013). Will try alternative ports automatically.", base_msg);
                        return NetworkError::ConnectionFailed(msg);
                    }
                }
            }

            // Standard permission denied (not Windows 10013)
            let msg = format!("{} - Permission denied. Please run as administrator or choose a different port.", base_msg);
            NetworkError::ConnectionFailedPermanent(msg)
        }
        std::io::ErrorKind::AddrNotAvailable => {
            // Address not available is usually permanent
            let msg = format!("{} - Address not available. Check if the bind address is correct (use 0.0.0.0 to bind to all interfaces).", base_msg);
            NetworkError::ConnectionFailedPermanent(msg)
        }
        _ => {
            // Check for Windows error 10013 (WSAEACCES)
            if let Some(os_error) = error.raw_os_error() {
                if os_error == 10013 {
                    let msg = format!("{} - Access denied (Windows error 10013). Please run as administrator or use a port >= 1024.", base_msg);
                    return NetworkError::ConnectionFailedPermanent(msg);
                }
            }
            // Other errors are treated as permanent by default
            let msg = format!("{} - {}", base_msg, error);
            NetworkError::ConnectionFailedPermanent(msg)
        }
    }
}

/// Generate a list of alternative ports to try when the requested port is in use
fn generate_alternative_ports(original_port: u16) -> Vec<u16> {
    let mut alternatives = Vec::new();

    // Common alternative ports based on the original port
    match original_port {
        // For common development ports, suggest other common alternatives
        8080 => alternatives.extend_from_slice(&[8081, 8082, 8083, 9000, 9001]),
        8081 => alternatives.extend_from_slice(&[8080, 8082, 8083, 9000, 9001]),
        8000 => alternatives.extend_from_slice(&[8001, 8002, 8003, 8080, 8081]),
        3000 => alternatives.extend_from_slice(&[3001, 3002, 3003, 8080, 8081]),
        5000 => alternatives.extend_from_slice(&[5001, 5002, 5003, 8080, 8081]),
        9000 => alternatives.extend_from_slice(&[9001, 9002, 9003, 8080, 8081]),
        _ => {
            // For other ports, try nearby ports and common alternatives
            // Try +1, +2, +3 from original port (if valid)
            for offset in 1..=3 {
                if let Some(new_port) = original_port.checked_add(offset) {
                    alternatives.push(new_port);
                }
            }

            // Add some common development ports if they're different from original
            let common_ports = [8080, 8081, 8082, 9000, 9001];
            for &port in &common_ports {
                if port != original_port && !alternatives.contains(&port) {
                    alternatives.push(port);
                }
            }
        }
    }

    // Ensure we don't suggest privileged ports (< 1024) unless the original was also privileged
    if original_port >= 1024 {
        alternatives.retain(|&port| port >= 1024);
    }

    // Limit to first 5 alternatives to avoid too many attempts
    alternatives.truncate(5);

    alternatives
}
