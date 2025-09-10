use async_trait::async_trait;
use crate::network::Connection;
use crate::types::{NetworkResult, NetworkError, NetworkEvent};
use tokio::sync::mpsc;

/// Server-Sent Events Client implementation
#[derive(Debug)]
pub struct SseClient {
    session_id: String,
    url: String,
    event_types: Option<Vec<String>>,
    retry_interval: Option<u64>,
    connected: bool,
}

impl SseClient {
    pub fn new(session_id: String, config: serde_json::Value) -> NetworkResult<Self> {
        let host = config.get("host")
            .and_then(|v| v.as_str())
            .unwrap_or("127.0.0.1");
        
        let port = config.get("port")
            .and_then(|v| v.as_u64())
            .unwrap_or(8080) as u16;
        
        let url = format!("http://{}:{}/events", host, port);
        
        let event_types = config.get("sseEventTypes")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(|s| s.to_string())
                    .collect()
            });
        
        let retry_interval = config.get("sseRetryInterval")
            .and_then(|v| v.as_u64());

        Ok(Self {
            session_id,
            url,
            event_types,
            retry_interval,
            connected: false,
        })
    }
}

#[async_trait]
impl Connection for SseClient {
    async fn connect(&mut self) -> NetworkResult<()> {
        // TODO: Implement SSE client connection
        self.connected = true;
        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        // TODO: Implement SSE client disconnection
        self.connected = false;
        Ok(())
    }

    async fn send(&mut self, data: &[u8]) -> NetworkResult<usize> {
        // SSE is read-only, sending is not supported
        Err(NetworkError::SendFailed("SSE is a read-only protocol".to_string()))
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    fn status(&self) -> String {
        if self.connected {
            format!("Connected to SSE stream: {}", self.url)
        } else {
            "Disconnected".to_string()
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        let (tx, rx) = mpsc::channel(1000);
        // TODO: Implement SSE event receiving
        Ok(rx)
    }
}
