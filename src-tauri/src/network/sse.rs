use async_trait::async_trait;
use crate::network::Connection;
use crate::types::{NetworkResult, NetworkError, NetworkEvent, SseEvent};
use tokio::sync::mpsc;
use reqwest::{Client, StatusCode};
use futures_util::StreamExt;

/// Format SSE connection error with helpful guidance
fn format_sse_error(status: StatusCode, url: &str) -> (String, bool) {
    let should_retry = match status {
        StatusCode::SERVICE_UNAVAILABLE => {
            (format!("SSE server at {} is unavailable (503 Service Unavailable). \
                This usually means:\n\
                1. The SSE server is not running\n\
                2. The server is temporarily overloaded\n\
                3. The endpoint '/events' does not exist\n\
                \nSuggestions:\n\
                - Verify the SSE server is running on the specified host and port\n\
                - Check if the endpoint path is correct (default: /events)\n\
                - Try connecting to the base URL in a browser to verify the server is accessible", url), false)
        }
        StatusCode::NOT_FOUND => {
            (format!("SSE endpoint not found (404). The URL {} does not exist. \
                Check if the endpoint path is correct.", url), false)
        }
        StatusCode::FORBIDDEN => {
            (format!("Access forbidden (403) to SSE endpoint {}. \
                Check authentication or server permissions.", url), false)
        }
        StatusCode::UNAUTHORIZED => {
            (format!("Unauthorized access (401) to SSE endpoint {}. \
                Authentication may be required.", url), true)
        }
        StatusCode::INTERNAL_SERVER_ERROR => {
            (format!("SSE server internal error (500) at {}. \
                The server encountered an error processing the request.", url), true)
        }
        StatusCode::BAD_GATEWAY | StatusCode::GATEWAY_TIMEOUT => {
            (format!("Gateway error ({}) connecting to SSE server at {}. \
                There may be a proxy or load balancer issue.", status, url), true)
        }
        _ => {
            (format!("SSE server returned unexpected status {} for URL {}. \
                Check server logs for more details.", status, url), status.is_server_error())
        }
    };
    should_retry
}

/// Server-Sent Events Client implementation
#[derive(Debug)]
pub struct SseClient {
    session_id: String,
    url: String,
    event_types: Option<Vec<String>>,
    #[allow(dead_code)]
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

        eprintln!("SSEClient: Attempting to connect to {}", self.url);

        // Test connection by making a request
        let response = self.client
            .get(&self.url)
            .header("Accept", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .send()
            .await
            .map_err(|e| {
                let error_msg = format!("SSE connection failed to {}: {}. \
                    This could be due to:\n\
                    1. Network connectivity issues\n\
                    2. The server is not running\n\
                    3. Firewall blocking the connection\n\
                    4. Invalid URL or hostname", self.url, e);
                eprintln!("SSEClient: {}", error_msg);
                NetworkError::ConnectionFailed(error_msg)
            })?;

        let status = response.status();
        if status.is_success() {
            eprintln!("SSEClient: Successfully connected to {}", self.url);
            self.connected = true;
            Ok(())
        } else {
            let (error_msg, should_retry) = format_sse_error(status, &self.url);
            eprintln!("SSEClient: Connection failed - {}", error_msg);

            // Use permanent error for non-retryable cases (like 404, 503)
            if should_retry {
                Err(NetworkError::ConnectionFailed(error_msg))
            } else {
                Err(NetworkError::ConnectionFailedPermanent(error_msg))
            }
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

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}
