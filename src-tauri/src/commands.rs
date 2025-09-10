use crate::session::SessionManager;
use crate::types::SessionConfig;
use crate::utils::{validate_port, is_common_port};
use tauri::State;

/// Get application version
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Connect a session with the given configuration
#[tauri::command]
pub async fn connect_session(
    session_id: String,
    config: SessionConfig,
    session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    // Validate port before creating session
    if let Err(port_error) = validate_port(config.port) {
        return Err(format!("Invalid port configuration: {}", port_error));
    }

    // Warn about common ports
    if let Some(service) = is_common_port(config.port) {
        eprintln!("Warning: Port {} is commonly used by {} service", config.port, service);
    }

    // Create session if it doesn't exist
    if let Err(e) = session_manager.create_session(session_id.clone(), config) {
        // If session already exists, check if it's already connected
        if e.to_string().contains("already exists") {
            // Check if the session is already connected
            if session_manager.is_session_connected(&session_id) {
                eprintln!("Session {} is already connected, skipping connection attempt", session_id);
                return Ok(true);
            }
        } else {
            return Err(format!("Failed to create session: {}", e));
        }
    }

    // Connect the session
    match session_manager.connect_session(&session_id).await {
        Ok(result) => Ok(result),
        Err(e) => {
            let error_msg = e.to_string();
            // Provide more helpful error messages
            if error_msg.contains("10013") {
                Err(format!("Connection failed: Access denied (Windows error 10013). Try running as administrator or use a port >= 1024. Original error: {}", error_msg))
            } else if error_msg.contains("invalid socket address syntax") {
                Err(format!("Connection failed: Invalid address format. Please check the host and port values. Original error: {}", error_msg))
            } else {
                Err(format!("Connection failed: {}", error_msg))
            }
        }
    }
}

/// Disconnect a session
#[tauri::command]
pub async fn disconnect_session(
    session_id: String,
    session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    match session_manager.disconnect_session(&session_id).await {
        Ok(result) => Ok(result),
        Err(e) => Err(e.to_string()),
    }
}

/// Send a message through a session
#[tauri::command]
pub async fn send_message(
    session_id: String,
    data: Vec<u8>,
    session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    match session_manager.send_message(&session_id, &data).await {
        Ok(result) => Ok(result),
        Err(e) => Err(e.to_string()),
    }
}

/// Send a message to a specific client (server mode)
#[tauri::command]
pub async fn send_to_client(
    _session_id: String,
    _client_id: String,
    _data: Vec<u8>,
    _session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    // TODO: Implement server-specific functionality
    // For now, return an error indicating this needs implementation
    Err("Server functionality not yet implemented".to_string())
}

/// Broadcast a message to all clients (server mode)
#[tauri::command]
pub async fn broadcast_message(
    _session_id: String,
    _data: Vec<u8>,
    _session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    // TODO: Implement server-specific functionality
    // For now, return an error indicating this needs implementation
    Err("Server functionality not yet implemented".to_string())
}

/// Cancel ongoing connection attempt
#[tauri::command]
pub async fn cancel_connection(
    session_id: String,
    session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    match session_manager.cancel_connection(&session_id).await {
        Ok(result) => Ok(result),
        Err(e) => Err(e.to_string()),
    }
}

/// Send UDP message to specific address
#[tauri::command]
pub async fn send_udp_message(
    _session_id: String,
    _data: Vec<u8>,
    _target_host: String,
    _target_port: u16,
    _session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    // TODO: Implement UDP-specific functionality
    // For now, return an error indicating this needs implementation
    Err("UDP functionality not yet implemented".to_string())
}

/// Subscribe to an MQTT topic
#[tauri::command]
pub async fn subscribe_mqtt_topic(
    _session_id: String,
    _topic: String,
    _qos: u8,
    _session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    // TODO: Implement MQTT-specific functionality
    // For now, return an error indicating this needs implementation
    Err("MQTT functionality not yet implemented".to_string())
}

/// Unsubscribe from an MQTT topic
#[tauri::command]
pub async fn unsubscribe_mqtt_topic(
    _session_id: String,
    _topic: String,
    _session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    // TODO: Implement MQTT-specific functionality
    // For now, return an error indicating this needs implementation
    Err("MQTT functionality not yet implemented".to_string())
}

/// Publish an MQTT message
#[tauri::command]
pub async fn publish_mqtt_message(
    _session_id: String,
    _topic: String,
    _payload: Vec<u8>,
    _qos: u8,
    _retain: bool,
    _dup: bool,
    _session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    // TODO: Implement MQTT-specific functionality
    // For now, return an error indicating this needs implementation
    Err("MQTT functionality not yet implemented".to_string())
}
