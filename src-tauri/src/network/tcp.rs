use async_trait::async_trait;
use crate::network::{Connection, ServerConnection};
use crate::types::{NetworkResult, NetworkError, NetworkEvent};
use crate::utils::parse_socket_addr;
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
        let addr = parse_socket_addr(&self.host, self.port)
            .map_err(|e| NetworkError::ConnectionFailed(e.to_string()))?;

        let stream = if let Some(timeout_ms) = self.timeout {
            tokio::time::timeout(
                std::time::Duration::from_millis(timeout_ms),
                TcpStream::connect(addr)
            ).await
            .map_err(|_| NetworkError::ConnectionFailed("Connection timeout".to_string()))?
            .map_err(|e| NetworkError::ConnectionFailed(e.to_string()))?
        } else {
            TcpStream::connect(addr).await
                .map_err(|e| NetworkError::ConnectionFailed(e.to_string()))?
        };

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
}

#[async_trait]
impl Connection for TcpServer {
    async fn connect(&mut self) -> NetworkResult<()> {
        let addr = parse_socket_addr(&self.host, self.port)
            .map_err(|e| NetworkError::ConnectionFailed(e.to_string()))?;

        let listener = TcpListener::bind(addr).await
            .map_err(|e| NetworkError::ConnectionFailed(e.to_string()))?;

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

        for (client_id, stream_arc) in clients.iter() {
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
