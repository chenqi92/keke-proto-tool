use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionConfig {
    pub protocol: String,
    pub connection_type: String, // "client" or "server"
    pub host: String,
    pub port: u16,
    pub timeout: Option<u64>,
    pub keep_alive: Option<bool>,
    pub retry_attempts: Option<u32>,
    pub retry_delay: Option<u64>, // Base delay in milliseconds for exponential backoff
    
    // WebSocket specific
    pub websocket_subprotocol: Option<String>,
    pub websocket_extensions: Option<Vec<String>>,
    pub websocket_ping_interval: Option<u64>,
    pub websocket_max_message_size: Option<usize>,
    pub websocket_compression_enabled: Option<bool>,
    
    // MQTT specific
    pub mqtt_topic: Option<String>,
    pub mqtt_client_id: Option<String>,
    pub mqtt_username: Option<String>,
    pub mqtt_password: Option<String>,
    pub mqtt_clean_session: Option<bool>,
    pub mqtt_keep_alive: Option<u16>,
    pub mqtt_will: Option<MqttWill>,
    
    // SSE specific
    pub sse_event_types: Option<Vec<String>>,
    pub sse_retry_interval: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MqttWill {
    pub topic: String,
    pub payload: String,
    pub qos: u8,
    pub retain: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting(u32), // Retry attempt number
    TimedOut,
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkEvent {
    pub session_id: String,
    pub event_type: String, // "connected", "disconnected", "message", "error", "sse_event"
    pub data: Option<Vec<u8>>,
    pub error: Option<String>,
    pub client_id: Option<String>, // For server connections
    pub mqtt_topic: Option<String>,
    pub mqtt_qos: Option<u8>,
    pub mqtt_retain: Option<bool>,
    pub sse_event: Option<SseEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SseEvent {
    pub event_type: Option<String>,
    pub data: String,
    pub id: Option<String>,
    pub retry: Option<u64>,
}

#[derive(Debug, Clone)]
pub enum Protocol {
    Tcp,
    Udp,
    WebSocket,
    Mqtt,
    Sse,
}

impl From<&str> for Protocol {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "tcp" => Protocol::Tcp,
            "udp" => Protocol::Udp,
            "websocket" | "ws" => Protocol::WebSocket,
            "mqtt" => Protocol::Mqtt,
            "sse" => Protocol::Sse,
            _ => Protocol::Tcp, // Default fallback
        }
    }
}

#[derive(Debug, Clone)]
pub enum ConnectionType {
    Client,
    Server,
}

impl From<&str> for ConnectionType {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "server" => ConnectionType::Server,
            _ => ConnectionType::Client,
        }
    }
}

// Error types
#[derive(Debug, thiserror::Error)]
pub enum NetworkError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Connection failed (non-retryable): {0}")]
    ConnectionFailedPermanent(String),

    #[error("Send failed: {0}")]
    SendFailed(String),

    #[error("Receive failed: {0}")]
    #[allow(dead_code)]
    ReceiveFailed(String),

    #[error("Protocol error: {0}")]
    #[allow(dead_code)]
    ProtocolError(String),

    #[error("Session not found: {0}")]
    SessionNotFound(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Not connected")]
    NotConnected,

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

impl NetworkError {
    /// Check if this error should prevent retries
    pub fn is_permanent(&self) -> bool {
        matches!(self, NetworkError::ConnectionFailedPermanent(_))
    }
}

pub type NetworkResult<T> = Result<T, NetworkError>;
