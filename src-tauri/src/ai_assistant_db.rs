// AI Assistant Database Module
// Manages AI configurations, conversations, and messages using SQLite

use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, Row};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub api_key: String,
    pub api_endpoint: Option<String>,
    pub model: String,
    pub temperature: Option<f64>,
    pub max_tokens: Option<i32>,
    pub top_p: Option<f64>,
    pub frequency_penalty: Option<f64>,
    pub presence_penalty: Option<f64>,
    pub is_default: bool,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConversation {
    pub id: String,
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub pinned: bool,
    pub tags: Option<String>, // JSON array
    pub context: Option<String>, // JSON object
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIMessage {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
    pub function_call: Option<String>, // JSON object
    pub tool_calls: Option<String>, // JSON array
    pub metadata: Option<String>, // JSON object
}

pub struct AIAssistantDb {
    pool: SqlitePool,
}

impl AIAssistantDb {
    /// Initialize the database
    pub async fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;

        let db_path = app_data_dir.join("ai_assistant.db");

        if !db_path.exists() {
            log::info!("AI database file doesn't exist, creating: {}", db_path.display());
            std::fs::File::create(&db_path)
                .map_err(|e| format!("Failed to create database file: {}", e))?;
        }

        let db_url = format!("sqlite:{}", db_path.display());
        log::info!("Initializing AI assistant database at: {}", db_url);

        let pool = SqlitePool::connect(&db_url)
            .await
            .map_err(|e| format!("Failed to connect to database: {}", e))?;

        log::info!("Successfully connected to AI assistant database");

        let db = Self { pool };
        db.init_schema().await?;

        Ok(db)
    }

    /// Initialize database schema
    async fn init_schema(&self) -> Result<(), String> {
        // Create AI configs table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS ai_configs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                platform TEXT NOT NULL,
                api_key TEXT NOT NULL,
                api_endpoint TEXT,
                model TEXT NOT NULL,
                temperature REAL,
                max_tokens INTEGER,
                top_p REAL,
                frequency_penalty REAL,
                presence_penalty REAL,
                is_default INTEGER NOT NULL DEFAULT 0,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to create ai_configs table: {}", e))?;

        // Create conversations table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS ai_conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                pinned INTEGER NOT NULL DEFAULT 0,
                tags TEXT,
                context TEXT
            )
            "#,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to create ai_conversations table: {}", e))?;

        // Create messages table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS ai_messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                function_call TEXT,
                tool_calls TEXT,
                metadata TEXT,
                FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to create ai_messages table: {}", e))?;

        // Create indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON ai_messages(conversation_id)")
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to create index: {}", e))?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_conversations_updated ON ai_conversations(updated_at DESC)")
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to create index: {}", e))?;

        log::info!("AI assistant database schema initialized");
        Ok(())
    }

    // ==================== AI Config Operations ====================

    pub async fn save_config(&self, config: &AIConfig) -> Result<(), String> {
        sqlx::query(
            r#"
            INSERT INTO ai_configs (
                id, name, platform, api_key, api_endpoint, model,
                temperature, max_tokens, top_p, frequency_penalty, presence_penalty,
                is_default, enabled, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&config.id)
        .bind(&config.name)
        .bind(&config.platform)
        .bind(&config.api_key)
        .bind(&config.api_endpoint)
        .bind(&config.model)
        .bind(config.temperature)
        .bind(config.max_tokens)
        .bind(config.top_p)
        .bind(config.frequency_penalty)
        .bind(config.presence_penalty)
        .bind(config.is_default as i32)
        .bind(config.enabled as i32)
        .bind(config.created_at)
        .bind(config.updated_at)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to save config: {}", e))?;

        Ok(())
    }

    pub async fn get_config(&self, id: &str) -> Result<Option<AIConfig>, String> {
        let row = sqlx::query("SELECT * FROM ai_configs WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Failed to get config: {}", e))?;

        Ok(row.map(|r| AIConfig {
            id: r.get("id"),
            name: r.get("name"),
            platform: r.get("platform"),
            api_key: r.get("api_key"),
            api_endpoint: r.get("api_endpoint"),
            model: r.get("model"),
            temperature: r.get("temperature"),
            max_tokens: r.get("max_tokens"),
            top_p: r.get("top_p"),
            frequency_penalty: r.get("frequency_penalty"),
            presence_penalty: r.get("presence_penalty"),
            is_default: r.get::<i32, _>("is_default") != 0,
            enabled: r.get::<i32, _>("enabled") != 0,
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }))
    }

    pub async fn get_all_configs(&self) -> Result<Vec<AIConfig>, String> {
        let rows = sqlx::query("SELECT * FROM ai_configs ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get configs: {}", e))?;

        Ok(rows
            .into_iter()
            .map(|r| AIConfig {
                id: r.get("id"),
                name: r.get("name"),
                platform: r.get("platform"),
                api_key: r.get("api_key"),
                api_endpoint: r.get("api_endpoint"),
                model: r.get("model"),
                temperature: r.get("temperature"),
                max_tokens: r.get("max_tokens"),
                top_p: r.get("top_p"),
                frequency_penalty: r.get("frequency_penalty"),
                presence_penalty: r.get("presence_penalty"),
                is_default: r.get::<i32, _>("is_default") != 0,
                enabled: r.get::<i32, _>("enabled") != 0,
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            })
            .collect())
    }

    pub async fn update_config(&self, config: &AIConfig) -> Result<(), String> {
        sqlx::query(
            r#"
            UPDATE ai_configs SET
                name = ?, platform = ?, api_key = ?, api_endpoint = ?, model = ?,
                temperature = ?, max_tokens = ?, top_p = ?, frequency_penalty = ?, presence_penalty = ?,
                is_default = ?, enabled = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&config.name)
        .bind(&config.platform)
        .bind(&config.api_key)
        .bind(&config.api_endpoint)
        .bind(&config.model)
        .bind(config.temperature)
        .bind(config.max_tokens)
        .bind(config.top_p)
        .bind(config.frequency_penalty)
        .bind(config.presence_penalty)
        .bind(config.is_default as i32)
        .bind(config.enabled as i32)
        .bind(config.updated_at)
        .bind(&config.id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to update config: {}", e))?;

        Ok(())
    }

    pub async fn delete_config(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM ai_configs WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to delete config: {}", e))?;

        Ok(())
    }

    pub async fn clear_default_configs(&self) -> Result<(), String> {
        sqlx::query("UPDATE ai_configs SET is_default = 0")
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to clear default configs: {}", e))?;

        Ok(())
    }

    // ==================== Conversation Operations ====================

    pub async fn save_conversation(&self, conversation: &AIConversation) -> Result<(), String> {
        sqlx::query(
            r#"
            INSERT INTO ai_conversations (id, title, created_at, updated_at, pinned, tags, context)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&conversation.id)
        .bind(&conversation.title)
        .bind(conversation.created_at)
        .bind(conversation.updated_at)
        .bind(conversation.pinned as i32)
        .bind(&conversation.tags)
        .bind(&conversation.context)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to save conversation: {}", e))?;

        Ok(())
    }

    pub async fn get_conversation(&self, id: &str) -> Result<Option<AIConversation>, String> {
        let row = sqlx::query("SELECT * FROM ai_conversations WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Failed to get conversation: {}", e))?;

        Ok(row.map(|r| AIConversation {
            id: r.get("id"),
            title: r.get("title"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
            pinned: r.get::<i32, _>("pinned") != 0,
            tags: r.get("tags"),
            context: r.get("context"),
        }))
    }

    pub async fn get_all_conversations(&self) -> Result<Vec<AIConversation>, String> {
        let rows = sqlx::query("SELECT * FROM ai_conversations ORDER BY updated_at DESC")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get conversations: {}", e))?;

        Ok(rows
            .into_iter()
            .map(|r| AIConversation {
                id: r.get("id"),
                title: r.get("title"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
                pinned: r.get::<i32, _>("pinned") != 0,
                tags: r.get("tags"),
                context: r.get("context"),
            })
            .collect())
    }

    pub async fn update_conversation(&self, conversation: &AIConversation) -> Result<(), String> {
        sqlx::query(
            r#"
            UPDATE ai_conversations SET
                title = ?, updated_at = ?, pinned = ?, tags = ?, context = ?
            WHERE id = ?
            "#,
        )
        .bind(&conversation.title)
        .bind(conversation.updated_at)
        .bind(conversation.pinned as i32)
        .bind(&conversation.tags)
        .bind(&conversation.context)
        .bind(&conversation.id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to update conversation: {}", e))?;

        Ok(())
    }

    pub async fn delete_conversation(&self, id: &str) -> Result<(), String> {
        // Delete messages first (cascade should handle this, but being explicit)
        sqlx::query("DELETE FROM ai_messages WHERE conversation_id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to delete messages: {}", e))?;

        // Delete conversation
        sqlx::query("DELETE FROM ai_conversations WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to delete conversation: {}", e))?;

        Ok(())
    }

    // ==================== Message Operations ====================

    pub async fn save_message(&self, message: &AIMessage) -> Result<(), String> {
        sqlx::query(
            r#"
            INSERT INTO ai_messages (id, conversation_id, role, content, timestamp, function_call, tool_calls, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&message.id)
        .bind(&message.conversation_id)
        .bind(&message.role)
        .bind(&message.content)
        .bind(message.timestamp)
        .bind(&message.function_call)
        .bind(&message.tool_calls)
        .bind(&message.metadata)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to save message: {}", e))?;

        Ok(())
    }

    pub async fn get_messages_by_conversation(&self, conversation_id: &str) -> Result<Vec<AIMessage>, String> {
        let rows = sqlx::query("SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY timestamp ASC")
            .bind(conversation_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get messages: {}", e))?;

        Ok(rows
            .into_iter()
            .map(|r| AIMessage {
                id: r.get("id"),
                conversation_id: r.get("conversation_id"),
                role: r.get("role"),
                content: r.get("content"),
                timestamp: r.get("timestamp"),
                function_call: r.get("function_call"),
                tool_calls: r.get("tool_calls"),
                metadata: r.get("metadata"),
            })
            .collect())
    }

    pub async fn delete_message(&self, id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM ai_messages WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to delete message: {}", e))?;

        Ok(())
    }

    pub async fn delete_messages_by_conversation(&self, conversation_id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM ai_messages WHERE conversation_id = ?")
            .bind(conversation_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to delete messages: {}", e))?;

        Ok(())
    }
}

