use tauri::Manager;

// Modules
mod network;
mod session;
mod commands;
mod types;
mod utils;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            connect_session,
            disconnect_session,
            send_message,
            send_to_client,
            broadcast_message,
            send_udp_message,
            subscribe_mqtt_topic,
            unsubscribe_mqtt_topic,
            publish_mqtt_message,
            cancel_connection
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize session manager with clean state
            let mut session_manager = session::SessionManager::new();
            let app_handle = app.handle().clone();
            session_manager.set_app_handle(app_handle.clone());
            app.manage(session_manager);

            // Setup cleanup on app exit
            tauri::async_runtime::spawn(async move {
                // This will run when the app is shutting down
                // Note: In a real implementation, you'd want to use proper shutdown hooks
                // For now, we rely on the session manager's initialization to reset states
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
