use async_trait::async_trait;
use crate::types::{NetworkResult, NetworkEvent};
use tokio::sync::mpsc;

pub use connection_manager::ConnectionManager;

pub mod tcp;
pub mod udp;
pub mod websocket;
pub mod mqtt;
pub mod sse;
pub mod connection_manager;

/// Core connection trait that all network protocols must implement
#[async_trait]
#[allow(dead_code)]
pub trait Connection: Send + Sync + std::fmt::Debug {
    /// Connect to the remote endpoint or start listening (for servers)
    async fn connect(&mut self) -> NetworkResult<()>;
    
    /// Disconnect from the remote endpoint or stop listening
    async fn disconnect(&mut self) -> NetworkResult<()>;
    
    /// Send data through the connection
    async fn send(&mut self, data: &[u8]) -> NetworkResult<usize>;
    
    /// Check if the connection is active
    fn is_connected(&self) -> bool;
    
    /// Get the connection status
    fn status(&self) -> String;
    
    /// Start receiving data (returns a receiver for incoming events)
    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>>;

    /// Get the actual port being used (for servers that might bind to alternative ports)
    fn get_actual_port(&self) -> Option<u16> {
        None // Default implementation returns None
    }

    /// Get mutable reference to Any for downcasting
    fn as_any_mut(&mut self) -> &mut dyn std::any::Any;
}

/// Server-specific connection trait for protocols that support server mode
#[async_trait]
#[allow(dead_code)]
pub trait ServerConnection: Connection {
    /// Send data to a specific client (for server connections)
    async fn send_to_client(&mut self, client_id: &str, data: &[u8]) -> NetworkResult<usize>;
    
    /// Broadcast data to all connected clients
    async fn broadcast(&mut self, data: &[u8]) -> NetworkResult<usize>;
    
    /// Get list of connected clients
    fn get_clients(&self) -> Vec<String>;
    
    /// Disconnect a specific client
    async fn disconnect_client(&mut self, client_id: &str) -> NetworkResult<()>;
}

/// UDP-specific connection trait for datagram operations
#[async_trait]
#[allow(dead_code)]
pub trait UdpConnection: Connection {
    /// Send UDP datagram to a specific address
    async fn send_to(&mut self, data: &[u8], host: &str, port: u16) -> NetworkResult<usize>;
}

/// MQTT-specific connection trait for pub/sub operations
#[async_trait]
#[allow(dead_code)]
pub trait MqttConnection: Connection {
    /// Subscribe to an MQTT topic
    async fn subscribe(&mut self, topic: &str, qos: u8) -> NetworkResult<()>;
    
    /// Unsubscribe from an MQTT topic
    async fn unsubscribe(&mut self, topic: &str) -> NetworkResult<()>;
    
    /// Publish a message to an MQTT topic
    async fn publish(&mut self, topic: &str, payload: &[u8], qos: u8, retain: bool) -> NetworkResult<()>;
    
    /// Get list of subscribed topics
    fn get_subscriptions(&self) -> Vec<String>;
}

/// Connection factory for creating protocol-specific connections
pub struct ConnectionFactory;

impl ConnectionFactory {
    pub fn create_connection(
        session_id: String,
        protocol: &str,
        connection_type: &str,
        config: serde_json::Value,
        app_handle: Option<tauri::AppHandle>,
    ) -> NetworkResult<Box<dyn Connection>> {
        match protocol.to_lowercase().as_str() {
            "tcp" => {
                if connection_type == "server" {
                    Ok(Box::new(tcp::TcpServer::new(session_id, config)?))
                } else {
                    Ok(Box::new(tcp::TcpClient::new(session_id, config, app_handle)?))
                }
            }
            "udp" => {
                if connection_type == "server" {
                    Ok(Box::new(udp::UdpServer::new(session_id, config)?))
                } else {
                    Ok(Box::new(udp::UdpClient::new(session_id, config)?))
                }
            }
            "websocket" | "ws" => {
                if connection_type == "server" {
                    Ok(Box::new(websocket::WebSocketServer::new(session_id, config)?))
                } else {
                    Ok(Box::new(websocket::WebSocketClient::new(session_id, config)?))
                }
            }
            "mqtt" => {
                Ok(Box::new(mqtt::MqttClient::new(session_id, config)?))
            }
            "sse" => {
                Ok(Box::new(sse::SseClient::new(session_id, config)?))
            }
            _ => Err(crate::types::NetworkError::InvalidConfig(
                format!("Unsupported protocol: {}", protocol)
            )),
        }
    }
}
