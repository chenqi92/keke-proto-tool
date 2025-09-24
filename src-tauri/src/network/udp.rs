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
    socket: Option<Arc<UdpSocket>>,
    connected: bool,
    app_handle: Arc<RwLock<Option<AppHandle>>>,
    background_task_started: bool,
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
            app_handle: Arc::new(RwLock::new(None)),
            background_task_started: false,
        })
    }

    /// Set the app handle for event emission
    pub async fn set_app_handle(&mut self, app_handle: AppHandle) {
        eprintln!("🔧 UdpClient: Setting app handle for session {}", self.session_id);
        eprintln!("🔍 UdpClient: Session {} - Acquiring write lock for app_handle", self.session_id);
        {
            let mut app_handle_guard = self.app_handle.write().await;
            eprintln!("🔍 UdpClient: Session {} - Write lock acquired, setting app_handle", self.session_id);
            *app_handle_guard = Some(app_handle);
            eprintln!("🔍 UdpClient: Session {} - App handle set in guard", self.session_id);
        }
        eprintln!("✅ UdpClient: App handle set successfully for session {}", self.session_id);

        // Verify the app_handle was set correctly
        {
            let app_handle_guard = self.app_handle.read().await;
            if app_handle_guard.is_some() {
                eprintln!("✅ UdpClient: Session {} - Verification: app_handle is available", self.session_id);
            } else {
                eprintln!("❌ UdpClient: Session {} - Verification: app_handle is still None!", self.session_id);
            }
        }

        // If we have a socket and are connected, start the background receiving task now
        if let Some(socket) = &self.socket {
            if self.connected && !self.background_task_started {
                eprintln!("🔧 UdpClient: Session {} - App handle set after connection, starting background task now", self.session_id);
                if let Err(e) = self.start_receiving_background(socket.clone()).await {
                    eprintln!("❌ UdpClient: Session {} - Failed to start background receiving task: {}", self.session_id, e);
                } else {
                    self.background_task_started = true;
                    eprintln!("✅ UdpClient: Session {} - Background receiving task started successfully", self.session_id);
                }
            }
        }
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

    /// Start receiving data from server in the background using Arc<UdpSocket>
    async fn start_receiving_background(&mut self, socket: Arc<UdpSocket>) -> NetworkResult<()> {
        eprintln!("🚨🚨🚨 UdpClient: start_receiving_background called for session {}", self.session_id);

        let session_id = self.session_id.clone();
        let session_id_for_log = session_id.clone(); // Clone for use outside the async block

        // Debug: Check app_handle status at the time of cloning
        eprintln!("🔍 UdpClient: Session {} - Checking app_handle before cloning...", session_id_for_log);
        {
            let app_handle_guard = self.app_handle.read().await;
            if app_handle_guard.is_some() {
                eprintln!("✅ UdpClient: Session {} - App handle is available before cloning", session_id_for_log);
            } else {
                eprintln!("❌ UdpClient: Session {} - App handle is None before cloning!", session_id_for_log);
            }
        }

        let app_handle = Arc::clone(&self.app_handle);
        let socket_clone = socket.clone();

        eprintln!("🔧 UdpClient: Session {} - Setting up background receiving task", session_id_for_log);
        eprintln!("🔧 UdpClient: Session {} - Socket local_addr: {:?}", session_id_for_log, socket_clone.local_addr());
        eprintln!("🔧 UdpClient: Session {} - Socket peer_addr: {:?}", session_id_for_log, socket_clone.peer_addr());

        // Check if socket is actually connected
        match socket_clone.peer_addr() {
            Ok(peer) => eprintln!("✅ UdpClient: Session {} - Socket is connected to peer: {}", session_id_for_log, peer),
            Err(e) => eprintln!("❌ UdpClient: Session {} - Socket is NOT connected: {}", session_id_for_log, e),
        }

        tokio::spawn(async move {
            eprintln!("🔧 UdpClient: Starting background task to receive data from server for session {}", session_id);

            // Wait for app_handle to be available before starting to receive data
            eprintln!("⏳ UdpClient: Session {} - Waiting for app handle to be set...", session_id);
            loop {
                {
                    let app_handle_guard = app_handle.read().await;
                    if app_handle_guard.is_some() {
                        eprintln!("✅ UdpClient: Session {} - App handle is now available in background task", session_id);
                        break;
                    } else {
                        eprintln!("⏳ UdpClient: Session {} - App handle still None, waiting...", session_id);
                    }
                }
                // Wait a short time before checking again
                tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            }

            let mut buffer = [0u8; 65536];

            loop {
                eprintln!("🔧 UdpClient: Session {} - Waiting for data from server...", session_id);

                // Use recv() instead of recv_from() for connected UDP socket
                match socket_clone.recv(&mut buffer).await {
                    Ok(size) => {
                        eprintln!("✅ UdpClient: Session {} - Received {} bytes from server", session_id, size);
                        eprintln!("🔧 UdpClient: Session {} - Data received: {:?}", session_id, &buffer[..size]);

                        // Debug: Check app_handle status before event emission
                        eprintln!("🔍 UdpClient: Session {} - Checking app_handle availability in background task...", session_id);
                        let app_handle_guard = app_handle.read().await;
                        eprintln!("🔍 UdpClient: Session {} - App handle guard acquired in background task", session_id);

                        // Emit message-received event for server-to-client data
                        if let Some(app_handle_ref) = app_handle_guard.as_ref() {
                            eprintln!("✅ UdpClient: Session {} - App handle is available in background task, emitting event", session_id);
                            let payload = serde_json::json!({
                                "sessionId": session_id,
                                "data": buffer[..size].to_vec(),
                                "direction": "in"
                            });

                            eprintln!("🔧 UdpClient: Session {} - Emitting message-received event", session_id);
                            if let Err(e) = app_handle_ref.emit("message-received", payload) {
                                eprintln!("❌ UdpClient: Failed to emit message-received event for received data: {}", e);
                            } else {
                                eprintln!("✅ UdpClient: Successfully emitted message-received event for {} bytes received from server", size);
                            }
                        } else {
                            eprintln!("❌ UdpClient: Session {} - No app handle available for event emission in background task", session_id);
                            eprintln!("🔍 UdpClient: Session {} - App handle is None in background task", session_id);
                        }

                        // Release the guard explicitly
                        drop(app_handle_guard);
                    }
                    Err(e) => {
                        eprintln!("❌ UdpClient: Error receiving data for session {}: {}", session_id, e);
                        eprintln!("🔧 UdpClient: Session {} - Error kind: {:?}", session_id, e.kind());
                        // Continue the loop to keep listening
                    }
                }
            }
        });

        eprintln!("✅ UdpClient: Session {} - Background receiving task spawned successfully", session_id_for_log);
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

        // Wrap socket in Arc to share between sending and receiving
        let socket_arc = Arc::new(socket);

        // Store socket reference for sending data
        self.socket = Some(socket_arc.clone());
        self.connected = true; // "connected" means socket is ready

        // Don't start receiving background task here - it will be started when app_handle is set
        eprintln!("🔧 UdpClient: Session {} - Connection established, waiting for app_handle to start background task", self.session_id);
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

        // Add detailed socket information for debugging
        eprintln!("🔧 UdpClient: Session {} - Socket local_addr: {:?}", self.session_id, socket.local_addr());
        eprintln!("🔧 UdpClient: Session {} - Socket peer_addr: {:?}", self.session_id, socket.peer_addr());

        eprintln!("🚀 UdpClient: Session {} - Attempting to send {} bytes via UDP socket", self.session_id, data.len());
        let bytes_sent = socket.send(data).await
            .map_err(|e| {
                eprintln!("❌ UdpClient: Session {} - UDP send failed: {}", self.session_id, e);
                NetworkError::SendFailed(format!("UDP send failed: {}", e))
            })?;

        eprintln!("✅ UdpClient: Session {} - Successfully sent {} bytes to {}:{} from local port {:?}",
                  self.session_id, bytes_sent, self.host, self.port, socket.local_addr());

        // Emit message-received event for client-to-server data transmission
        if let Some(app_handle) = self.app_handle.read().await.as_ref() {
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

        let (_tx, rx) = mpsc::channel(1000);

        // For UDP client, we don't start receiving here anymore
        // The receiving is handled by start_receiving_background which is called when app_handle is set
        eprintln!("🔧 UdpClient: Session {} - start_receiving called, but background task will be started when app_handle is set", self.session_id);

        // Return the receiver, but the actual receiving will be started later
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
        if let Some(app_handle) = self.app_handle.read().await.as_ref() {
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
    socket: Option<Arc<UdpSocket>>, // Use Arc to share socket between tasks
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
    fn start_receiving_background(&mut self, socket: Arc<UdpSocket>) -> NetworkResult<()> {
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
                                    "remoteAddress": addr.ip().to_string(),
                                    "remotePort": addr.port(),
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

        // Wrap socket in Arc to share between tasks
        let socket_arc = Arc::new(socket);

        // Store socket reference for sending data
        self.socket = Some(socket_arc.clone());

        // Start receiving data from clients immediately after binding
        eprintln!("UDPServer: Starting to receive data from clients on {}", bind_addr);
        self.start_receiving_background(socket_arc)?;
        eprintln!("UDPServer: Successfully started receiving data from clients");

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
        eprintln!("🔥 UdpServer: Session {} - send_to_client called with {} bytes to {}", self.session_id, data.len(), client_id);

        if !self.connected {
            eprintln!("❌ UdpServer: Session {} - Not connected, cannot send", self.session_id);
            return Err(NetworkError::NotConnected);
        }

        // Parse client_id as socket address
        let client_addr: SocketAddr = client_id.parse()
            .map_err(|_| {
                let error = format!("Invalid client address: {}", client_id);
                eprintln!("❌ UdpServer: Session {} - {}", self.session_id, error);
                NetworkError::SendFailed(error)
            })?;

        eprintln!("🔧 UdpServer: Session {} - Parsed client address: {}", self.session_id, client_addr);

        // Use the server's socket for sending data
        let socket = self.socket.as_ref()
            .ok_or_else(|| {
                eprintln!("❌ UdpServer: Session {} - No socket available", self.session_id);
                NetworkError::NotConnected
            })?;

        eprintln!("🔧 UdpServer: Session {} - Server socket local_addr: {:?}", self.session_id, socket.local_addr());
        eprintln!("🔧 UdpServer: Session {} - Sending {} bytes to {}", self.session_id, data.len(), client_addr);

        let bytes_sent = socket.send_to(data, client_addr).await
            .map_err(|e| {
                let error = format!("UDP send_to_client failed: {}", e);
                eprintln!("❌ UdpServer: Session {} - {}", self.session_id, error);
                NetworkError::SendFailed(error)
            })?;

        eprintln!("✅ UdpServer: Session {} - Successfully sent {} bytes to client {}", self.session_id, bytes_sent, client_id);

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

        // Use the server's socket for broadcasting
        let socket = self.socket.as_ref()
            .ok_or(NetworkError::NotConnected)?;

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
