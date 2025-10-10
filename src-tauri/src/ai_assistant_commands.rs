// AI Assistant Commands
// Tauri commands for AI assistant database operations

use crate::ai_assistant_db::{AIAssistantDb, AIConfig, AIConversation, AIMessage};
use tauri::State;

// ==================== AI Config Commands ====================

#[tauri::command]
pub async fn ai_save_config(
    db: State<'_, AIAssistantDb>,
    config: AIConfig,
) -> Result<(), String> {
    db.save_config(&config).await
}

#[tauri::command]
pub async fn ai_get_config(
    db: State<'_, AIAssistantDb>,
    id: String,
) -> Result<Option<AIConfig>, String> {
    db.get_config(&id).await
}

#[tauri::command]
pub async fn ai_get_all_configs(
    db: State<'_, AIAssistantDb>,
) -> Result<Vec<AIConfig>, String> {
    db.get_all_configs().await
}

#[tauri::command]
pub async fn ai_update_config(
    db: State<'_, AIAssistantDb>,
    config: AIConfig,
) -> Result<(), String> {
    db.update_config(&config).await
}

#[tauri::command]
pub async fn ai_delete_config(
    db: State<'_, AIAssistantDb>,
    id: String,
) -> Result<(), String> {
    db.delete_config(&id).await
}

#[tauri::command]
pub async fn ai_clear_default_configs(
    db: State<'_, AIAssistantDb>,
) -> Result<(), String> {
    db.clear_default_configs().await
}

// ==================== Conversation Commands ====================

#[tauri::command]
pub async fn ai_save_conversation(
    db: State<'_, AIAssistantDb>,
    conversation: AIConversation,
) -> Result<(), String> {
    db.save_conversation(&conversation).await
}

#[tauri::command]
pub async fn ai_get_conversation(
    db: State<'_, AIAssistantDb>,
    id: String,
) -> Result<Option<AIConversation>, String> {
    db.get_conversation(&id).await
}

#[tauri::command]
pub async fn ai_get_all_conversations(
    db: State<'_, AIAssistantDb>,
) -> Result<Vec<AIConversation>, String> {
    db.get_all_conversations().await
}

#[tauri::command]
pub async fn ai_update_conversation(
    db: State<'_, AIAssistantDb>,
    conversation: AIConversation,
) -> Result<(), String> {
    db.update_conversation(&conversation).await
}

#[tauri::command]
pub async fn ai_delete_conversation(
    db: State<'_, AIAssistantDb>,
    id: String,
) -> Result<(), String> {
    db.delete_conversation(&id).await
}

// ==================== Message Commands ====================

#[tauri::command]
pub async fn ai_save_message(
    db: State<'_, AIAssistantDb>,
    message: AIMessage,
) -> Result<(), String> {
    db.save_message(&message).await
}

#[tauri::command]
pub async fn ai_get_messages_by_conversation(
    db: State<'_, AIAssistantDb>,
    conversation_id: String,
) -> Result<Vec<AIMessage>, String> {
    db.get_messages_by_conversation(&conversation_id).await
}

#[tauri::command]
pub async fn ai_delete_message(
    db: State<'_, AIAssistantDb>,
    id: String,
) -> Result<(), String> {
    db.delete_message(&id).await
}

#[tauri::command]
pub async fn ai_delete_messages_by_conversation(
    db: State<'_, AIAssistantDb>,
    conversation_id: String,
) -> Result<(), String> {
    db.delete_messages_by_conversation(&conversation_id).await
}

