use crate::types::ConnectionStatus;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

/// Tracks the state of a network session
#[derive(Debug, Clone)]
pub struct SessionState {
    session_id: String,
    status: Arc<RwLock<ConnectionStatus>>,
    connected_at: Arc<RwLock<Option<Instant>>>,
    last_activity: Arc<RwLock<Option<Instant>>>,
    error_count: Arc<RwLock<u64>>,
}

impl SessionState {
    pub fn new(session_id: String) -> Self {
        Self {
            session_id,
            status: Arc::new(RwLock::new(ConnectionStatus::Disconnected)),
            connected_at: Arc::new(RwLock::new(None)),
            last_activity: Arc::new(RwLock::new(None)),
            error_count: Arc::new(RwLock::new(0)),
        }
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
        
        *current_status = status;
    }

    /// Get the current connection status
    pub fn get_status(&self) -> ConnectionStatus {
        self.status.read().unwrap().clone()
    }

    /// Update the last activity timestamp
    pub fn update_activity(&self) {
        *self.last_activity.write().unwrap() = Some(Instant::now());
    }

    /// Get the connection duration
    pub fn connection_time(&self) -> Option<Duration> {
        self.connected_at.read().unwrap().map(|start| start.elapsed())
    }

    /// Get the last activity timestamp
    pub fn last_activity(&self) -> Option<Instant> {
        *self.last_activity.read().unwrap()
    }

    /// Get the error count
    pub fn error_count(&self) -> u64 {
        *self.error_count.read().unwrap()
    }

    /// Reset error count
    pub fn reset_error_count(&self) {
        *self.error_count.write().unwrap() = 0;
    }

    /// Check if the session is considered active (has recent activity)
    pub fn is_active(&self, threshold: Duration) -> bool {
        match self.last_activity() {
            Some(last) => last.elapsed() < threshold,
            None => false,
        }
    }

    /// Get session uptime
    pub fn uptime(&self) -> Option<Duration> {
        self.connection_time()
    }
}
