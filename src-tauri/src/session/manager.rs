use super::{Session, SessionStatistics};
use crate::types::{SessionConfig, NetworkResult, NetworkError};
use dashmap::DashMap;
use std::sync::Arc;

/// Manages all active network sessions
#[derive(Debug)]
pub struct SessionManager {
    sessions: Arc<DashMap<String, Session>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(DashMap::new()),
        }
    }

    /// Create a new session with the given configuration
    pub fn create_session(&self, session_id: String, config: SessionConfig) -> NetworkResult<()> {
        if self.sessions.contains_key(&session_id) {
            return Err(NetworkError::InvalidConfig(
                format!("Session {} already exists", session_id)
            ));
        }

        let session = Session::new(session_id.clone(), config);
        self.sessions.insert(session_id, session);
        
        Ok(())
    }

    /// Connect a session
    pub async fn connect_session(&self, session_id: &str) -> NetworkResult<bool> {
        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                session.connect().await?;
                Ok(true)
            }
            None => Err(NetworkError::SessionNotFound(session_id.to_string())),
        }
    }

    /// Disconnect a session
    pub async fn disconnect_session(&self, session_id: &str) -> NetworkResult<bool> {
        match self.sessions.get_mut(session_id) {
            Some(mut session) => {
                session.disconnect().await?;
                Ok(true)
            }
            None => Err(NetworkError::SessionNotFound(session_id.to_string())),
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

    /// Remove a session
    pub fn remove_session(&self, session_id: &str) -> NetworkResult<()> {
        match self.sessions.remove(session_id) {
            Some(_) => Ok(()),
            None => Err(NetworkError::SessionNotFound(session_id.to_string())),
        }
    }

    /// Get session statistics
    pub fn get_session_statistics(&self, session_id: &str) -> NetworkResult<SessionStatistics> {
        match self.sessions.get(session_id) {
            Some(session) => Ok(session.get_statistics()),
            None => Err(NetworkError::SessionNotFound(session_id.to_string())),
        }
    }

    /// Check if a session is connected
    pub fn is_session_connected(&self, session_id: &str) -> bool {
        match self.sessions.get(session_id) {
            Some(session) => session.is_connected(),
            None => false,
        }
    }

    /// Get all session IDs
    pub fn get_session_ids(&self) -> Vec<String> {
        self.sessions.iter().map(|entry| entry.key().clone()).collect()
    }

    /// Get session count
    pub fn session_count(&self) -> usize {
        self.sessions.len()
    }

    /// Clean up disconnected sessions
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
