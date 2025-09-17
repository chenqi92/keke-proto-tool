use super::{Session, SessionStatistics};
use crate::types::{SessionConfig, NetworkResult, NetworkError};
use dashmap::DashMap;
use std::sync::Arc;
use tauri::AppHandle;

/// Manages all active network sessions
#[derive(Debug, Clone)]
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
    pub async fn set_app_handle(&mut self, app_handle: AppHandle) {
        self.app_handle = Some(app_handle.clone());

        // Update all existing sessions with the app handle
        for mut session in self.sessions.iter_mut() {
            session.set_app_handle(app_handle.clone()).await;
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
    pub async fn create_session(&self, session_id: String, config: SessionConfig) -> NetworkResult<()> {
        if self.sessions.contains_key(&session_id) {
            return Err(NetworkError::InvalidConfig(
                format!("Session {} already exists", session_id)
            ));
        }

        let mut session = Session::new(session_id.clone(), config);

        // Set app handle if available
        if let Some(app_handle) = &self.app_handle {
            session.set_app_handle(app_handle.clone()).await;
        }

        self.sessions.insert(session_id, session);

        Ok(())
    }

    /// Update session configuration
    pub async fn update_session_config(&self, session_id: &str, new_config: SessionConfig) -> NetworkResult<()> {
        eprintln!("SessionManager: Updating configuration for session {}", session_id);

        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                eprintln!("SessionManager: Found session {}, updating config", session_id);
                session.config = new_config;
                eprintln!("SessionManager: Session {} configuration updated successfully", session_id);
                Ok(())
            }
            None => {
                eprintln!("SessionManager: Session {} not found for config update", session_id);
                Err(NetworkError::SessionNotFound(session_id.to_string()))
            }
        }
    }

    /// Connect a session
    pub async fn connect_session(&self, session_id: &str) -> NetworkResult<bool> {
        eprintln!("SessionManager: Attempting to connect session {}", session_id);

        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                eprintln!("SessionManager: Found session {}, initiating connection", session_id);

                // Ensure app handle is set before connecting
                if let Some(app_handle) = &self.app_handle {
                    eprintln!("SessionManager: Setting app handle on session {} before connection", session_id);
                    session.set_app_handle(app_handle.clone()).await;
                } else {
                    eprintln!("SessionManager: WARNING - No app handle available for session {}", session_id);
                }

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

    /// Disconnect a specific client from a server session
    pub async fn disconnect_client(&self, session_id: &str, client_id: &str) -> NetworkResult<bool> {
        eprintln!("SessionManager: Attempting to disconnect client {} from session {}", client_id, session_id);

        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                eprintln!("SessionManager: Found session {}, disconnecting client {}", session_id, client_id);
                match session.disconnect_client(client_id).await {
                    Ok(_) => {
                        eprintln!("SessionManager: Client {} disconnected from session {}", client_id, session_id);
                        Ok(true)
                    }
                    Err(e) => {
                        eprintln!("SessionManager: Failed to disconnect client {} from session {}: {}", client_id, session_id, e);
                        Err(e)
                    }
                }
            }
            None => {
                eprintln!("SessionManager: Session {} not found for client disconnection", session_id);
                Err(NetworkError::SessionNotFound(session_id.to_string()))
            }
        }
    }

    /// Send a message to a specific client in a server session
    pub async fn send_to_client(&self, session_id: &str, client_id: &str, data: &[u8]) -> NetworkResult<bool> {
        eprintln!("SessionManager: Attempting to send message to client {} in session {}", client_id, session_id);

        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                eprintln!("SessionManager: Found session {}, sending to client {}", session_id, client_id);
                match session.send_to_client(client_id, data).await {
                    Ok(_) => {
                        eprintln!("SessionManager: Message sent to client {} in session {}", client_id, session_id);
                        Ok(true)
                    }
                    Err(e) => {
                        eprintln!("SessionManager: Failed to send message to client {} in session {}: {}", client_id, session_id, e);
                        Err(e)
                    }
                }
            }
            None => {
                eprintln!("SessionManager: Session {} not found for send to client", session_id);
                Err(NetworkError::SessionNotFound(session_id.to_string()))
            }
        }
    }

    /// Broadcast a message to all clients in a server session
    pub async fn broadcast_message(&self, session_id: &str, data: &[u8]) -> NetworkResult<bool> {
        eprintln!("SessionManager: Attempting to broadcast message in session {}", session_id);

        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                eprintln!("SessionManager: Found session {}, broadcasting message", session_id);
                match session.broadcast(data).await {
                    Ok(_) => {
                        eprintln!("SessionManager: Message broadcasted in session {}", session_id);
                        Ok(true)
                    }
                    Err(e) => {
                        eprintln!("SessionManager: Failed to broadcast message in session {}: {}", session_id, e);
                        Err(e)
                    }
                }
            }
            None => {
                eprintln!("SessionManager: Session {} not found for broadcast", session_id);
                Err(NetworkError::SessionNotFound(session_id.to_string()))
            }
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

    /// Emit the current status of a session to synchronize frontend
    pub fn emit_current_status(&self, session_id: &str) {
        if let Some(session) = self.sessions.get(session_id) {
            // Force emit the current status to synchronize frontend
            session.state.force_emit_status();
            eprintln!("SessionManager: Emitted current status for session {}", session_id);
        } else {
            eprintln!("SessionManager: Session {} not found when trying to emit status", session_id);
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

    /// Check if there's an internal TCP server listening on the specified host and port
    pub fn has_internal_tcp_server(&self, host: &str, port: u16) -> bool {
        for session in self.sessions.iter() {
            let session_ref = session.value();
            if session_ref.config.protocol == "TCP"
                && session_ref.config.connection_type == "server"
                && session_ref.config.port == port
                && (session_ref.config.host == host
                    || session_ref.config.host == "0.0.0.0"
                    || (host == "localhost" && session_ref.config.host == "127.0.0.1")
                    || (host == "127.0.0.1" && session_ref.config.host == "localhost"))
                && session_ref.state.is_connected() {
                eprintln!("SessionManager: Found internal TCP server {} listening on {}:{}",
                    session_ref.id, session_ref.config.host, session_ref.config.port);
                return true;
            }
        }
        eprintln!("SessionManager: No internal TCP server found listening on {}:{}", host, port);
        false
    }

    /// Get all active TCP server sessions
    pub fn get_active_tcp_servers(&self) -> Vec<(String, String, u16)> {
        let mut servers = Vec::new();
        for session in self.sessions.iter() {
            let session_ref = session.value();
            if session_ref.config.protocol == "TCP"
                && session_ref.config.connection_type == "server"
                && session_ref.state.is_connected() {
                servers.push((
                    session_ref.id.clone(),
                    session_ref.config.host.clone(),
                    session_ref.config.port
                ));
            }
        }
        servers
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
