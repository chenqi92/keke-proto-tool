// Shell History Tauri Commands

use crate::shell_history_db::{ShellHistoryDb, ShellHistoryItem, ShellSession, CommandStats};
use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;

pub type ShellHistoryDbState = Arc<Mutex<Option<ShellHistoryDb>>>;

/// Initialize shell history database
#[tauri::command]
pub async fn init_shell_history_db(
    app_handle: tauri::AppHandle,
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<(), String> {
    let db = ShellHistoryDb::new(&app_handle).await?;
    let mut state = db_state.lock().await;
    *state = Some(db);
    Ok(())
}

/// Add a history item
#[tauri::command]
pub async fn add_shell_history(
    item: ShellHistoryItem,
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<(), String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.add_history(item).await
    } else {
        Err("Database not initialized".to_string())
    }
}

/// Get history for a session
#[tauri::command]
pub async fn get_session_history(
    session_id: String,
    limit: Option<i32>,
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<Vec<ShellHistoryItem>, String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.get_session_history(&session_id, limit).await
    } else {
        Err("Database not initialized".to_string())
    }
}

/// Get command statistics for a session
#[tauri::command]
pub async fn get_command_stats(
    session_id: String,
    limit: Option<i32>,
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<Vec<CommandStats>, String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.get_command_stats(&session_id, limit).await
    } else {
        Err("Database not initialized".to_string())
    }
}

/// Get all history
#[tauri::command]
pub async fn get_all_shell_history(
    limit: Option<i32>,
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<Vec<ShellHistoryItem>, String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.get_all_history(limit).await
    } else {
        Err("Database not initialized".to_string())
    }
}

/// Search history
#[tauri::command]
pub async fn search_shell_history(
    query: String,
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<Vec<ShellHistoryItem>, String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.search_history(&query).await
    } else {
        Err("Database not initialized".to_string())
    }
}

/// Clear all history
#[tauri::command]
pub async fn clear_all_shell_history(
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<(), String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.clear_all_history().await
    } else {
        Err("Database not initialized".to_string())
    }
}

/// Clear history for a session
#[tauri::command]
pub async fn clear_session_shell_history(
    session_id: String,
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<(), String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.clear_session_history(&session_id).await
    } else {
        Err("Database not initialized".to_string())
    }
}

/// Create a new session
#[tauri::command]
pub async fn create_shell_session(
    session: ShellSession,
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<(), String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.create_session(session).await
    } else {
        Err("Database not initialized".to_string())
    }
}

/// Get all sessions
#[tauri::command]
pub async fn get_all_shell_sessions(
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<Vec<ShellSession>, String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.get_all_sessions().await
    } else {
        Err("Database not initialized".to_string())
    }
}

/// Delete a session
#[tauri::command]
pub async fn delete_shell_session(
    session_id: String,
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<(), String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.delete_session(&session_id).await
    } else {
        Err("Database not initialized".to_string())
    }
}

/// Update session last active time
#[tauri::command]
pub async fn update_shell_session_active(
    session_id: String,
    timestamp: i64,
    db_state: State<'_, ShellHistoryDbState>,
) -> Result<(), String> {
    let state = db_state.lock().await;
    if let Some(db) = state.as_ref() {
        db.update_session_active(&session_id, timestamp).await
    } else {
        Err("Database not initialized".to_string())
    }
}

