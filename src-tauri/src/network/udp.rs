use async_trait::async_trait;
use crate::network::{Connection, ServerConnection, UdpConnection};
use crate::types::{NetworkResult, NetworkError, NetworkEvent};
use tokio::sync::mpsc;
use tokio::net::UdpSocket;
use std::net::SocketAddr;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// UDP Client implementation
#[derive(Debug)]
pub struct UdpClient {
    session_id: String,
    host: String,
    port: u16,
    socket: Option<UdpSocket>,
    connected: bool,
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
        })
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
        self.socket = Some(socket);
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
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let socket = self.socket.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let bytes_sent = socket.send(data).await
            .map_err(|e| NetworkError::SendFailed(format!("UDP send failed: {}", e)))?;

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

        // Spawn background task for receiving data
        tokio::spawn(async move {
            let mut buffer = [0u8; 65536]; // Max UDP packet size

            loop {
                match socket.recv(&mut buffer).await {
                    Ok(size) => {
                        let data = buffer[..size].to_vec();
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
        })
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
        self.socket = Some(socket);
        self.connected = true; // "connected" means socket is bound and ready
        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if !self.connected {
            return Ok(());
        }

        self.socket = None;
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

        // Spawn background task for receiving data
        tokio::spawn(async move {
            let mut buffer = [0u8; 65536]; // Max UDP packet size

            loop {
                match socket.recv_from(&mut buffer).await {
                    Ok((size, addr)) => {
                        // Track the client address
                        {
                            let mut clients_guard = clients.write().await;
                            clients_guard.insert(addr, addr.to_string());
                        }

                        let data = buffer[..size].to_vec();
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
            match socket.send_to(data, client_addr).await {
                Ok(bytes_sent) => total_sent += bytes_sent,
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
