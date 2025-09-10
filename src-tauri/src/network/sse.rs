use async_trait::async_trait;
use crate::network::Connection;
use crate::types::{NetworkResult, NetworkError, NetworkEvent, SseEvent};
use tokio::sync::mpsc;
use reqwest::Client;
use futures_util::StreamExt;

/// Server-Sent Events Client implementation
#[derive(Debug)]
pub struct SseClient {
    session_id: String,
    url: String,
    event_types: Option<Vec<String>>,
    retry_interval: Option<u64>,
    connected: bool,
    client: Client,
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
            client: Client::new(),
        })
    }
}

#[async_trait]
impl Connection for SseClient {
    async fn connect(&mut self) -> NetworkResult<()> {
        if self.connected {
            return Ok(());
        }

        // Test connection by making a request
        let response = self.client
            .get(&self.url)
            .header("Accept", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .send()
            .await
            .map_err(|e| NetworkError::ConnectionFailed(format!("SSE connection failed: {}", e)))?;

        if response.status().is_success() {
            self.connected = true;
            Ok(())
        } else {
            Err(NetworkError::ConnectionFailed(format!("SSE server returned status: {}", response.status())))
        }
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        self.connected = false;
        Ok(())
    }

    async fn send(&mut self, _data: &[u8]) -> NetworkResult<usize> {
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
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let (tx, rx) = mpsc::channel(1000);

        let client = self.client.clone();
        let url = self.url.clone();
        let session_id = self.session_id.clone();
        let event_types = self.event_types.clone();

        // Spawn background task to handle SSE stream
        tokio::spawn(async move {
            let response = match client
                .get(&url)
                .header("Accept", "text/event-stream")
                .header("Cache-Control", "no-cache")
                .send()
                .await
            {
                Ok(response) => response,
                Err(e) => {
                    let error_event = NetworkEvent {
                        session_id: session_id.clone(),
                        event_type: "error".to_string(),
                        data: None,
                        error: Some(format!("SSE connection error: {}", e)),
                        client_id: None,
                        mqtt_topic: None,
                        mqtt_qos: None,
                        mqtt_retain: None,
                        sse_event: None,
                    };
                    let _ = tx.send(error_event).await;
                    return;
                }
            };

            let mut stream = response.bytes_stream();
            let mut buffer = String::new();

            while let Some(chunk) = stream.next().await {
                match chunk {
                    Ok(bytes) => {
                        if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                            buffer.push_str(&text);

                            // Process complete lines
                            while let Some(line_end) = buffer.find('\n') {
                                let line = buffer[..line_end].trim_end_matches('\r').to_string();
                                buffer = buffer[line_end + 1..].to_string();

                                // Parse SSE format
                                if line.starts_with("data: ") {
                                    let data = &line[6..];

                                    let event = NetworkEvent {
                                        session_id: session_id.clone(),
                                        event_type: "message".to_string(),
                                        data: Some(data.as_bytes().to_vec()),
                                        error: None,
                                        client_id: None,
                                        mqtt_topic: None,
                                        mqtt_qos: None,
                                        mqtt_retain: None,
                                        sse_event: Some(SseEvent {
                                            event_type: Some("message".to_string()),
                                            data: data.to_string(),
                                            id: None,
                                            retry: None,
                                        }),
                                    };

                                    if tx.send(event).await.is_err() {
                                        return; // Channel closed
                                    }
                                } else if line.starts_with("event: ") {
                                    let event_type = &line[7..];

                                    // Filter by event types if specified
                                    if let Some(ref types) = event_types {
                                        if !types.contains(&event_type.to_string()) {
                                            continue;
                                        }
                                    }

                                    let event = NetworkEvent {
                                        session_id: session_id.clone(),
                                        event_type: "event".to_string(),
                                        data: None,
                                        error: None,
                                        client_id: None,
                                        mqtt_topic: None,
                                        mqtt_qos: None,
                                        mqtt_retain: None,
                                        sse_event: Some(SseEvent {
                                            event_type: Some(event_type.to_string()),
                                            data: String::new(),
                                            id: None,
                                            retry: None,
                                        }),
                                    };

                                    if tx.send(event).await.is_err() {
                                        return; // Channel closed
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        let error_event = NetworkEvent {
                            session_id: session_id.clone(),
                            event_type: "error".to_string(),
                            data: None,
                            error: Some(format!("SSE stream error: {}", e)),
                            client_id: None,
                            mqtt_topic: None,
                            mqtt_qos: None,
                            mqtt_retain: None,
                            sse_event: None,
                        };
                        let _ = tx.send(error_event).await;
                        break;
                    }
                }
            }
        });

        Ok(rx)
    }
}
