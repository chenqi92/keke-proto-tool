use tauri::Manager;

// Modules
mod logging;
mod network;
mod session;
mod parser;
mod commands;
mod storage;
mod types;
mod utils;
mod menu;
mod shell_executor;
mod shell_history_db;
mod shell_history_commands;

use commands::*;
use shell_executor::*;
use shell_history_commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_version_info,
            check_for_updates,
            has_internal_tcp_server,
            get_active_tcp_servers,
            connect_session,
            disconnect_session,
            send_message,
            send_to_client,
            broadcast_message,
            disconnect_client,
            pause_auto_reconnect,
            resume_auto_reconnect,
            send_udp_message,
            subscribe_mqtt_topic,
            unsubscribe_mqtt_topic,
            publish_mqtt_message,
            cancel_connection,
            // Modbus commands
            modbus_read_coils,
            modbus_read_discrete_inputs,
            modbus_read_holding_registers,
            modbus_read_input_registers,
            modbus_write_single_coil,
            modbus_write_single_register,
            modbus_write_multiple_coils,
            modbus_write_multiple_registers,
            // Serial port commands
            list_serial_ports,
            // Parsing commands
            load_protocol_rule,
            // Menu state commands
            update_theme_menu_state,
            update_color_theme_menu_state,
            update_sidebar_menu_state,
            update_inspector_menu_state,
            update_statusbar_menu_state,
            load_protocol_rule_from_string,
            parse_data_with_rule,
            parse_data_auto,
            validate_parsed_data,
            get_available_parsers,
            register_parser,
            // Protocol repository commands
            import_protocol,
            export_protocol,
            list_protocols,
            list_enabled_protocols,
            get_protocol_metadata,
            get_protocol_content,
            delete_protocol,
            set_protocol_enabled,
            // Theme commands
            set_window_theme,
            // Logging commands
            add_log_entry,
            get_logs,
            export_logs,
            clear_logs,
            get_log_stats,
            log_network_event,
            // Factor code translation commands
            parse_factor_codes,
            get_factor_summary,
            get_protocol_factor_definitions,
            parse_hj212_message,
            // File dialog commands
            save_file_dialog,
            // Shell executor commands
            execute_system_command,
            execute_pipeline,
            read_file_content,
            write_file_content,
            start_interactive_session,
            write_interactive_session,
            get_interactive_session,
            list_interactive_sessions,
            kill_interactive_session,
            // PTY session commands
            start_pty_session,
            write_pty_session,
            resize_pty_session,
            close_pty_session,
            get_default_shell,
            get_system_commands,
            // Shell history database commands
            init_shell_history_db,
            add_shell_history,
            get_session_history,
            get_command_stats,
            get_all_shell_history,
            search_shell_history,
            clear_all_shell_history,
            clear_session_shell_history,
            create_shell_session,
            get_all_shell_sessions,
            delete_shell_session,
            update_shell_session_active
        ])
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Create and set the native menu
            let menu = menu::create_app_menu(app.handle())?;
            app.set_menu(menu)?;

            // Initialize session manager with clean state
            let mut session_manager = session::SessionManager::new();
            let app_handle = app.handle().clone();

            // Set app handle synchronously using block_on
            tauri::async_runtime::block_on(async {
                session_manager.set_app_handle(app_handle).await;
            });

            app.manage(session_manager);

            // Initialize interactive session manager
            let interactive_session_manager = shell_executor::InteractiveSessionManager::new();
            app.manage(interactive_session_manager);

            // Initialize PTY session manager
            let pty_session_manager = shell_executor::PtySessionManager::new();
            app.manage(pty_session_manager);

            // Initialize shell history database state
            let shell_history_db_state: shell_history_commands::ShellHistoryDbState =
                std::sync::Arc::new(tokio::sync::Mutex::new(None));
            app.manage(shell_history_db_state);

            // Initialize parser system with repository
            let app_data_dir = app.path().app_data_dir()
                .map_err(|e| format!("Failed to get app data directory: {}", e))?;
            let protocols_dir = app_data_dir.join("protocols");

            if let Err(e) = parser::initialize_parser_system_with_repository(Some(protocols_dir)) {
                log::error!("Failed to initialize parser system: {}", e);
            }

            // Initialize logging system
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = commands::init_log_manager(app_handle).await {
                    log::error!("Failed to initialize log manager: {}", e);
                }
            });

            // Setup cleanup on app exit
            tauri::async_runtime::spawn(async move {
                // This will run when the app is shutting down
                // Note: In a real implementation, you'd want to use proper shutdown hooks
                // For now, we rely on the session manager's initialization to reset states
            });

            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event.id().as_ref());
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
