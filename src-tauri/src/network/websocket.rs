use async_trait::async_trait;
use crate::network::{Connection, ServerConnection};
use crate::types::{NetworkResult, NetworkError, NetworkEvent};
use tokio::sync::mpsc;
use tokio_tungstenite::{connect_async, accept_async, WebSocketStream, MaybeTlsStream};
use tokio_tungstenite::tungstenite::Message;
use tokio::net::{TcpListener, TcpStream};
use url::Url;
use std::collections::HashMap;
use std::sync::Arc;
use std::io::ErrorKind;
use tokio::sync::RwLock;
use futures_util::{SinkExt, StreamExt};

/// Format WebSocket server binding error with Windows-specific guidance
fn format_websocket_bind_error(error: &std::io::Error, host: &str, port: u16) -> String {
    let base_msg = format!("Failed to bind WebSocket server to {}:{}", host, port);

    match error.kind() {
        ErrorKind::PermissionDenied => {
            #[cfg(target_os = "windows")]
            {
                format!("{} - Permission denied (Windows Error 10013). This usually means:\n\
                    1. Port {} is already in use by another application\n\
                    2. You need administrator privileges to bind to this port\n\
                    3. Windows Firewall is blocking the port\n\
                    \nSuggestions:\n\
                    - Try a different port (e.g., 8081, 8082, 9000)\n\
                    - Run the application as administrator\n\
                    - Check if another service is using port {} (netstat -an | findstr :{})\n\
                    - Configure Windows Firewall to allow the application",
                    base_msg, port, port, port)
            }
            #[cfg(not(target_os = "windows"))]
            {
                format!("{} - Permission denied. Try using a port number above 1024 or run with elevated privileges.", base_msg)
            }
        }
        ErrorKind::AddrInUse => {
            format!("{} - Address already in use. Port {} is being used by another application. Try a different port.", base_msg, port)
        }
        ErrorKind::AddrNotAvailable => {
            format!("{} - Address not available. The host address '{}' is not valid on this system.", base_msg, host)
        }
        _ => {
            format!("{} - {}", base_msg, error)
        }
    }
}

/// WebSocket Client implementation
pub struct WebSocketClient {
    session_id: String,
    url: String,
    subprotocol: Option<String>,
    ws_stream: Option<WebSocketStream<MaybeTlsStream<TcpStream>>>,
    connected: bool,
}

impl std::fmt::Debug for WebSocketClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("WebSocketClient")
            .field("session_id", &self.session_id)
            .field("url", &self.url)
            .field("subprotocol", &self.subprotocol)
            .field("connected", &self.connected)
            .finish()
    }
}

impl WebSocketClient {
    pub fn new(session_id: String, config: serde_json::Value) -> NetworkResult<Self> {
        let host = config.get("host")
            .and_then(|v| v.as_str())
            .unwrap_or("127.0.0.1");
        
        let port = config.get("port")
            .and_then(|v| v.as_u64())
            .unwrap_or(8080) as u16;
        
        let url = format!("ws://{}:{}", host, port);
        
        let subprotocol = config.get("websocketSubprotocol")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        Ok(Self {
            session_id,
            url,
            subprotocol,
            ws_stream: None,
            connected: false,
        })
    }
}

#[async_trait]
impl Connection for WebSocketClient {
    async fn connect(&mut self) -> NetworkResult<()> {
        if self.connected {
            return Ok(());
        }

        let url = Url::parse(&self.url)
            .map_err(|e| NetworkError::ConnectionFailed(format!("Invalid WebSocket URL: {}", e)))?;

        let (ws_stream, _response) = connect_async(url).await
            .map_err(|e| NetworkError::ConnectionFailed(format!("WebSocket connection failed: {}", e)))?;

        self.ws_stream = Some(ws_stream);
        self.connected = true;
        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if !self.connected {
            return Ok(());
        }

        if let Some(mut ws_stream) = self.ws_stream.take() {
            let _ = ws_stream.close(None).await; // Ignore close errors
        }

        self.connected = false;
        Ok(())
    }

    async fn send(&mut self, data: &[u8]) -> NetworkResult<usize> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let ws_stream = self.ws_stream.as_mut()
            .ok_or(NetworkError::NotConnected)?;

        // Try to send as text first, fall back to binary if it's not valid UTF-8
        let message = if let Ok(text) = std::str::from_utf8(data) {
            Message::Text(text.to_string())
        } else {
            Message::Binary(data.to_vec())
        };

        ws_stream.send(message).await
            .map_err(|e| NetworkError::SendFailed(format!("WebSocket send failed: {}", e)))?;

        Ok(data.len())
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    fn status(&self) -> String {
        if self.connected {
            format!("Connected to {}", self.url)
        } else {
            "Disconnected".to_string()
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let (tx, rx) = mpsc::channel(1000);

        // Take the WebSocket stream for the background task
        let mut ws_stream = self.ws_stream.take()
            .ok_or(NetworkError::NotConnected)?;

        let session_id = self.session_id.clone();

        // Spawn background task for receiving messages
        tokio::spawn(async move {
            while let Some(msg_result) = ws_stream.next().await {
                match msg_result {
                    Ok(message) => {
                        let data = match message {
                            Message::Text(text) => text.into_bytes(),
                            Message::Binary(bytes) => bytes,
                            Message::Close(_) => {
                                // Connection closed
                                break;
                            }
                            Message::Ping(_) | Message::Pong(_) => {
                                // Handle ping/pong automatically, don't send to application
                                continue;
                            }
                            Message::Frame(_) => {
                                // Raw frames are not typically handled at application level
                                continue;
                            }
                        };

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
                            error: Some(format!("WebSocket receive error: {}", e)),
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

/// WebSocket Server implementation
pub struct WebSocketServer {
    session_id: String,
    host: String,
    port: u16,
    listener: Option<TcpListener>,
    clients: Arc<RwLock<HashMap<String, Arc<RwLock<WebSocketStream<TcpStream>>>>>>,
    connected: bool,
}

impl std::fmt::Debug for WebSocketServer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("WebSocketServer")
            .field("session_id", &self.session_id)
            .field("host", &self.host)
            .field("port", &self.port)
            .field("connected", &self.connected)
            .finish()
    }
}

impl WebSocketServer {
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
}

#[async_trait]
impl Connection for WebSocketServer {
    async fn connect(&mut self) -> NetworkResult<()> {
        if self.connected {
            return Ok(());
        }

        let bind_addr = format!("{}:{}", self.host, self.port);
        eprintln!("WebSocketServer: Attempting to bind to {}", bind_addr);

        let listener = TcpListener::bind(&bind_addr).await
            .map_err(|e| {
                let error_msg = format_websocket_bind_error(&e, &self.host, self.port);
                eprintln!("WebSocketServer: Bind failed - {}", error_msg);
                NetworkError::ConnectionFailed(error_msg)
            })?;

        eprintln!("WebSocketServer: Successfully bound to {}", bind_addr);
        self.listener = Some(listener);
        self.connected = true;
        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if !self.connected {
            return Ok(());
        }

        // Close all client connections
        {
            let mut clients = self.clients.write().await;
            for (_, client_stream) in clients.drain() {
                let mut stream = client_stream.write().await;
                let _ = stream.close(None).await; // Ignore close errors
            }
        }

        self.listener = None;
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
            format!("WebSocket server listening on {}:{}", self.host, self.port)
        } else {
            "Not listening".to_string()
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let (tx, rx) = mpsc::channel(1000);

        // Take the listener for the background task
        let listener = self.listener.take()
            .ok_or(NetworkError::NotConnected)?;

        let session_id = self.session_id.clone();
        let clients = Arc::clone(&self.clients);

        // Spawn background task for accepting connections
        tokio::spawn(async move {
            while let Ok((stream, addr)) = listener.accept().await {
                let client_id = addr.to_string();
                let tx_clone = tx.clone();
                let session_id_clone = session_id.clone();
                let clients_clone = Arc::clone(&clients);

                // Spawn task for each client connection
                tokio::spawn(async move {
                    match accept_async(stream).await {
                        Ok(ws_stream) => {
                            // Add client to the clients map
                            {
                                let mut clients_guard = clients_clone.write().await;
                                clients_guard.insert(client_id.clone(), Arc::new(RwLock::new(ws_stream)));
                            }

                            // Handle client messages (simplified for now)
                            // In a full implementation, we'd need to handle the message loop here
                        }
                        Err(e) => {
                            let _ = tx_clone.send(NetworkEvent {
                                session_id: session_id_clone,
                                event_type: "error".to_string(),
                                data: None,
                                error: Some(format!("WebSocket handshake failed for {}: {}", client_id, e)),
                                client_id: Some(client_id),
                                mqtt_topic: None,
                                mqtt_qos: None,
                                mqtt_retain: None,
                                sse_event: None,
                            }).await;
                        }
                    }
                });
            }
        });

        Ok(rx)
    }
}

#[async_trait]
impl ServerConnection for WebSocketServer {
    async fn send_to_client(&mut self, client_id: &str, data: &[u8]) -> NetworkResult<usize> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let clients = self.clients.read().await;
        if let Some(client_stream) = clients.get(client_id) {
            let mut stream = client_stream.write().await;

            // Try to send as text first, fall back to binary if it's not valid UTF-8
            let message = if let Ok(text) = std::str::from_utf8(data) {
                Message::Text(text.to_string())
            } else {
                Message::Binary(data.to_vec())
            };

            stream.send(message).await
                .map_err(|e| NetworkError::SendFailed(format!("WebSocket send to client failed: {}", e)))?;

            Ok(data.len())
        } else {
            Err(NetworkError::SendFailed(format!("Client {} not found", client_id)))
        }
    }

    async fn broadcast(&mut self, data: &[u8]) -> NetworkResult<usize> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let clients = self.clients.read().await;
        if clients.is_empty() {
            return Ok(0);
        }

        // Try to send as text first, fall back to binary if it's not valid UTF-8
        let message = if let Ok(text) = std::str::from_utf8(data) {
            Message::Text(text.to_string())
        } else {
            Message::Binary(data.to_vec())
        };

        let mut total_sent = 0;
        for (client_id, client_stream) in clients.iter() {
            let mut stream = client_stream.write().await;
            match stream.send(message.clone()).await {
                Ok(_) => total_sent += data.len(),
                Err(e) => {
                    // Log error but continue with other clients
                    eprintln!("Failed to send to WebSocket client {}: {}", client_id, e);
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

    async fn disconnect_client(&mut self, client_id: &str) -> NetworkResult<()> {
        let mut clients = self.clients.write().await;
        if let Some(client_stream) = clients.remove(client_id) {
            let mut stream = client_stream.write().await;
            let _ = stream.close(None).await; // Ignore close errors
        }
        Ok(())
    }
}
