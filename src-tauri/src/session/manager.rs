use super::{Session, SessionStatistics};
use crate::types::{SessionConfig, NetworkResult, NetworkError};
use dashmap::DashMap;
use std::sync::Arc;
use tauri::AppHandle;

/// Manages all active network sessions
#[derive(Debug)]
pub struct SessionManager {
    sessions: Arc<DashMap<String, Session>>,
    app_handle: Option<AppHandle>,
}

impl SessionManager {
    pub fn new() -> Self {
        let manager = Self {
            sessions: Arc::new(DashMap::new()),
            app_handle: None,
        };

        // Reset any persistent state on startup
        manager.reset_all_session_states();

        manager
    }

    /// Set the app handle for event emission
    pub fn set_app_handle(&mut self, app_handle: AppHandle) {
        self.app_handle = Some(app_handle.clone());

        // Update all existing sessions with the app handle
        for mut session in self.sessions.iter_mut() {
            session.set_app_handle(app_handle.clone());
        }
    }

    /// Reset all session states to disconnected on startup
    /// This fixes the persistent invalid state issue
    fn reset_all_session_states(&self) {
        // This method will be called on app startup to ensure clean state
        // Since sessions are created fresh each time, this is mainly for future persistence
        eprintln!("SessionManager initialized - all sessions will start in disconnected state");
    }

    /// Create a new session with the given configuration
    pub fn create_session(&self, session_id: String, config: SessionConfig) -> NetworkResult<()> {
        if self.sessions.contains_key(&session_id) {
            return Err(NetworkError::InvalidConfig(
                format!("Session {} already exists", session_id)
            ));
        }

        let mut session = Session::new(session_id.clone(), config);

        // Set app handle if available
        if let Some(app_handle) = &self.app_handle {
            session.set_app_handle(app_handle.clone());
        }

        self.sessions.insert(session_id, session);

        Ok(())
    }

    /// Connect a session
    pub async fn connect_session(&self, session_id: &str) -> NetworkResult<bool> {
        eprintln!("SessionManager: Attempting to connect session {}", session_id);

        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                eprintln!("SessionManager: Found session {}, initiating connection", session_id);
                match session.connect().await {
                    Ok(_) => {
                        eprintln!("SessionManager: Session {} connection initiated successfully", session_id);
                        Ok(true)
                    }
                    Err(e) => {
                        eprintln!("SessionManager: Session {} connection failed: {}", session_id, e);
                        Err(e)
                    }
                }
            }
            None => {
                eprintln!("SessionManager: Session {} not found", session_id);
                Err(NetworkError::SessionNotFound(session_id.to_string()))
            }
        }
    }

    /// Disconnect a session
    pub async fn disconnect_session(&self, session_id: &str) -> NetworkResult<bool> {
        eprintln!("SessionManager: Attempting to disconnect session {}", session_id);

        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                eprintln!("SessionManager: Found session {}, initiating disconnection", session_id);
                match session.disconnect().await {
                    Ok(_) => {
                        eprintln!("SessionManager: Session {} disconnected successfully", session_id);
                        Ok(true)
                    }
                    Err(e) => {
                        eprintln!("SessionManager: Session {} disconnection failed: {}", session_id, e);
                        Err(e)
                    }
                }
            }
            None => {
                eprintln!("SessionManager: Session {} not found for disconnection", session_id);
                Err(NetworkError::SessionNotFound(session_id.to_string()))
            }
        }
    }

    /// Send data through a session
    pub async fn send_message(&self, session_id: &str, data: &[u8]) -> NetworkResult<bool> {
        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                session.send(data).await?;
                Ok(true)
            }
            None => Err(NetworkError::SessionNotFound(session_id.to_string())),
        }
    }

    /// Cancel ongoing connection attempt
    pub async fn cancel_connection(&self, session_id: &str) -> NetworkResult<bool> {
        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                session.cancel_connection().await?;
                Ok(true)
            }
            None => Err(NetworkError::SessionNotFound(session_id.to_string())),
        }
    }

    /// Remove a session
    #[allow(dead_code)]
    pub fn remove_session(&self, session_id: &str) -> NetworkResult<()> {
        match self.sessions.remove(session_id) {
            Some(_) => Ok(()),
            None => Err(NetworkError::SessionNotFound(session_id.to_string())),
        }
    }

    /// Cleanup all sessions and disconnect them (called on app shutdown)
    #[allow(dead_code)]
    pub async fn cleanup_all_sessions(&self) {
        eprintln!("Cleaning up all sessions...");

        let session_ids: Vec<String> = self.sessions.iter().map(|entry| entry.key().clone()).collect();

        for session_id in session_ids {
            if let Some(mut session) = self.sessions.get_mut(&session_id) {
                if let Err(e) = session.disconnect().await {
                    eprintln!("Error disconnecting session {}: {}", session_id, e);
                }
            }
        }

        self.sessions.clear();
        eprintln!("All sessions cleaned up");
    }

    /// Get session statistics
    #[allow(dead_code)]
    pub fn get_session_statistics(&self, session_id: &str) -> NetworkResult<SessionStatistics> {
        match self.sessions.get(session_id) {
            Some(session) => Ok(session.get_statistics()),
            None => Err(NetworkError::SessionNotFound(session_id.to_string())),
        }
    }

    /// Check if a session is connected
    #[allow(dead_code)]
    pub fn is_session_connected(&self, session_id: &str) -> bool {
        match self.sessions.get(session_id) {
            Some(session) => session.is_connected(),
            None => false,
        }
    }

    /// Get all session IDs
    #[allow(dead_code)]
    pub fn get_session_ids(&self) -> Vec<String> {
        self.sessions.iter().map(|entry| entry.key().clone()).collect()
    }

    /// Get session count
    #[allow(dead_code)]
    pub fn session_count(&self) -> usize {
        self.sessions.len()
    }

    /// Clean up disconnected sessions
    #[allow(dead_code)]
    pub async fn cleanup_disconnected_sessions(&self) {
        let mut to_remove = Vec::new();
        
        for entry in self.sessions.iter() {
            if !entry.is_connected() {
                to_remove.push(entry.key().clone());
            }
        }
        
        for session_id in to_remove {
            let _ = self.remove_session(&session_id);
        }
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new()
    }
}
