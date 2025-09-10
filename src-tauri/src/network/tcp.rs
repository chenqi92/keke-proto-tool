use async_trait::async_trait;
use crate::network::{Connection, ServerConnection};
use crate::types::{NetworkResult, NetworkError, NetworkEvent};
use crate::utils::{parse_socket_addr, validate_port, is_common_port};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// TCP Client implementation
#[derive(Debug)]
pub struct TcpClient {
    session_id: String,
    host: String,
    port: u16,
    timeout: Option<u64>,
    stream: Option<TcpStream>,
    connected: bool,
}

impl TcpClient {
    pub fn new(session_id: String, config: serde_json::Value) -> NetworkResult<Self> {
        let host = config.get("host")
            .and_then(|v| v.as_str())
            .unwrap_or("127.0.0.1")
            .to_string();
        
        let port = config.get("port")
            .and_then(|v| v.as_u64())
            .unwrap_or(8080) as u16;
        
        let timeout = config.get("timeout")
            .and_then(|v| v.as_u64());

        Ok(Self {
            session_id,
            host,
            port,
            timeout,
            stream: None,
            connected: false,
        })
    }
}

#[async_trait]
impl Connection for TcpClient {
    async fn connect(&mut self) -> NetworkResult<()> {
        eprintln!("TCPClient: Attempting to connect to {}:{}", self.host, self.port);

        let addr = parse_socket_addr(&self.host, self.port)
            .map_err(|e| {
                let error_msg = format!("Invalid address {}:{} - {}", self.host, self.port, e);
                eprintln!("TCPClient: {}", error_msg);
                NetworkError::ConnectionFailed(error_msg)
            })?;

        let stream = if let Some(timeout_ms) = self.timeout {
            eprintln!("TCPClient: Connecting with {}ms timeout", timeout_ms);
            tokio::time::timeout(
                std::time::Duration::from_millis(timeout_ms),
                TcpStream::connect(addr)
            ).await
            .map_err(|_| {
                let error_msg = format!("Connection timeout after {}ms to {}:{}", timeout_ms, self.host, self.port);
                eprintln!("TCPClient: {}", error_msg);
                NetworkError::ConnectionFailed(error_msg)
            })?
            .map_err(|e| {
                let error_msg = format_tcp_connection_error(&e, &self.host, self.port);
                eprintln!("TCPClient: {}", error_msg);
                NetworkError::ConnectionFailed(error_msg)
            })?
        } else {
            eprintln!("TCPClient: Connecting without timeout");
            TcpStream::connect(addr).await
                .map_err(|e| {
                    let error_msg = format_tcp_connection_error(&e, &self.host, self.port);
                    eprintln!("TCPClient: {}", error_msg);
                    NetworkError::ConnectionFailed(error_msg)
                })?
        };

        eprintln!("TCPClient: Successfully connected to {}:{}", self.host, self.port);
        self.stream = Some(stream);
        self.connected = true;

        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if let Some(stream) = self.stream.take() {
            drop(stream); // Close the stream
        }
        self.connected = false;
        Ok(())
    }

    async fn send(&mut self, data: &[u8]) -> NetworkResult<usize> {
        match &mut self.stream {
            Some(stream) => {
                stream.write_all(data).await
                    .map_err(|e| NetworkError::SendFailed(e.to_string()))?;
                stream.flush().await
                    .map_err(|e| NetworkError::SendFailed(e.to_string()))?;
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

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        let (tx, rx) = mpsc::channel(1000);

        if let Some(stream) = self.stream.take() {
            let session_id = self.session_id.clone();
            let mut read_stream = stream;

            // Spawn background task to read from stream
            tokio::spawn(async move {
                let mut buffer = [0u8; 8192];

                loop {
                    match read_stream.read(&mut buffer).await {
                        Ok(0) => {
                            // Connection closed
                            let event = NetworkEvent {
                                session_id: session_id.clone(),
                                event_type: "disconnected".to_string(),
                                data: None,
                                error: None,
                                client_id: None,
                                mqtt_topic: None,
                                mqtt_qos: None,
                                mqtt_retain: None,
                                sse_event: None,
                            };
                            let _ = tx.send(event).await;
                            break;
                        }
                        Ok(n) => {
                            // Data received
                            let event = NetworkEvent {
                                session_id: session_id.clone(),
                                event_type: "message".to_string(),
                                data: Some(buffer[..n].to_vec()),
                                error: None,
                                client_id: None,
                                mqtt_topic: None,
                                mqtt_qos: None,
                                mqtt_retain: None,
                                sse_event: None,
                            };
                            if tx.send(event).await.is_err() {
                                break; // Receiver dropped
                            }
                        }
                        Err(e) => {
                            // Error occurred
                            let event = NetworkEvent {
                                session_id: session_id.clone(),
                                event_type: "error".to_string(),
                                data: None,
                                error: Some(e.to_string()),
                                client_id: None,
                                mqtt_topic: None,
                                mqtt_qos: None,
                                mqtt_retain: None,
                                sse_event: None,
                            };
                            let _ = tx.send(event).await;
                            break;
                        }
                    }
                }
            });
        }

        Ok(rx)
    }
}

/// TCP Server implementation
#[derive(Debug)]
pub struct TcpServer {
    session_id: String,
    host: String,
    port: u16,
    listener: Option<TcpListener>,
    clients: Arc<RwLock<HashMap<String, Arc<RwLock<TcpStream>>>>>,
    connected: bool,
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
        })
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
}

#[async_trait]
impl Connection for TcpServer {
    async fn connect(&mut self) -> NetworkResult<()> {
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
        } else {
            eprintln!("TCPServer: Successfully bound to requested port {}", self.port);
        }

        self.listener = Some(listener);
        self.connected = true;

        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if let Some(listener) = self.listener.take() {
            drop(listener);
        }
        
        // Close all client connections
        let mut clients = self.clients.write().await;
        clients.clear();
        
        self.connected = false;
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

        if let Some(listener) = self.listener.take() {
            let session_id = self.session_id.clone();
            let clients = self.clients.clone();

            // Spawn background task to accept connections
            tokio::spawn(async move {
                loop {
                    match listener.accept().await {
                        Ok((stream, addr)) => {
                            let client_id = format!("{}:{}", addr.ip(), addr.port());
                            let stream_arc = Arc::new(RwLock::new(stream));

                            // Add client to the list
                            clients.write().await.insert(client_id.clone(), stream_arc.clone());

                            // Send connection event
                            let event = NetworkEvent {
                                session_id: session_id.clone(),
                                event_type: "connected".to_string(),
                                data: None,
                                error: None,
                                client_id: Some(client_id.clone()),
                                mqtt_topic: None,
                                mqtt_qos: None,
                                mqtt_retain: None,
                                sse_event: None,
                            };
                            if tx.send(event).await.is_err() {
                                break; // Receiver dropped
                            }

                            // Spawn task to handle this client
                            let tx_clone = tx.clone();
                            let session_id_clone = session_id.clone();
                            let clients_clone = clients.clone();
                            let client_id_clone = client_id.clone();

                            tokio::spawn(async move {
                                let mut buffer = [0u8; 8192];

                                loop {
                                    let read_result = {
                                        let mut stream = stream_arc.write().await;
                                        stream.read(&mut buffer).await
                                    };

                                    match read_result {
                                        Ok(0) => {
                                            // Client disconnected
                                            clients_clone.write().await.remove(&client_id_clone);
                                            let event = NetworkEvent {
                                                session_id: session_id_clone.clone(),
                                                event_type: "disconnected".to_string(),
                                                data: None,
                                                error: None,
                                                client_id: Some(client_id_clone.clone()),
                                                mqtt_topic: None,
                                                mqtt_qos: None,
                                                mqtt_retain: None,
                                                sse_event: None,
                                            };
                                            let _ = tx_clone.send(event).await;
                                            break;
                                        }
                                        Ok(n) => {
                                            // Data received from client
                                            let event = NetworkEvent {
                                                session_id: session_id_clone.clone(),
                                                event_type: "message".to_string(),
                                                data: Some(buffer[..n].to_vec()),
                                                error: None,
                                                client_id: Some(client_id_clone.clone()),
                                                mqtt_topic: None,
                                                mqtt_qos: None,
                                                mqtt_retain: None,
                                                sse_event: None,
                                            };
                                            if tx_clone.send(event).await.is_err() {
                                                break; // Receiver dropped
                                            }
                                        }
                                        Err(e) => {
                                            // Error occurred
                                            clients_clone.write().await.remove(&client_id_clone);
                                            let event = NetworkEvent {
                                                session_id: session_id_clone.clone(),
                                                event_type: "error".to_string(),
                                                data: None,
                                                error: Some(e.to_string()),
                                                client_id: Some(client_id_clone.clone()),
                                                mqtt_topic: None,
                                                mqtt_qos: None,
                                                mqtt_retain: None,
                                                sse_event: None,
                                            };
                                            let _ = tx_clone.send(event).await;
                                            break;
                                        }
                                    }
                                }
                            });
                        }
                        Err(e) => {
                            // Error accepting connection
                            let event = NetworkEvent {
                                session_id: session_id.clone(),
                                event_type: "error".to_string(),
                                data: None,
                                error: Some(format!("Accept error: {}", e)),
                                client_id: None,
                                mqtt_topic: None,
                                mqtt_qos: None,
                                mqtt_retain: None,
                                sse_event: None,
                            };
                            let _ = tx.send(event).await;
                        }
                    }
                }
            });
        }

        Ok(rx)
    }
}

#[async_trait]
impl ServerConnection for TcpServer {
    async fn send_to_client(&mut self, client_id: &str, data: &[u8]) -> NetworkResult<usize> {
        let clients = self.clients.read().await;
        if let Some(stream_arc) = clients.get(client_id) {
            let mut stream = stream_arc.write().await;
            stream.write_all(data).await
                .map_err(|e| NetworkError::SendFailed(e.to_string()))?;
            stream.flush().await
                .map_err(|e| NetworkError::SendFailed(e.to_string()))?;
            Ok(data.len())
        } else {
            Err(NetworkError::SendFailed(format!("Client {} not found", client_id)))
        }
    }

    async fn broadcast(&mut self, data: &[u8]) -> NetworkResult<usize> {
        let clients = self.clients.read().await;
        let mut total_sent = 0;

        for (_client_id, stream_arc) in clients.iter() {
            let mut stream = stream_arc.write().await;
            match stream.write_all(data).await {
                Ok(_) => {
                    let _ = stream.flush().await;
                    total_sent += data.len();
                }
                Err(_) => {
                    // Client connection failed, will be cleaned up by the read task
                    continue;
                }
            }
        }

        Ok(total_sent)
    }

    fn get_clients(&self) -> Vec<String> {
        // This is a synchronous method, so we can't use async here
        // We'll need to change this to async or use a different approach
        Vec::new() // Placeholder for now
    }

    async fn disconnect_client(&mut self, client_id: &str) -> NetworkResult<()> {
        let mut clients = self.clients.write().await;
        if let Some(stream_arc) = clients.remove(client_id) {
            // The stream will be dropped, closing the connection
            drop(stream_arc);
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

    match error.kind() {
        std::io::ErrorKind::AddrInUse => {
            // Address in use is retryable - we can try alternative ports
            let msg = format!("{} - Port already in use. Will try alternative ports automatically.", base_msg);
            NetworkError::ConnectionFailed(msg)
        }
        std::io::ErrorKind::PermissionDenied => {
            // Permission denied is permanent - don't retry
            let msg = if port < 1024 {
                format!("{} - Permission denied. Ports below 1024 require administrator privileges. Please run as administrator or use port 8080 or higher.", base_msg)
            } else {
                format!("{} - Permission denied. Please run as administrator or choose a different port.", base_msg)
            };
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
                    if new_port <= 65535 {
                        alternatives.push(new_port);
                    }
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
