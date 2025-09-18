use async_trait::async_trait;
use crate::network::{Connection, ServerConnection, UdpConnection};
use crate::types::{NetworkResult, NetworkError, NetworkEvent};
use tokio::sync::mpsc;
use tokio::net::UdpSocket;
use std::net::SocketAddr;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::{AppHandle, Emitter};

/// UDP Client implementation
#[derive(Debug)]
pub struct UdpClient {
    session_id: String,
    host: String,
    port: u16,
    socket: Option<UdpSocket>,
    connected: bool,
    app_handle: Option<AppHandle>,
}

impl UdpClient {
    pub fn new(session_id: String, config: serde_json::Value) -> NetworkResult<Self> {
        let host = config.get("host")
            .and_then(|v| v.as_str())
            .unwrap_or("127.0.0.1")
            .to_string();
        
        let port = config.get("port")
            .and_then(|v| v.as_u64())
            .unwrap_or(8080) as u16;

        Ok(Self {
            session_id,
            host,
            port,
            socket: None,
            connected: false,
            app_handle: None,
        })
    }

    /// Set the app handle for event emission
    pub async fn set_app_handle(&mut self, app_handle: AppHandle) {
        eprintln!("UdpClient: Setting app handle for session {}", self.session_id);
        self.app_handle = Some(app_handle);
        eprintln!("UdpClient: App handle set successfully for session {}", self.session_id);
    }

    /// Validate if the target UDP server is reachable by sending a test packet
    /// This is optional validation since UDP is connectionless
    pub async fn validate_server_reachability(&self) -> NetworkResult<bool> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        // Create a temporary socket for validation
        let socket = UdpSocket::bind("0.0.0.0:0").await
            .map_err(|e| NetworkError::ConnectionFailed(format!("Failed to create validation socket: {}", e)))?;

        let target_addr = format!("{}:{}", self.host, self.port);

        // Send a small test packet (empty or minimal data)
        let test_data = b""; // Empty packet for validation

        match socket.send_to(test_data, &target_addr).await {
            Ok(_) => {
                eprintln!("UdpClient: Test packet sent to {}:{} successfully", self.host, self.port);
                // Note: UDP send success doesn't guarantee the server received it
                // This only validates that the address is routable
                Ok(true)
            }
            Err(e) => {
                eprintln!("UdpClient: Failed to send test packet to {}:{}: {}", self.host, self.port, e);
                // Common errors: network unreachable, host unreachable, etc.
                Ok(false)
            }
        }
    }

    /// Start receiving data from server in the background
    async fn start_receiving_background(&mut self, socket: UdpSocket) -> NetworkResult<()> {
        let session_id = self.session_id.clone();
        let app_handle = self.app_handle.clone();

        tokio::spawn(async move {
            let mut buffer = [0u8; 65536];
            eprintln!("UdpClient: Starting background task to receive data from server for session {}", session_id);

            loop {
                match socket.recv_from(&mut buffer).await {
                    Ok((size, addr)) => {
                        eprintln!("UdpClient: Session {} - Received {} bytes from server {}", session_id, size, addr);

                        // Emit message-received event for server-to-client data
                        if let Some(app_handle_ref) = &app_handle {
                            let payload = serde_json::json!({
                                "sessionId": session_id,
                                "data": buffer[..size].to_vec(),
                                "direction": "in"
                            });

                            if let Err(e) = app_handle_ref.emit("message-received", payload) {
                                eprintln!("UdpClient: Failed to emit message-received event for received data: {}", e);
                            } else {
                                eprintln!("UdpClient: Successfully emitted message-received event for {} bytes received from server", size);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("UdpClient: Error receiving data for session {}: {}", session_id, e);
                        // Continue the loop to keep listening
                    }
                }
            }
        });

        Ok(())
    }
}

#[async_trait]
impl Connection for UdpClient {
    async fn connect(&mut self) -> NetworkResult<()> {
        if self.connected {
            eprintln!("UDPClient: Already connected");
            return Ok(());
        }

        eprintln!("UDPClient: Setting up UDP socket for {}:{}", self.host, self.port);

        // For UDP client, we just bind to a local address
        // UDP is connectionless, so "connect" just sets up the socket
        let local_addr = "0.0.0.0:0"; // Bind to any available port
        let socket = UdpSocket::bind(local_addr).await
            .map_err(|e| {
                let error_msg = format!("Failed to create UDP socket: {}", e);
                eprintln!("UDPClient: {}", error_msg);
                NetworkError::ConnectionFailed(error_msg)
            })?;

        // For UDP, "connect" just sets the default destination
        // This is optional and mainly for convenience
        let remote_addr = format!("{}:{}", self.host, self.port);
        eprintln!("UDPClient: Setting default destination to {}", remote_addr);

        if let Err(e) = socket.connect(&remote_addr).await {
            // If connect fails, we can still use the socket with send_to
            eprintln!("UDPClient: UDP connect failed (will use send_to instead): {}", e);
        } else {
            eprintln!("UDPClient: Successfully set default destination");
        }

        eprintln!("UDPClient: UDP socket ready for communication");

        // Start receiving data from server in the background
        self.start_receiving_background(socket).await?;

        self.connected = true; // "connected" means socket is ready
        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if !self.connected {
            return Ok(());
        }

        self.socket = None;
        self.connected = false;
        Ok(())
    }

    async fn send(&mut self, data: &[u8]) -> NetworkResult<usize> {
        eprintln!("🔥 UdpClient: Session {} - SEND METHOD CALLED with {} bytes", self.session_id, data.len());

        if !self.connected {
            eprintln!("❌ UdpClient: Session {} - Not connected, cannot send", self.session_id);
            return Err(NetworkError::NotConnected);
        }

        let socket = self.socket.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        eprintln!("🚀 UdpClient: Session {} - Attempting to send {} bytes via UDP socket", self.session_id, data.len());
        let bytes_sent = socket.send(data).await
            .map_err(|e| {
                eprintln!("❌ UdpClient: Session {} - UDP send failed: {}", self.session_id, e);
                NetworkError::SendFailed(format!("UDP send failed: {}", e))
            })?;

        eprintln!("✅ UdpClient: Session {} - Successfully sent {} bytes", self.session_id, bytes_sent);

        // Emit message-received event for client-to-server data transmission
        if let Some(app_handle) = &self.app_handle {
            let payload = serde_json::json!({
                "sessionId": self.session_id,
                "data": data.to_vec(),
                "direction": "out"
            });

            if let Err(e) = app_handle.emit("message-received", payload) {
                eprintln!("❌ UdpClient: Failed to emit message-received event for client-to-server transmission: {}", e);
            } else {
                eprintln!("✅ UdpClient: Successfully emitted message-received event for {} bytes sent", bytes_sent);
            }
        }

        Ok(bytes_sent)
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    fn status(&self) -> String {
        if self.connected {
            format!("UDP socket ready (target: {}:{})", self.host, self.port)
        } else {
            "UDP socket not initialized".to_string()
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let (tx, rx) = mpsc::channel(1000);

        // We need to create a new socket for receiving since we moved the original one
        let local_addr = "0.0.0.0:0";
        let socket = UdpSocket::bind(local_addr).await
            .map_err(|e| NetworkError::ConnectionFailed(format!("Failed to bind UDP socket for receiving: {}", e)))?;

        let remote_addr = format!("{}:{}", self.host, self.port);
        socket.connect(&remote_addr).await
            .map_err(|e| NetworkError::ConnectionFailed(format!("Failed to connect to {}: {}", remote_addr, e)))?;

        let session_id = self.session_id.clone();
        let app_handle = self.app_handle.clone();

        // Spawn background task for receiving data
        tokio::spawn(async move {
            let mut buffer = [0u8; 65536]; // Max UDP packet size

            loop {
                match socket.recv(&mut buffer).await {
                    Ok(size) => {
                        let data = buffer[..size].to_vec();
                        eprintln!("UdpClient: Session {} - Received {} bytes", session_id, size);

                        // Emit message-received event for server-to-client data transmission
                        if let Some(app_handle) = &app_handle {
                            let payload = serde_json::json!({
                                "sessionId": session_id,
                                "data": data.clone(),
                                "direction": "in"
                            });

                            if let Err(e) = app_handle.emit("message-received", payload) {
                                eprintln!("UdpClient: Failed to emit message-received event for server-to-client transmission: {}", e);
                            } else {
                                eprintln!("UdpClient: Successfully emitted message-received event for {} bytes received", size);
                            }
                        }

                        if tx.send(NetworkEvent {
                            session_id: session_id.clone(),
                            event_type: "message".to_string(),
                            data: Some(data),
                            error: None,
                            client_id: None,
                            mqtt_topic: None,
                            mqtt_qos: None,
                            mqtt_retain: None,
                            sse_event: None,
                        }).await.is_err() {
                            break; // Receiver dropped
                        }
                    }
                    Err(e) => {
                        let _ = tx.send(NetworkEvent {
                            session_id: session_id.clone(),
                            event_type: "error".to_string(),
                            data: None,
                            error: Some(format!("UDP receive error: {}", e)),
                            client_id: None,
                            mqtt_topic: None,
                            mqtt_qos: None,
                            mqtt_retain: None,
                            sse_event: None,
                        }).await;
                        break;
                    }
                }
            }
        });

        Ok(rx)
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

#[async_trait]
impl UdpConnection for UdpClient {
    async fn send_to(&mut self, data: &[u8], host: &str, port: u16) -> NetworkResult<usize> {
        // Create a temporary socket for sending to a specific address
        let socket = UdpSocket::bind("0.0.0.0:0").await
            .map_err(|e| NetworkError::ConnectionFailed(format!("Failed to bind UDP socket: {}", e)))?;

        let target_addr = format!("{}:{}", host, port);
        let bytes_sent = socket.send_to(data, &target_addr).await
            .map_err(|e| NetworkError::SendFailed(format!("UDP send_to failed: {}", e)))?;

        eprintln!("UdpClient: Session {} - Successfully sent {} bytes to {}:{}", self.session_id, bytes_sent, host, port);

        // Emit message-received event for client-to-server data transmission
        if let Some(app_handle) = &self.app_handle {
            let payload = serde_json::json!({
                "sessionId": self.session_id,
                "data": data.to_vec(),
                "direction": "out"
            });

            if let Err(e) = app_handle.emit("message-received", payload) {
                eprintln!("UdpClient: Failed to emit message-received event for send_to transmission: {}", e);
            } else {
                eprintln!("UdpClient: Successfully emitted message-received event for {} bytes sent to {}:{}", bytes_sent, host, port);
            }
        }

        Ok(bytes_sent)
    }
}

/// UDP Server implementation
#[derive(Debug)]
pub struct UdpServer {
    session_id: String,
    host: String,
    port: u16,
    socket: Option<UdpSocket>,
    connected: bool,
    clients: Arc<RwLock<HashMap<SocketAddr, String>>>, // Track client addresses
    app_handle: Arc<RwLock<Option<AppHandle>>>,
}

impl UdpServer {
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
            socket: None,
            connected: false,
            clients: Arc::new(RwLock::new(HashMap::new())),
            app_handle: Arc::new(RwLock::new(None)),
        })
    }

    /// Set the app handle for event emission
    pub async fn set_app_handle(&mut self, app_handle: AppHandle) {
        eprintln!("UdpServer: Setting app handle for session {}", self.session_id);
        *self.app_handle.write().await = Some(app_handle);
        eprintln!("UdpServer: App handle set successfully for session {}", self.session_id);
    }

    /// Start receiving data from clients in the background using the existing socket
    fn start_receiving_background(&mut self, socket: UdpSocket) -> NetworkResult<()> {
        let session_id = self.session_id.clone();
        let clients = self.clients.clone();
        let app_handle = self.app_handle.clone();

        eprintln!("UdpServer: Starting background task to receive data from clients");

        // Spawn background task for receiving data
        tokio::spawn(async move {
            let mut buffer = [0u8; 65536]; // Max UDP packet size

            loop {
                match socket.recv_from(&mut buffer).await {
                    Ok((size, addr)) => {
                        let client_id = addr.to_string();
                        let is_new_client;

                        // Track the client address
                        {
                            let mut clients_guard = clients.write().await;
                            is_new_client = !clients_guard.contains_key(&addr);
                            clients_guard.insert(addr, client_id.clone());
                        }

                        eprintln!("UdpServer: Session {} - Received {} bytes from client {}", session_id, size, client_id);

                        // Emit client-connected event for new clients
                        if is_new_client {
                            if let Some(app_handle) = app_handle.read().await.as_ref() {
                                let payload = serde_json::json!({
                                    "sessionId": session_id,
                                    "clientId": client_id,
                                    "address": addr.to_string(),
                                    "connectedAt": chrono::Utc::now().to_rfc3339()
                                });

                                if let Err(e) = app_handle.emit("client-connected", payload) {
                                    eprintln!("UdpServer: Failed to emit client-connected event: {}", e);
                                } else {
                                    eprintln!("UdpServer: Successfully emitted client-connected event for {}", client_id);
                                }
                            }
                        }

                        // Emit message-received event
                        if let Some(app_handle) = app_handle.read().await.as_ref() {
                            let payload = serde_json::json!({
                                "sessionId": session_id,
                                "data": buffer[..size].to_vec(),
                                "direction": "in",
                                "clientId": client_id
                            });

                            if let Err(e) = app_handle.emit("message-received", payload) {
                                eprintln!("UdpServer: Failed to emit message-received event: {}", e);
                            } else {
                                eprintln!("UdpServer: Successfully emitted message-received event for {} bytes from {}", size, client_id);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("UdpServer: Session {} - Error receiving data: {}", session_id, e);
                        // Continue the loop to keep receiving
                    }
                }
            }
        });

        Ok(())
    }
}

#[async_trait]
impl Connection for UdpServer {
    async fn connect(&mut self) -> NetworkResult<()> {
        if self.connected {
            eprintln!("UDPServer: Already connected");
            return Ok(());
        }

        let bind_addr = format!("{}:{}", self.host, self.port);
        eprintln!("UDPServer: Attempting to bind to {}", bind_addr);

        let socket = UdpSocket::bind(&bind_addr).await
            .map_err(|e| {
                let error_msg = format_udp_bind_error(&e, &self.host, self.port);
                eprintln!("UDPServer: Bind failed - {}", error_msg);
                NetworkError::ConnectionFailed(error_msg)
            })?;

        eprintln!("UDPServer: Successfully bound to {}", bind_addr);

        // Start receiving data from clients immediately after binding
        eprintln!("UDPServer: Starting to receive data from clients on {}", bind_addr);
        self.start_receiving_background(socket)?;
        eprintln!("UDPServer: Successfully started receiving data from clients");

        // Note: We don't store the socket since it's moved to the background task
        self.connected = true; // "connected" means socket is bound and ready

        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if !self.connected {
            return Ok(());
        }

        // Note: The socket is owned by the background task, so we can't explicitly close it
        // The background task will terminate when the socket is dropped
        self.connected = false;
        self.clients.write().await.clear();
        Ok(())
    }

    async fn send(&mut self, data: &[u8]) -> NetworkResult<usize> {
        // For UDP server, send means broadcast to all known clients
        self.broadcast(data).await
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    fn status(&self) -> String {
        if self.connected {
            format!("UDP server bound to {}:{}", self.host, self.port)
        } else {
            "UDP server not bound".to_string()
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let (tx, rx) = mpsc::channel(1000);

        // Create a new socket for receiving since we can't move the original
        let bind_addr = format!("{}:{}", self.host, self.port);
        let socket = UdpSocket::bind(&bind_addr).await
            .map_err(|e| NetworkError::ConnectionFailed(format!("Failed to bind UDP socket for receiving: {}", e)))?;

        let session_id = self.session_id.clone();
        let clients = Arc::clone(&self.clients);
        let app_handle = Arc::clone(&self.app_handle);

        // Spawn background task for receiving data
        tokio::spawn(async move {
            let mut buffer = [0u8; 65536]; // Max UDP packet size

            loop {
                match socket.recv_from(&mut buffer).await {
                    Ok((size, addr)) => {
                        let client_id = addr.to_string();
                        let is_new_client;

                        // Track the client address
                        {
                            let mut clients_guard = clients.write().await;
                            is_new_client = !clients_guard.contains_key(&addr);
                            clients_guard.insert(addr, client_id.clone());
                        }

                        // Emit client-connected event for new clients
                        if is_new_client {
                            if let Some(app_handle_ref) = app_handle.read().await.as_ref() {
                                let payload = serde_json::json!({
                                    "sessionId": session_id,
                                    "clientId": client_id,
                                    "remoteAddress": addr.ip().to_string(),
                                    "remotePort": addr.port()
                                });

                                if let Err(e) = app_handle_ref.emit("client-connected", payload) {
                                    eprintln!("UdpServer: Failed to emit client-connected event: {}", e);
                                } else {
                                    eprintln!("UdpServer: Successfully emitted client-connected event for {}", client_id);
                                }
                            }
                        }

                        let data = buffer[..size].to_vec();
                        eprintln!("UdpServer: Session {} - Received {} bytes from {}", session_id, size, client_id);

                        // Emit message-received event
                        if let Some(app_handle_ref) = app_handle.read().await.as_ref() {
                            let payload = serde_json::json!({
                                "sessionId": session_id,
                                "data": data.clone(),
                                "direction": "in",
                                "clientId": client_id
                            });

                            if let Err(e) = app_handle_ref.emit("message-received", payload) {
                                eprintln!("UdpServer: Failed to emit message-received event: {}", e);
                            } else {
                                eprintln!("UdpServer: Successfully emitted message-received event for {} bytes from {}", size, client_id);
                            }
                        }
                        if tx.send(NetworkEvent {
                            session_id: session_id.clone(),
                            event_type: "message".to_string(),
                            data: Some(data),
                            error: None,
                            client_id: Some(addr.to_string()),
                            mqtt_topic: None,
                            mqtt_qos: None,
                            mqtt_retain: None,
                            sse_event: None,
                        }).await.is_err() {
                            break; // Receiver dropped
                        }
                    }
                    Err(e) => {
                        let _ = tx.send(NetworkEvent {
                            session_id: session_id.clone(),
                            event_type: "error".to_string(),
                            data: None,
                            error: Some(format!("UDP server receive error: {}", e)),
                            client_id: None,
                            mqtt_topic: None,
                            mqtt_qos: None,
                            mqtt_retain: None,
                            sse_event: None,
                        }).await;
                        break;
                    }
                }
            }
        });

        Ok(rx)
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

#[async_trait]
impl ServerConnection for UdpServer {
    async fn send_to_client(&mut self, client_id: &str, data: &[u8]) -> NetworkResult<usize> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        // Parse client_id as socket address
        let client_addr: SocketAddr = client_id.parse()
            .map_err(|_| NetworkError::SendFailed(format!("Invalid client address: {}", client_id)))?;

        // Create a temporary socket for sending
        let socket = UdpSocket::bind("0.0.0.0:0").await
            .map_err(|e| NetworkError::ConnectionFailed(format!("Failed to bind UDP socket: {}", e)))?;

        let bytes_sent = socket.send_to(data, client_addr).await
            .map_err(|e| NetworkError::SendFailed(format!("UDP send_to_client failed: {}", e)))?;

        eprintln!("UdpServer: Session {} - Successfully sent {} bytes to client {}", self.session_id, bytes_sent, client_id);

        // Emit message-received event for server-to-client data transmission
        if let Some(app_handle) = self.app_handle.read().await.as_ref() {
            let payload = serde_json::json!({
                "sessionId": self.session_id,
                "data": data.to_vec(),
                "direction": "out",
                "clientId": client_id
            });

            if let Err(e) = app_handle.emit("message-received", payload) {
                eprintln!("UdpServer: Failed to emit message-received event for server-to-client transmission: {}", e);
            } else {
                eprintln!("UdpServer: Successfully emitted message-received event for {} bytes sent to client {}", bytes_sent, client_id);
            }
        }

        Ok(bytes_sent)
    }

    async fn broadcast(&mut self, data: &[u8]) -> NetworkResult<usize> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let clients = self.clients.read().await;
        if clients.is_empty() {
            return Ok(0); // No clients to broadcast to
        }

        // Create a temporary socket for broadcasting
        let socket = UdpSocket::bind("0.0.0.0:0").await
            .map_err(|e| NetworkError::ConnectionFailed(format!("Failed to bind UDP socket: {}", e)))?;

        let mut total_sent = 0;
        for client_addr in clients.keys() {
            let client_id = client_addr.to_string();
            match socket.send_to(data, client_addr).await {
                Ok(bytes_sent) => {
                    total_sent += bytes_sent;
                    eprintln!("UdpServer: Successfully broadcast {} bytes to client {}", bytes_sent, client_id);

                    // Emit message-received event for broadcast to each client
                    if let Some(app_handle) = self.app_handle.read().await.as_ref() {
                        let payload = serde_json::json!({
                            "sessionId": self.session_id,
                            "data": data.to_vec(),
                            "direction": "out",
                            "clientId": client_id
                        });

                        if let Err(e) = app_handle.emit("message-received", payload) {
                            eprintln!("UdpServer: Failed to emit message-received event for broadcast to client {}: {}", client_id, e);
                        } else {
                            eprintln!("UdpServer: Successfully emitted message-received event for {} bytes broadcast to client {}", bytes_sent, client_id);
                        }
                    }
                }
                Err(e) => {
                    // Log error but continue with other clients
                    eprintln!("Failed to send to client {}: {}", client_addr, e);
                }
            }
        }

        Ok(total_sent)
    }

    fn get_clients(&self) -> Vec<String> {
        // This is a blocking call, but we need to make it async-compatible
        // For now, return empty vec - this should be improved
        Vec::new()
    }

    async fn disconnect_client(&mut self, _client_id: &str) -> NetworkResult<()> {
        // UDP is connectionless, so this is a no-op
        Ok(())
    }
}

#[async_trait]
impl UdpConnection for UdpServer {
    async fn send_to(&mut self, data: &[u8], host: &str, port: u16) -> NetworkResult<usize> {
        // Create a temporary socket for sending to a specific address
        let socket = UdpSocket::bind("0.0.0.0:0").await
            .map_err(|e| NetworkError::ConnectionFailed(format!("Failed to bind UDP socket: {}", e)))?;

        let target_addr = format!("{}:{}", host, port);
        let bytes_sent = socket.send_to(data, &target_addr).await
            .map_err(|e| NetworkError::SendFailed(format!("UDP send_to failed: {}", e)))?;

        Ok(bytes_sent)
    }
}

/// Format UDP bind error with helpful suggestions
fn format_udp_bind_error(error: &std::io::Error, host: &str, port: u16) -> String {
    let base_msg = format!("Failed to bind UDP socket to {}:{}", host, port);

    match error.kind() {
        std::io::ErrorKind::AddrInUse => {
            format!("{} - Address already in use. Try a different port.", base_msg)
        }
        std::io::ErrorKind::PermissionDenied => {
            if port < 1024 {
                format!("{} - Permission denied. Ports below 1024 require administrator privileges. Try using port 8080 or higher.", base_msg)
            } else {
                format!("{} - Permission denied. Try running as administrator.", base_msg)
            }
        }
        std::io::ErrorKind::AddrNotAvailable => {
            format!("{} - Address not available. Check if the bind address is correct (use 0.0.0.0 to bind to all interfaces).", base_msg)
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
