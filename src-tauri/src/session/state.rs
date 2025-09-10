use crate::types::ConnectionStatus;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Tracks the state of a network session
#[derive(Debug, Clone)]
pub struct SessionState {
    session_id: String,
    status: Arc<RwLock<ConnectionStatus>>,
    connected_at: Arc<RwLock<Option<Instant>>>,
    last_activity: Arc<RwLock<Option<Instant>>>,
    error_count: Arc<RwLock<u64>>,
    app_handle: Arc<RwLock<Option<AppHandle>>>,
}

impl SessionState {
    pub fn new(session_id: String) -> Self {
        Self {
            session_id,
            status: Arc::new(RwLock::new(ConnectionStatus::Disconnected)),
            connected_at: Arc::new(RwLock::new(None)),
            last_activity: Arc::new(RwLock::new(None)),
            error_count: Arc::new(RwLock::new(0)),
            app_handle: Arc::new(RwLock::new(None)),
        }
    }

    /// Set the app handle for event emission
    pub fn set_app_handle(&mut self, app_handle: AppHandle) {
        *self.app_handle.write().unwrap() = Some(app_handle);
    }

    /// Set the connection status
    pub fn set_status(&self, status: ConnectionStatus) {
        let mut current_status = self.status.write().unwrap();

        match &status {
            ConnectionStatus::Connected => {
                *self.connected_at.write().unwrap() = Some(Instant::now());
                self.update_activity();
            }
            ConnectionStatus::Disconnected => {
                *self.connected_at.write().unwrap() = None;
            }
            ConnectionStatus::Error(_) => {
                *self.error_count.write().unwrap() += 1;
            }
            _ => {}
        }

        *current_status = status.clone();

        // Emit event to frontend if app handle is available
        if let Ok(app_handle_guard) = self.app_handle.read() {
            if let Some(app_handle) = app_handle_guard.as_ref() {
                let payload = serde_json::json!({
                    "sessionId": self.session_id,
                    "status": status,
                    "error": match &status {
                        ConnectionStatus::Error(msg) => Some(msg.clone()),
                        _ => None
                    }
                });

                if let Err(e) = app_handle.emit("connection-status", payload) {
                    eprintln!("Failed to emit connection-status event: {}", e);
                }
            }
        }
    }

    /// Get the current connection status
    #[allow(dead_code)]
    pub fn get_status(&self) -> ConnectionStatus {
        self.status.read().unwrap().clone()
    }

    /// Update the last activity timestamp
    pub fn update_activity(&self) {
        *self.last_activity.write().unwrap() = Some(Instant::now());
    }

    /// Get the connection duration
    #[allow(dead_code)]
    pub fn connection_time(&self) -> Option<Duration> {
        self.connected_at.read().unwrap().map(|start| start.elapsed())
    }

    /// Get the last activity timestamp
    #[allow(dead_code)]
    pub fn last_activity(&self) -> Option<Instant> {
        *self.last_activity.read().unwrap()
    }

    /// Get the error count
    #[allow(dead_code)]
    pub fn error_count(&self) -> u64 {
        *self.error_count.read().unwrap()
    }

    /// Reset error count
    #[allow(dead_code)]
    pub fn reset_error_count(&self) {
        *self.error_count.write().unwrap() = 0;
    }

    /// Check if the session is considered active (has recent activity)
    #[allow(dead_code)]
    pub fn is_active(&self, threshold: Duration) -> bool {
        match self.last_activity() {
            Some(last) => last.elapsed() < threshold,
            None => false,
        }
    }

    /// Get session uptime
    #[allow(dead_code)]
    pub fn uptime(&self) -> Option<Duration> {
        self.connection_time()
    }
}
