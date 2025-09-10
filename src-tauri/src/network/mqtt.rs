use async_trait::async_trait;
use crate::network::{Connection, MqttConnection};
use crate::types::{NetworkResult, NetworkError, NetworkEvent};
use tokio::sync::mpsc;
use std::collections::HashSet;
use rumqttc::{AsyncClient, MqttOptions, Event, Packet, QoS};
use uuid::Uuid;

/// MQTT Client implementation
#[derive(Debug)]
pub struct MqttClient {
    session_id: String,
    broker_url: String,
    client_id: Option<String>,
    username: Option<String>,
    password: Option<String>,
    subscriptions: HashSet<String>,
    connected: bool,
    client: Option<AsyncClient>,
}

impl MqttClient {
    pub fn new(session_id: String, config: serde_json::Value) -> NetworkResult<Self> {
        let host = config.get("host")
            .and_then(|v| v.as_str())
            .unwrap_or("127.0.0.1");
        
        let port = config.get("port")
            .and_then(|v| v.as_u64())
            .unwrap_or(1883) as u16;
        
        let broker_url = format!("mqtt://{}:{}", host, port);
        
        let client_id = config.get("mqttClientId")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        
        let username = config.get("mqttUsername")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        
        let password = config.get("mqttPassword")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        Ok(Self {
            session_id,
            broker_url,
            client_id,
            username,
            password,
            subscriptions: HashSet::new(),
            connected: false,
            client: None,
        })
    }
}

#[async_trait]
impl Connection for MqttClient {
    async fn connect(&mut self) -> NetworkResult<()> {
        if self.connected {
            return Ok(());
        }

        // Parse broker URL to extract host and port
        let url = url::Url::parse(&self.broker_url)
            .map_err(|e| NetworkError::ConnectionFailed(format!("Invalid broker URL: {}", e)))?;

        let host = url.host_str()
            .ok_or_else(|| NetworkError::ConnectionFailed("No host in broker URL".to_string()))?;
        let port = url.port().unwrap_or(1883);

        // Create MQTT options
        let client_id = self.client_id.clone()
            .unwrap_or_else(|| format!("keke-proto-{}", Uuid::new_v4()));

        let mut mqttoptions = MqttOptions::new(client_id, host, port);
        mqttoptions.set_keep_alive(std::time::Duration::from_secs(30));

        if let (Some(username), Some(password)) = (&self.username, &self.password) {
            mqttoptions.set_credentials(username, password);
        }

        // Create client
        let (client, mut eventloop) = AsyncClient::new(mqttoptions, 10);

        // Test connection by polling once
        match eventloop.poll().await {
            Ok(Event::Incoming(Packet::ConnAck(_))) => {
                self.client = Some(client);
                self.connected = true;
                Ok(())
            }
            Ok(_) => {
                // Continue polling until we get ConnAck or error
                self.client = Some(client);
                self.connected = true;
                Ok(())
            }
            Err(e) => {
                Err(NetworkError::ConnectionFailed(format!("MQTT connection failed: {}", e)))
            }
        }
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if !self.connected {
            return Ok(());
        }

        if let Some(client) = &self.client {
            let _ = client.disconnect().await; // Ignore disconnect errors
        }

        self.client = None;
        self.connected = false;
        self.subscriptions.clear();
        Ok(())
    }

    async fn send(&mut self, _data: &[u8]) -> NetworkResult<usize> {
        // For MQTT, send without topic doesn't make sense
        Err(NetworkError::SendFailed("MQTT requires topic for publishing".to_string()))
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    fn status(&self) -> String {
        if self.connected {
            format!("Connected to MQTT broker: {}", self.broker_url)
        } else {
            "Disconnected".to_string()
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        let (tx, rx) = mpsc::channel(1000);

        if let Some(client) = &self.client {
            // Clone client for background task
            let _client_clone = client.clone();
            let session_id = self.session_id.clone();

            // Spawn background task to handle MQTT events
            tokio::spawn(async move {
                // Create new eventloop for receiving
                let mqttoptions = MqttOptions::new("receiver", "localhost", 1883);
                let (_client, mut eventloop) = AsyncClient::new(mqttoptions, 10);

                loop {
                    match eventloop.poll().await {
                        Ok(Event::Incoming(Packet::Publish(publish))) => {
                            let event = NetworkEvent {
                                session_id: session_id.clone(),
                                event_type: "message".to_string(),
                                data: Some(publish.payload.to_vec()),
                                error: None,
                                client_id: None,
                                mqtt_topic: Some(publish.topic.clone()),
                                mqtt_qos: Some(publish.qos as u8),
                                mqtt_retain: Some(publish.retain),
                                sse_event: None,
                            };

                            if tx.send(event).await.is_err() {
                                break; // Channel closed
                            }
                        }
                        Ok(_) => {
                            // Handle other MQTT events if needed
                        }
                        Err(e) => {
                            let error_event = NetworkEvent {
                                session_id: session_id.clone(),
                                event_type: "error".to_string(),
                                data: None,
                                error: Some(format!("MQTT error: {}", e)),
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
        }

        Ok(rx)
    }
}

#[async_trait]
impl MqttConnection for MqttClient {
    async fn subscribe(&mut self, topic: &str, qos: u8) -> NetworkResult<()> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        if let Some(client) = &self.client {
            let mqtt_qos = match qos {
                0 => QoS::AtMostOnce,
                1 => QoS::AtLeastOnce,
                2 => QoS::ExactlyOnce,
                _ => QoS::AtMostOnce,
            };

            client.subscribe(topic, mqtt_qos).await
                .map_err(|e| NetworkError::SendFailed(format!("MQTT subscribe failed: {}", e)))?;

            self.subscriptions.insert(topic.to_string());
            Ok(())
        } else {
            Err(NetworkError::NotConnected)
        }
    }

    async fn unsubscribe(&mut self, topic: &str) -> NetworkResult<()> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        if let Some(client) = &self.client {
            client.unsubscribe(topic).await
                .map_err(|e| NetworkError::SendFailed(format!("MQTT unsubscribe failed: {}", e)))?;

            self.subscriptions.remove(topic);
            Ok(())
        } else {
            Err(NetworkError::NotConnected)
        }
    }

    async fn publish(&mut self, topic: &str, payload: &[u8], qos: u8, retain: bool) -> NetworkResult<()> {
        if !self.connected {
            return Err(NetworkError::NotConnected);
        }

        if let Some(client) = &self.client {
            let mqtt_qos = match qos {
                0 => QoS::AtMostOnce,
                1 => QoS::AtLeastOnce,
                2 => QoS::ExactlyOnce,
                _ => QoS::AtMostOnce,
            };

            client.publish(topic, mqtt_qos, retain, payload).await
                .map_err(|e| NetworkError::SendFailed(format!("MQTT publish failed: {}", e)))?;

            Ok(())
        } else {
            Err(NetworkError::NotConnected)
        }
    }

    fn get_subscriptions(&self) -> Vec<String> {
        self.subscriptions.iter().cloned().collect()
    }
}
