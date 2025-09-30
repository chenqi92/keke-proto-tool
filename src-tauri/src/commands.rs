use crate::session::SessionManager;
use crate::types::SessionConfig;
use crate::utils::{validate_port, is_common_port};
use crate::parser::{ProtocolParser, get_parser_registry, Parser, ProtocolRepository, ProtocolMetadata, ProtocolImportRequest, ProtocolExportOptions, FactorTranslator, FactorDefinition, ParsedFactor, FactorSummary};
use tauri::{State, AppHandle, Theme, Manager};
use tauri::window::Color;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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

/// Pause auto-reconnect for a session
#[tauri::command]
pub async fn pause_auto_reconnect(
    session_id: String,
    session_manager: State<'_, SessionManager>,
) -> Result<(), String> {
    match session_manager.pause_auto_reconnect(&session_id).await {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

/// Resume auto-reconnect for a session
#[tauri::command]
pub async fn resume_auto_reconnect(
    session_id: String,
    session_manager: State<'_, SessionManager>,
) -> Result<(), String> {
    match session_manager.resume_auto_reconnect(&session_id).await {
        Ok(_) => Ok(()),
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

// ============================================================================
// PROTOCOL REPOSITORY COMMANDS
// ============================================================================

/// Import a protocol into the repository
#[tauri::command]
pub async fn import_protocol(
    content: String,
    custom_name: Option<String>,
    custom_category: Option<String>,
    tags: Vec<String>,
    enabled: bool,
) -> Result<String, String> {
    let registry = get_parser_registry();
    let mut registry_guard = registry.write().unwrap();

    if let Some(repository) = registry_guard.repository_mut() {
        let request = ProtocolImportRequest {
            content,
            custom_name,
            custom_category,
            tags,
            enabled,
        };

        match repository.import_protocol(request) {
            Ok(protocol_id) => {
                // If enabled, load the parser immediately
                if enabled {
                    if let Err(e) = registry_guard.reload_protocol(&protocol_id) {
                        log::warn!("Failed to load imported protocol parser: {}", e);
                    }
                }
                Ok(protocol_id)
            }
            Err(e) => Err(format!("Failed to import protocol: {}", e)),
        }
    } else {
        Err("Protocol repository not available".to_string())
    }
}

/// Export a protocol from the repository
#[tauri::command]
pub async fn export_protocol(
    protocol_id: String,
    export_path: String,
    include_metadata: bool,
) -> Result<String, String> {
    let registry = get_parser_registry();
    let registry_guard = registry.read().unwrap();

    if let Some(repository) = registry_guard.repository() {
        let options = ProtocolExportOptions {
            protocol_id,
            export_path: PathBuf::from(export_path),
            include_metadata,
        };

        match repository.export_protocol(options) {
            Ok(exported_path) => Ok(exported_path.to_string_lossy().to_string()),
            Err(e) => Err(format!("Failed to export protocol: {}", e)),
        }
    } else {
        Err("Protocol repository not available".to_string())
    }
}

/// List all protocols in the repository
#[tauri::command]
pub async fn list_protocols() -> Result<Vec<ProtocolMetadata>, String> {
    let registry = get_parser_registry();
    let registry_guard = registry.read().unwrap();

    if let Some(repository) = registry_guard.repository() {
        let protocols = repository.list_protocols();
        Ok(protocols.into_iter().cloned().collect())
    } else {
        Err("Protocol repository not available".to_string())
    }
}

/// Get protocol content by ID
#[tauri::command]
pub async fn get_protocol_content(protocol_id: String) -> Result<String, String> {
    let registry = get_parser_registry();
    let registry_guard = registry.read().unwrap();

    if let Some(repository) = registry_guard.repository() {
        let metadata = repository.get_protocol_metadata(&protocol_id)
            .map_err(|e| format!("Failed to get protocol metadata: {}", e))?;

        let protocol_path = repository.get_repository_path()
            .join("protocols")
            .join(&metadata.filename);

        std::fs::read_to_string(&protocol_path)
            .map_err(|e| format!("Failed to read protocol file: {}", e))
    } else {
        Err("Protocol repository not available".to_string())
    }
}

/// List enabled protocols in the repository
#[tauri::command]
pub async fn list_enabled_protocols() -> Result<Vec<ProtocolMetadata>, String> {
    let registry = get_parser_registry();
    let registry_guard = registry.read().unwrap();

    if let Some(repository) = registry_guard.repository() {
        let protocols = repository.list_enabled_protocols();
        Ok(protocols.into_iter().cloned().collect())
    } else {
        Err("Protocol repository not available".to_string())
    }
}

/// Get protocol metadata by ID
#[tauri::command]
pub async fn get_protocol_metadata(protocol_id: String) -> Result<ProtocolMetadata, String> {
    let registry = get_parser_registry();
    let registry_guard = registry.read().unwrap();

    if let Some(repository) = registry_guard.repository() {
        match repository.get_protocol_metadata(&protocol_id) {
            Ok(metadata) => Ok(metadata.clone()),
            Err(e) => Err(format!("Failed to get protocol metadata: {}", e)),
        }
    } else {
        Err("Protocol repository not available".to_string())
    }
}

/// Delete a protocol from the repository
#[tauri::command]
pub async fn delete_protocol(protocol_id: String) -> Result<(), String> {
    let registry = get_parser_registry();
    let mut registry_guard = registry.write().unwrap();

    // Remove parser from registry first
    registry_guard.remove_parser(&protocol_id);

    // Then delete from repository
    if let Some(repository) = registry_guard.repository_mut() {
        match repository.delete_protocol(&protocol_id) {
            Ok(()) => Ok(()),
            Err(e) => Err(format!("Failed to delete protocol: {}", e)),
        }
    } else {
        Err("Protocol repository not available".to_string())
    }
}

/// Enable or disable a protocol
#[tauri::command]
pub async fn set_protocol_enabled(
    protocol_id: String,
    enabled: bool,
) -> Result<(), String> {
    let registry = get_parser_registry();
    let mut registry_guard = registry.write().unwrap();

    if let Some(repository) = registry_guard.repository_mut() {
        match repository.set_protocol_enabled(&protocol_id, enabled) {
            Ok(()) => {
                if enabled {
                    // Load the parser
                    if let Err(e) = registry_guard.reload_protocol(&protocol_id) {
                        log::warn!("Failed to load protocol parser: {}", e);
                    }
                } else {
                    // Remove the parser
                    registry_guard.remove_parser(&protocol_id);
                }
                Ok(())
            }
            Err(e) => Err(format!("Failed to set protocol enabled: {}", e)),
        }
    } else {
        Err("Protocol repository not available".to_string())
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

// ============================================================================
// Logging Commands
// ============================================================================

use crate::logging::{LogManager, LogEntry, LogFilter, LogLevel, LogCategory, Direction, ConnectionType, TimeRange};
use crate::logging::export::{ExportFormat, ExportStats};
use crate::logging::manager::{LogConfig, LogStats};
use std::sync::Arc;
use tokio::sync::RwLock;

// Global log manager instance
static LOG_MANAGER: tokio::sync::OnceCell<Arc<RwLock<LogManager>>> = tokio::sync::OnceCell::const_new();

/// Initialize the log manager
pub async fn init_log_manager(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Get the app data directory
    let app_data_dir = app_handle.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Ensure the app data directory exists
    tokio::fs::create_dir_all(&app_data_dir).await
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    // Create the logs database path
    let db_path = app_data_dir.join("logs.db");

    log::info!("Initializing log manager with database path: {}", db_path.display());

    let config = LogConfig {
        max_logs: 100_000,
        auto_cleanup_days: 30,
        db_path,
    };

    let manager = LogManager::new(config).await
        .map_err(|e| format!("Failed to initialize log manager: {}", e))?;

    LOG_MANAGER.set(Arc::new(RwLock::new(manager)))
        .map_err(|_| "Log manager already initialized".to_string())?;

    log::info!("Log manager initialized successfully");
    Ok(())
}

/// Get the log manager instance
async fn get_log_manager() -> Result<Arc<RwLock<LogManager>>, String> {
    LOG_MANAGER.get()
        .ok_or_else(|| "Log manager not initialized".to_string())
        .map(|manager| manager.clone())
}

/// Add a log entry
#[tauri::command]
pub async fn add_log_entry(
    level: String,
    source: String,
    message: String,
    session_id: Option<String>,
    session_name: Option<String>,
    category: Option<String>,
    direction: Option<String>,
    client_id: Option<String>,
    protocol: Option<String>,
    data_size: Option<i64>,
    connection_type: Option<String>,
    details: Option<serde_json::Value>,
) -> Result<(), String> {
    let manager = get_log_manager().await?;
    let manager = manager.read().await;

    let log_level = match level.to_lowercase().as_str() {
        "info" => LogLevel::Info,
        "warning" => LogLevel::Warning,
        "error" => LogLevel::Error,
        "debug" => LogLevel::Debug,
        _ => LogLevel::Info,
    };

    let log_category = category.and_then(|c| match c.to_lowercase().as_str() {
        "network" => Some(LogCategory::Network),
        "protocol" => Some(LogCategory::Protocol),
        "system" => Some(LogCategory::System),
        "console" => Some(LogCategory::Console),
        "message" => Some(LogCategory::Message),
        _ => None,
    });

    let log_direction = direction.and_then(|d| match d.to_lowercase().as_str() {
        "in" => Some(Direction::In),
        "out" => Some(Direction::Out),
        _ => None,
    });

    let log_connection_type = connection_type.and_then(|ct| match ct.to_lowercase().as_str() {
        "client" => Some(ConnectionType::Client),
        "server" => Some(ConnectionType::Server),
        _ => None,
    });

    let mut entry = LogEntry::new(log_level, source, message);

    if let Some(session_id) = session_id {
        entry = entry.with_session(session_id, session_name);
    }

    if let Some(category) = log_category {
        entry = entry.with_category(category);
    }

    if let Some(direction) = log_direction {
        entry = entry.with_direction(direction);
    }

    if let Some(client_id) = client_id {
        entry = entry.with_client_id(client_id);
    }

    if let Some(protocol) = protocol {
        entry = entry.with_protocol(protocol);
    }

    if let Some(data_size) = data_size {
        entry = entry.with_data_size(data_size);
    }

    if let Some(connection_type) = log_connection_type {
        entry = entry.with_connection_type(connection_type);
    }

    if let Some(details) = details {
        entry = entry.with_details(details);
    }

    manager.add_log(entry).await
        .map_err(|e| format!("Failed to add log entry: {}", e))?;

    Ok(())
}

/// Get logs based on filter criteria
#[tauri::command]
pub async fn get_logs(
    session_id: Option<String>,
    level: Option<String>,
    category: Option<String>,
    time_range: Option<String>,
    search_query: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<LogEntry>, String> {
    let manager = get_log_manager().await?;
    let manager = manager.read().await;

    // 添加调试信息 - 在消费变量之前
    println!("get_logs called with filters:");
    println!("  session_id: {:?}", session_id);
    println!("  level: {:?}", level);
    println!("  category: {:?}", category);
    println!("  time_range: {:?}", time_range);
    println!("  search_query: {:?}", search_query);
    println!("  limit: {:?}", limit);
    println!("  offset: {:?}", offset);

    let log_level = level.and_then(|l| match l.to_lowercase().as_str() {
        "info" => Some(LogLevel::Info),
        "warning" => Some(LogLevel::Warning),
        "error" => Some(LogLevel::Error),
        "debug" => Some(LogLevel::Debug),
        _ => None,
    });

    let log_category = category.and_then(|c| match c.to_lowercase().as_str() {
        "network" => Some(LogCategory::Network),
        "system" => Some(LogCategory::System),
        "message" => Some(LogCategory::Message),
        _ => None,
    });

    println!("  parsed level: {:?}", log_level);
    println!("  parsed category: {:?}", log_category);

    let log_time_range = time_range.and_then(|tr| match tr.to_lowercase().as_str() {
        "all" => Some(TimeRange::All),
        "today" => Some(TimeRange::Today),
        "24h" => Some(TimeRange::Hours24),
        "7d" => Some(TimeRange::Days7),
        "30d" => Some(TimeRange::Days30),
        _ => None,
    });

    let filter = LogFilter {
        session_id,
        level: log_level,
        category: log_category,
        time_range: log_time_range,
        search_query,
        limit,
        offset,
    };

    let result = manager.get_logs(filter).await
        .map_err(|e| format!("Failed to get logs: {}", e))?;

    // 添加调试信息
    println!("get_logs returning {} entries", result.len());
    if !result.is_empty() {
        println!("Sample log entries:");
        for (i, entry) in result.iter().take(3).enumerate() {
            println!("  Entry {}: level={:?}, category={:?}, message={}",
                i + 1, entry.level, entry.category, entry.message);
        }
    }

    Ok(result)
}

/// Export logs to file
#[tauri::command]
pub async fn export_logs(
    session_id: Option<String>,
    level: Option<String>,
    category: Option<String>,
    time_range: Option<String>,
    search_query: Option<String>,
    format: String,
    output_dir: Option<String>,
    custom_filename: Option<String>,
) -> Result<String, String> {
    let manager = get_log_manager().await?;
    let manager = manager.read().await;

    let export_format = format.parse::<ExportFormat>()
        .map_err(|e| format!("Invalid export format: {}", e))?;

    let log_level = level.and_then(|l| match l.to_lowercase().as_str() {
        "info" => Some(LogLevel::Info),
        "warning" => Some(LogLevel::Warning),
        "error" => Some(LogLevel::Error),
        "debug" => Some(LogLevel::Debug),
        _ => None,
    });

    let log_category = category.and_then(|c| match c.to_lowercase().as_str() {
        "network" => Some(LogCategory::Network),
        "protocol" => Some(LogCategory::Protocol),
        "system" => Some(LogCategory::System),
        "console" => Some(LogCategory::Console),
        "message" => Some(LogCategory::Message),
        _ => None,
    });

    let log_time_range = time_range.and_then(|tr| match tr.to_lowercase().as_str() {
        "all" => Some(TimeRange::All),
        "today" => Some(TimeRange::Today),
        "24h" => Some(TimeRange::Hours24),
        "7d" => Some(TimeRange::Days7),
        "30d" => Some(TimeRange::Days30),
        _ => None,
    });

    let filter = LogFilter {
        session_id,
        level: log_level,
        category: log_category,
        time_range: log_time_range,
        search_query,
        limit: None, // Export all matching logs
        offset: None,
    };

    let output_path = output_dir.map(|p| std::path::PathBuf::from(p));

    let exported_file = manager.export_logs(filter, export_format, output_path, custom_filename).await
        .map_err(|e| format!("Failed to export logs: {}", e))?;

    Ok(exported_file.to_string_lossy().to_string())
}

/// Clear all logs
#[tauri::command]
pub async fn clear_logs() -> Result<(), String> {
    let manager = get_log_manager().await?;
    let manager = manager.read().await;

    manager.clear_logs().await
        .map_err(|e| format!("Failed to clear logs: {}", e))
}

/// Get log statistics
#[tauri::command]
pub async fn get_log_stats() -> Result<LogStats, String> {
    let manager = get_log_manager().await?;
    let manager = manager.read().await;

    manager.get_stats().await
        .map_err(|e| format!("Failed to get log stats: {}", e))
}

/// Log a network event (helper function for internal use)
#[tauri::command]
pub async fn log_network_event(
    session_id: String,
    session_name: Option<String>,
    event_type: String,
    client_id: Option<String>,
    protocol: Option<String>,
    data_size: Option<i64>,
) -> Result<(), String> {
    let manager = get_log_manager().await?;
    let manager = manager.read().await;

    manager.log_network_event(
        session_id,
        session_name,
        &event_type,
        client_id,
        protocol,
        data_size,
    ).await
    .map_err(|e| format!("Failed to log network event: {}", e))
}

// ============================================================================
// Factor Code Translation Commands
// ============================================================================

/// Parse factor codes from a factor string
#[tauri::command]
pub async fn parse_factor_codes(
    protocol_id: String,
    factor_string: String,
) -> Result<Vec<ParsedFactor>, String> {
    let registry = get_parser_registry();

    let mut registry = registry.write().map_err(|e| format!("Failed to acquire registry lock: {}", e))?;

    // Get the protocol repository
    let repository = registry.repository_mut()
        .ok_or_else(|| "Protocol repository not initialized".to_string())?;

    // Load the protocol rule
    let rule = repository.load_protocol_rule(&protocol_id)
        .map_err(|e| format!("Failed to load protocol rule: {}", e))?;

    // Extract factor definitions from the rule
    let mut factor_translator = FactorTranslator::new();

    if let Some(factor_codes) = rule.factor_codes {
        let mut factor_definitions = std::collections::HashMap::new();

        for (code, definition_value) in factor_codes {
            // Convert serde_yaml::Value to FactorDefinition
            let definition: FactorDefinition = serde_yaml::from_value(definition_value)
                .map_err(|e| format!("Failed to parse factor definition for {}: {}", code, e))?;

            factor_definitions.insert(code, definition);
        }

        factor_translator.load_factor_definitions(factor_definitions);
    }

    // Parse the factor string
    factor_translator.parse_factor_string(&factor_string)
        .map_err(|e| format!("Failed to parse factor string: {}", e))
}

/// Get factor summary for parsed factors
#[tauri::command]
pub async fn get_factor_summary(
    protocol_id: String,
    factor_string: String,
) -> Result<FactorSummary, String> {
    // First parse the factors
    let parsed_factors = parse_factor_codes(protocol_id, factor_string).await?;

    // Create a temporary translator to get the summary
    let translator = FactorTranslator::new();
    let summary = translator.get_factor_summary(&parsed_factors);

    Ok(summary)
}

/// Get all factor definitions for a protocol
#[tauri::command]
pub async fn get_protocol_factor_definitions(
    protocol_id: String,
) -> Result<std::collections::HashMap<String, FactorDefinition>, String> {
    let registry = get_parser_registry();

    let mut registry = registry.write().map_err(|e| format!("Failed to acquire registry lock: {}", e))?;

    // Get the protocol repository
    let repository = registry.repository_mut()
        .ok_or_else(|| "Protocol repository not initialized".to_string())?;

    // Load the protocol rule
    let rule = repository.load_protocol_rule(&protocol_id)
        .map_err(|e| format!("Failed to load protocol rule: {}", e))?;

    // Extract factor definitions from the rule
    let mut factor_definitions = std::collections::HashMap::new();

    if let Some(factor_codes) = rule.factor_codes {
        for (code, definition_value) in factor_codes {
            // Convert serde_yaml::Value to FactorDefinition
            let definition: FactorDefinition = serde_yaml::from_value(definition_value)
                .map_err(|e| format!("Failed to parse factor definition for {}: {}", code, e))?;

            factor_definitions.insert(code, definition);
        }
    }

    Ok(factor_definitions)
}

/// Parse HJ212 message with factor translation
#[tauri::command]
pub async fn parse_hj212_message(
    protocol_id: String,
    message_data: String,
) -> Result<HJ212ParseResult, String> {
    // Parse the message using the protocol
    let parse_result = {
        let registry = get_parser_registry();
        let mut registry = registry.write().map_err(|e| format!("Failed to acquire registry lock: {}", e))?;

        // Get the protocol repository
        let repository = registry.repository_mut()
            .ok_or_else(|| "Protocol repository not initialized".to_string())?;

        // Create protocol parser
        let parser = repository.create_protocol_parser(&protocol_id)
            .map_err(|e| format!("Failed to create protocol parser: {}", e))?;

        // Parse the message
        parser.parse(message_data.as_bytes())
            .map_err(|e| format!("Failed to parse message: {}", e))?
    };

    // Extract PolId field if present
    let mut parsed_factors = Vec::new();
    let mut factor_summary = None;

    if let Some(cp_field) = parse_result.fields.fields.get("cp") {
        let cp_value = cp_field.value.as_string();
        // Look for PolId in CP field
        if let Some(polid_start) = cp_value.find("PolId=") {
            let polid_part = &cp_value[polid_start + 6..];
            let polid_end = polid_part.find(';').unwrap_or(polid_part.len());
            let polid_value = &polid_part[..polid_end];

            // Parse factors
            parsed_factors = parse_factor_codes(protocol_id.clone(), polid_value.to_string()).await?;

            // Get summary
            let translator = FactorTranslator::new();
            factor_summary = Some(translator.get_factor_summary(&parsed_factors));
        }
    }

    Ok(HJ212ParseResult {
        parse_result,
        parsed_factors,
        factor_summary,
    })
}

/// HJ212 parse result with factor translation
#[derive(Debug, Serialize, Deserialize)]
pub struct HJ212ParseResult {
    pub parse_result: crate::parser::ParseResult,
    pub parsed_factors: Vec<ParsedFactor>,
    pub factor_summary: Option<FactorSummary>,
}

/// File filter for save dialog
#[derive(Debug, Serialize, Deserialize)]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

/// Save file dialog result
#[derive(Debug, Serialize, Deserialize)]
pub struct SaveFileResult {
    pub success: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

/// Show save file dialog and save content
#[tauri::command]
pub async fn save_file_dialog(
    default_path: String,
    content: String,
    filters: Vec<FileFilter>,
) -> Result<SaveFileResult, String> {
    use std::fs;

    // Build file dialog using rfd
    let mut dialog = rfd::FileDialog::new();

    // Set default file name
    if !default_path.is_empty() {
        dialog = dialog.set_file_name(&default_path);
    }

    // Add filters
    for filter in filters {
        let extensions: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
        dialog = dialog.add_filter(&filter.name, &extensions);
    }

    // Show save dialog (blocking)
    let file_path = dialog.save_file();

    match file_path {
        Some(path) => {
            // Write content to file
            match fs::write(&path, content) {
                Ok(_) => Ok(SaveFileResult {
                    success: true,
                    path: Some(path.to_string_lossy().to_string()),
                    error: None,
                }),
                Err(e) => Ok(SaveFileResult {
                    success: false,
                    path: None,
                    error: Some(format!("Failed to write file: {}", e)),
                }),
            }
        }
        None => {
            // User cancelled
            Ok(SaveFileResult {
                success: false,
                path: None,
                error: None,
            })
        }
    }
}
