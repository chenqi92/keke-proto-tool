// Shell History Database Module
// Manages command history persistence using SQLite

use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, Row};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellHistoryItem {
    pub id: String,
    pub session_id: String,
    pub command: String,
    pub args: String, // JSON array
    pub timestamp: i64, // Unix timestamp in milliseconds
    pub cwd: String,
    pub exit_code: i32,
    pub execution_time: i64, // milliseconds
    pub output: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellSession {
    pub id: String,
    pub name: String,
    pub created_at: i64,
    pub last_active: i64,
    pub command_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandStats {
    pub command: String,
    pub count: i32,
    pub last_used: i64,
    pub success_count: i32,
    pub failure_count: i32,
    pub last_args: String, // JSON array of last used args
}

pub struct ShellHistoryDb {
    pool: SqlitePool,
}

impl ShellHistoryDb {
    /// Initialize the database
    pub async fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        // Create app data directory if it doesn't exist
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;

        let db_path = app_data_dir.join("shell_history.db");

        // Ensure the database file exists by creating it if necessary
        // This prevents "unable to open database file" errors
        if !db_path.exists() {
            log::info!("Database file doesn't exist, creating: {}", db_path.display());
            std::fs::File::create(&db_path)
                .map_err(|e| format!("Failed to create database file: {}", e))?;
        }

        let db_url = format!("sqlite:{}", db_path.display());

        log::info!("Initializing shell history database at: {}", db_url);

        let pool = SqlitePool::connect(&db_url)
            .await
            .map_err(|e| format!("Failed to connect to database: {}", e))?;

        log::info!("Successfully connected to shell history database");

        let db = Self { pool };
        db.init_schema().await?;

        Ok(db)
    }

    /// Initialize database schema
    async fn init_schema(&self) -> Result<(), String> {
        // Create sessions table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS shell_sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                last_active INTEGER NOT NULL,
                command_count INTEGER DEFAULT 0
            )
            "#,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to create sessions table: {}", e))?;

        // Create history table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS shell_history (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                command TEXT NOT NULL,
                args TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                cwd TEXT NOT NULL,
                exit_code INTEGER NOT NULL,
                execution_time INTEGER NOT NULL,
                output TEXT,
                error TEXT,
                FOREIGN KEY (session_id) REFERENCES shell_sessions(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to create history table: {}", e))?;

        // Create indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_history_session ON shell_history(session_id)")
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to create session index: {}", e))?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_history_timestamp ON shell_history(timestamp)")
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to create timestamp index: {}", e))?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_history_command ON shell_history(command)")
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to create command index: {}", e))?;

        Ok(())
    }

    /// Add a history item
    pub async fn add_history(&self, item: ShellHistoryItem) -> Result<(), String> {
        sqlx::query(
            r#"
            INSERT INTO shell_history (id, session_id, command, args, timestamp, cwd, exit_code, execution_time, output, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&item.id)
        .bind(&item.session_id)
        .bind(&item.command)
        .bind(&item.args)
        .bind(item.timestamp)
        .bind(&item.cwd)
        .bind(item.exit_code)
        .bind(item.execution_time)
        .bind(&item.output)
        .bind(&item.error)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to add history item: {}", e))?;

        // Update session command count and last active
        sqlx::query(
            r#"
            UPDATE shell_sessions
            SET command_count = command_count + 1, last_active = ?
            WHERE id = ?
            "#,
        )
        .bind(item.timestamp)
        .bind(&item.session_id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to update session: {}", e))?;

        Ok(())
    }

    /// Get history for a session
    pub async fn get_session_history(
        &self,
        session_id: &str,
        limit: Option<i32>,
    ) -> Result<Vec<ShellHistoryItem>, String> {
        let query = if let Some(limit) = limit {
            format!(
                "SELECT * FROM shell_history WHERE session_id = ? ORDER BY timestamp DESC LIMIT {}",
                limit
            )
        } else {
            "SELECT * FROM shell_history WHERE session_id = ? ORDER BY timestamp DESC".to_string()
        };

        let rows = sqlx::query(&query)
            .bind(session_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get session history: {}", e))?;

        let items = rows
            .into_iter()
            .map(|row| ShellHistoryItem {
                id: row.get("id"),
                session_id: row.get("session_id"),
                command: row.get("command"),
                args: row.get("args"),
                timestamp: row.get("timestamp"),
                cwd: row.get("cwd"),
                exit_code: row.get("exit_code"),
                execution_time: row.get("execution_time"),
                output: row.get("output"),
                error: row.get("error"),
            })
            .collect();

        Ok(items)
    }

    /// Get command statistics grouped by command, ordered by execution count
    pub async fn get_command_stats(
        &self,
        session_id: &str,
        limit: Option<i32>,
    ) -> Result<Vec<CommandStats>, String> {
        let query = if let Some(limit) = limit {
            format!(
                r#"
                SELECT
                    h1.command,
                    COUNT(*) as count,
                    MAX(h1.timestamp) as last_used,
                    SUM(CASE WHEN h1.exit_code = 0 THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN h1.exit_code != 0 THEN 1 ELSE 0 END) as failure_count,
                    (SELECT h2.args FROM shell_history h2
                     WHERE h2.session_id = h1.session_id AND h2.command = h1.command
                     ORDER BY h2.timestamp DESC LIMIT 1) as last_args
                FROM shell_history h1
                WHERE h1.session_id = ?
                GROUP BY h1.command
                ORDER BY count DESC, last_used DESC
                LIMIT {}
                "#,
                limit
            )
        } else {
            r#"
            SELECT
                h1.command,
                COUNT(*) as count,
                MAX(h1.timestamp) as last_used,
                SUM(CASE WHEN h1.exit_code = 0 THEN 1 ELSE 0 END) as success_count,
                SUM(CASE WHEN h1.exit_code != 0 THEN 1 ELSE 0 END) as failure_count,
                (SELECT h2.args FROM shell_history h2
                 WHERE h2.session_id = h1.session_id AND h2.command = h1.command
                 ORDER BY h2.timestamp DESC LIMIT 1) as last_args
            FROM shell_history h1
            WHERE h1.session_id = ?
            GROUP BY h1.command
            ORDER BY count DESC, last_used DESC
            "#.to_string()
        };

        let rows = sqlx::query(&query)
            .bind(session_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get command stats: {}", e))?;

        let stats = rows
            .into_iter()
            .map(|row| CommandStats {
                command: row.get("command"),
                count: row.get("count"),
                last_used: row.get("last_used"),
                success_count: row.get("success_count"),
                failure_count: row.get("failure_count"),
                last_args: row.get("last_args"),
            })
            .collect();

        Ok(stats)
    }

    /// Get all history
    pub async fn get_all_history(&self, limit: Option<i32>) -> Result<Vec<ShellHistoryItem>, String> {
        let query = if let Some(limit) = limit {
            format!("SELECT * FROM shell_history ORDER BY timestamp DESC LIMIT {}", limit)
        } else {
            "SELECT * FROM shell_history ORDER BY timestamp DESC".to_string()
        };

        let rows = sqlx::query(&query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get all history: {}", e))?;

        let items = rows
            .into_iter()
            .map(|row| ShellHistoryItem {
                id: row.get("id"),
                session_id: row.get("session_id"),
                command: row.get("command"),
                args: row.get("args"),
                timestamp: row.get("timestamp"),
                cwd: row.get("cwd"),
                exit_code: row.get("exit_code"),
                execution_time: row.get("execution_time"),
                output: row.get("output"),
                error: row.get("error"),
            })
            .collect();

        Ok(items)
    }

    /// Search history
    pub async fn search_history(&self, query: &str) -> Result<Vec<ShellHistoryItem>, String> {
        let search_pattern = format!("%{}%", query);
        
        let rows = sqlx::query(
            "SELECT * FROM shell_history WHERE command LIKE ? OR args LIKE ? ORDER BY timestamp DESC LIMIT 100"
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| format!("Failed to search history: {}", e))?;

        let items = rows
            .into_iter()
            .map(|row| ShellHistoryItem {
                id: row.get("id"),
                session_id: row.get("session_id"),
                command: row.get("command"),
                args: row.get("args"),
                timestamp: row.get("timestamp"),
                cwd: row.get("cwd"),
                exit_code: row.get("exit_code"),
                execution_time: row.get("execution_time"),
                output: row.get("output"),
                error: row.get("error"),
            })
            .collect();

        Ok(items)
    }

    /// Clear all history
    pub async fn clear_all_history(&self) -> Result<(), String> {
        sqlx::query("DELETE FROM shell_history")
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to clear history: {}", e))?;

        // Reset command counts
        sqlx::query("UPDATE shell_sessions SET command_count = 0")
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to reset session counts: {}", e))?;

        Ok(())
    }

    /// Clear history for a session
    pub async fn clear_session_history(&self, session_id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM shell_history WHERE session_id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to clear session history: {}", e))?;

        // Reset command count
        sqlx::query("UPDATE shell_sessions SET command_count = 0 WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to reset session count: {}", e))?;

        Ok(())
    }

    /// Create a new session
    pub async fn create_session(&self, session: ShellSession) -> Result<(), String> {
        sqlx::query(
            r#"
            INSERT INTO shell_sessions (id, name, created_at, last_active, command_count)
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(&session.id)
        .bind(&session.name)
        .bind(session.created_at)
        .bind(session.last_active)
        .bind(session.command_count)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to create session: {}", e))?;

        Ok(())
    }

    /// Get all sessions
    pub async fn get_all_sessions(&self) -> Result<Vec<ShellSession>, String> {
        let rows = sqlx::query("SELECT * FROM shell_sessions ORDER BY last_active DESC")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get sessions: {}", e))?;

        let sessions = rows
            .into_iter()
            .map(|row| ShellSession {
                id: row.get("id"),
                name: row.get("name"),
                created_at: row.get("created_at"),
                last_active: row.get("last_active"),
                command_count: row.get("command_count"),
            })
            .collect();

        Ok(sessions)
    }

    /// Delete a session and its history
    pub async fn delete_session(&self, session_id: &str) -> Result<(), String> {
        // History will be deleted automatically due to CASCADE
        sqlx::query("DELETE FROM shell_sessions WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to delete session: {}", e))?;

        Ok(())
    }

    /// Update session last active time
    pub async fn update_session_active(&self, session_id: &str, timestamp: i64) -> Result<(), String> {
        sqlx::query("UPDATE shell_sessions SET last_active = ? WHERE id = ?")
            .bind(timestamp)
            .bind(session_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to update session: {}", e))?;

        Ok(())
    }
}

