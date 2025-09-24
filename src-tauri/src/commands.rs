use crate::session::SessionManager;
use crate::types::SessionConfig;
use crate::utils::{validate_port, is_common_port};
use crate::parser::{ProtocolParser, get_parser_registry, Parser};
use tauri::{State, AppHandle, Theme, Manager};
use tauri::window::Color;
use serde::{Deserialize, Serialize};

/// Get application version
#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// GitHub Release information
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubRelease {
    pub tag_name: String,
    pub name: String,
    pub body: String,
    pub html_url: String,
    pub published_at: String,
    pub prerelease: bool,
    pub draft: bool,
    pub assets: Vec<GitHubAsset>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubAsset {
    pub name: String,
    pub browser_download_url: String,
    pub size: u64,
    pub download_count: u64,
}

/// Check for updates from GitHub
#[tauri::command]
pub async fn check_for_updates(
    repository_owner: String,
    repository_name: String,
    include_prerelease: Option<bool>,
) -> Result<GitHubRelease, String> {
    let include_prerelease = include_prerelease.unwrap_or(false);

    let url = if include_prerelease {
        format!("https://api.github.com/repos/{}/{}/releases", repository_owner, repository_name)
    } else {
        format!("https://api.github.com/repos/{}/{}/releases/latest", repository_owner, repository_name)
    };

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Accept", "application/vnd.github.v3+json")
        .header("User-Agent", "ProtoTool-UpdateChecker")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch release information: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API error: {}", response.status()));
    }

    let releases: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // If fetching all releases, find the latest non-draft release
    let release_data = if include_prerelease {
        if let Some(releases_array) = releases.as_array() {
            releases_array
                .iter()
                .find(|r| !r["draft"].as_bool().unwrap_or(true) &&
                         (include_prerelease || !r["prerelease"].as_bool().unwrap_or(false)))
                .ok_or("No suitable release found")?
        } else {
            return Err("Invalid response format".to_string());
        }
    } else {
        &releases
    };

    let release: GitHubRelease = serde_json::from_value(release_data.clone())
        .map_err(|e| format!("Failed to parse release data: {}", e))?;

    Ok(release)
}

/// Get current application version info
#[tauri::command]
pub fn get_version_info() -> Result<serde_json::Value, String> {
    let version = env!("CARGO_PKG_VERSION");
    let name = env!("CARGO_PKG_NAME");
    let description = env!("CARGO_PKG_DESCRIPTION");

    Ok(serde_json::json!({
        "version": version,
        "name": name,
        "description": description,
        "build_date": "unknown", // We'll implement proper build date later
    }))
}

/// Check if there's an internal TCP server listening on the specified host and port
#[tauri::command]
pub fn has_internal_tcp_server(
    host: String,
    port: u16,
    session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    Ok(session_manager.has_internal_tcp_server(&host, port))
}

/// Get all active TCP server sessions
#[tauri::command]
pub fn get_active_tcp_servers(
    session_manager: State<'_, SessionManager>,
) -> Result<Vec<(String, String, u16)>, String> {
    Ok(session_manager.get_active_tcp_servers())
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

    // Create session if it doesn't exist, or update existing session with new config
    match session_manager.create_session(session_id.clone(), config.clone()).await {
        Err(e) => {
            // If session already exists, update its configuration
            if e.to_string().contains("already exists") {
                eprintln!("Session {} already exists, updating configuration", session_id);

                // Update the session configuration
                match session_manager.update_session_config(&session_id, config).await {
                    Ok(_) => {
                        eprintln!("Session {} configuration updated successfully", session_id);

                        // Check if the session is already connected with the same config
                        if session_manager.is_session_connected(&session_id) {
                            eprintln!("Session {} is already connected, checking if reconnection is needed", session_id);
                            // For now, we'll disconnect and reconnect to ensure new config is applied
                            // This is safer than trying to determine if the config change requires reconnection
                            match session_manager.disconnect_session(&session_id).await {
                                Ok(_) => eprintln!("Session {} disconnected for config update", session_id),
                                Err(e) => eprintln!("Warning: Failed to disconnect session {} for config update: {}", session_id, e),
                            }
                        }
                    }
                    Err(e) => {
                        return Err(format!("Failed to update session configuration: {}", e));
                    }
                }
            } else {
                return Err(format!("Failed to create session: {}", e));
            }
        }
        Ok(_) => {
            // Session created successfully
            eprintln!("Session {} created successfully", session_id);
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
    session_id: String,
    client_id: String,
    data: Vec<u8>,
    session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    match session_manager.send_to_client(&session_id, &client_id, &data).await {
        Ok(result) => Ok(result),
        Err(e) => Err(e.to_string()),
    }
}

/// Broadcast a message to all clients (server mode)
#[tauri::command]
pub async fn broadcast_message(
    session_id: String,
    data: Vec<u8>,
    session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    match session_manager.broadcast_message(&session_id, &data).await {
        Ok(result) => Ok(result),
        Err(e) => Err(e.to_string()),
    }
}

/// Disconnect a specific client (server mode)
#[tauri::command]
pub async fn disconnect_client(
    session_id: String,
    client_id: String,
    session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    match session_manager.disconnect_client(&session_id, &client_id).await {
        Ok(result) => Ok(result),
        Err(e) => Err(e.to_string()),
    }
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
    session_id: String,
    data: Vec<u8>,
    target_host: String,
    target_port: u16,
    session_manager: State<'_, SessionManager>,
) -> Result<bool, String> {
    match session_manager.send_udp_message(&session_id, &data, &target_host, target_port).await {
        Ok(result) => Ok(result),
        Err(e) => Err(e.to_string()),
    }
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



// ============================================================================
// PARSING COMMANDS
// ============================================================================

/// Load a protocol rule from file
#[tauri::command]
pub async fn load_protocol_rule(rule_file_path: String) -> Result<String, String> {
    match ProtocolParser::from_rule_file("temp".to_string(), &rule_file_path) {
        Ok(parser) => {
            let info = parser.get_protocol_info();
            Ok(serde_json::to_string(&info).unwrap_or_default())
        }
        Err(e) => Err(format!("Failed to load protocol rule: {}", e)),
    }
}

/// Load a protocol rule from YAML string
#[tauri::command]
pub async fn load_protocol_rule_from_string(rule_content: String) -> Result<String, String> {
    match ProtocolParser::from_rule_string("temp".to_string(), &rule_content) {
        Ok(parser) => {
            let info = parser.get_protocol_info();
            Ok(serde_json::to_string(&info).unwrap_or_default())
        }
        Err(e) => Err(format!("Failed to load protocol rule: {}", e)),
    }
}

/// Parse data using a specific protocol rule
#[tauri::command]
pub async fn parse_data_with_rule(
    data: Vec<u8>,
    rule_content: String,
    parser_id: Option<String>,
) -> Result<String, String> {
    let id = parser_id.unwrap_or_else(|| "temp".to_string());

    match ProtocolParser::from_rule_string(id, &rule_content) {
        Ok(parser) => {
            match parser.parse(&data) {
                Ok(result) => {
                    Ok(serde_json::to_string(&result).unwrap_or_default())
                }
                Err(e) => Err(format!("Failed to parse data: {}", e)),
            }
        }
        Err(e) => Err(format!("Failed to create parser: {}", e)),
    }
}

/// Parse data with auto-detection
#[tauri::command]
pub async fn parse_data_auto(data: Vec<u8>) -> Result<String, String> {
    let registry = get_parser_registry();
    let result = {
        let guard = registry.read().unwrap();
        guard.parse_auto(&data)
    };

    match result {
        Ok(result) => {
            Ok(serde_json::to_string(&result).unwrap_or_default())
        }
        Err(e) => Err(format!("Failed to parse data: {}", e)),
    }
}

/// Validate parsed data
#[tauri::command]
pub async fn validate_parsed_data(
    data: Vec<u8>,
    rule_content: String,
) -> Result<String, String> {
    match ProtocolParser::from_rule_string("temp".to_string(), &rule_content) {
        Ok(parser) => {
            match parser.parse(&data) {
                Ok(result) => {
                    let validation_report = parser.validate(&result);
                    Ok(serde_json::to_string(&validation_report).unwrap_or_default())
                }
                Err(e) => Err(format!("Failed to parse data for validation: {}", e)),
            }
        }
        Err(e) => Err(format!("Failed to create parser: {}", e)),
    }
}

/// Get list of available parsers
#[tauri::command]
pub async fn get_available_parsers() -> Result<Vec<String>, String> {
    let registry = get_parser_registry();
    let parser_ids = {
        let guard = registry.read().unwrap();
        guard.get_parser_ids()
    };
    Ok(parser_ids)
}

/// Register a new parser from rule content
#[tauri::command]
pub async fn register_parser(
    parser_id: String,
    rule_content: String,
) -> Result<bool, String> {
    match ProtocolParser::from_rule_string(parser_id.clone(), &rule_content) {
        Ok(parser) => {
            let registry = get_parser_registry();
            registry.write().unwrap().register_parser(Box::new(parser));
            Ok(true)
        }
        Err(e) => Err(format!("Failed to register parser: {}", e)),
    }
}

/// Set the application theme for window chrome and system menu integration
#[tauri::command]
pub async fn set_window_theme(
    app_handle: AppHandle,
    theme: String,
) -> Result<(), String> {
    println!("Received theme change request: {}", theme);

    let window = app_handle.get_webview_window("main")
        .ok_or("Failed to get main window")?;

    let tauri_theme = match theme.as_str() {
        "light" => Some(Theme::Light),
        "dark" => Some(Theme::Dark),
        _ => None, // For "system" or any other value, let OS decide
    };

    println!("Setting Tauri theme to: {:?}", tauri_theme);

    // Set the primary window theme
    window.set_theme(tauri_theme)
        .map_err(|e| format!("Failed to set window theme: {}", e))?;

    // Set custom background color to match the application theme with multiple attempts
    match theme.as_str() {
        "dark" => {
            // Set dark theme background color to match main application area (#2B2B2B)
            // Try multiple times to ensure it takes effect
            for attempt in 1..=3 {
                if let Err(e) = window.set_background_color(Some(Color(43, 43, 43, 255))) {
                    eprintln!("Attempt {}: Failed to set dark background color: {}", attempt, e);
                    if attempt < 3 {
                        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                    }
                } else {
                    println!("Successfully set dark background color on attempt {}", attempt);
                    break;
                }
            }

            // Additional platform-specific theming with stronger integration
            #[cfg(target_os = "windows")]
            {
                // On Windows, try to set additional window properties for better integration
                println!("Applied Windows-specific dark theme integration");
                // Force window to redraw with new theme
                if let Err(e) = window.set_minimizable(true) {
                    eprintln!("Failed to refresh window properties: {}", e);
                }
            }

            #[cfg(target_os = "macos")]
            {
                // On macOS, try to influence the window appearance more strongly
                println!("Applied macOS-specific dark theme integration");
                // Force appearance update
                if let Err(e) = window.set_always_on_top(false) {
                    eprintln!("Failed to refresh window properties: {}", e);
                }
            }

            #[cfg(target_os = "linux")]
            {
                // On Linux, set additional properties for better desktop integration
                println!("Applied Linux-specific dark theme integration");
                // Force window manager to update
                if let Err(e) = window.set_skip_taskbar(false) {
                    eprintln!("Failed to refresh window properties: {}", e);
                }
            }
        },
        "light" => {
            // Set light theme background color with multiple attempts
            for attempt in 1..=3 {
                if let Err(e) = window.set_background_color(Some(Color(255, 255, 255, 255))) {
                    eprintln!("Attempt {}: Failed to set light background color: {}", attempt, e);
                    if attempt < 3 {
                        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                    }
                } else {
                    println!("Successfully set light background color on attempt {}", attempt);
                    break;
                }
            }
        },
        _ => {
            // System theme - let OS decide the background color
            if let Err(e) = window.set_background_color(None) {
                eprintln!("Failed to reset background color for system theme: {}", e);
            }
        }
    }

    // Force window refresh to apply changes with multiple methods
    if let Err(e) = window.set_focus() {
        eprintln!("Failed to refresh window focus: {}", e);
    }

    // Additional refresh attempts
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    if let Err(e) = window.show() {
        eprintln!("Failed to show window: {}", e);
    }

    Ok(())
}
