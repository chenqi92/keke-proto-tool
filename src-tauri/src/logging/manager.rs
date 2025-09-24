use super::{LogEntry, LogFilter, LogLevel, LogCategory, Direction, TimeRange, INIT_SQL};
use anyhow::{Result, Context};
use chrono::{Utc, Duration};
use serde::Serialize;
use sqlx::{SqlitePool, Row};
use std::path::PathBuf;

/// Log manager for handling all logging operations
pub struct LogManager {
    pool: SqlitePool,
    config: LogConfig,
}

#[derive(Debug, Clone)]
pub struct LogConfig {
    pub max_logs: i64,
    pub auto_cleanup_days: i64,
    pub db_path: PathBuf,
}

impl Default for LogConfig {
    fn default() -> Self {
        Self {
            max_logs: 100_000,
            auto_cleanup_days: 30,
            db_path: PathBuf::from("logs.db"),
        }
    }
}

impl LogManager {
    /// Create a new log manager with the given configuration
    pub async fn new(config: LogConfig) -> Result<Self> {
        // Ensure the database directory exists
        if let Some(parent) = config.db_path.parent() {
            tokio::fs::create_dir_all(parent).await
                .context("Failed to create database directory")?;
        }

        // Create database connection pool
        // First ensure the directory exists synchronously
        if let Some(parent) = config.db_path.parent() {
            std::fs::create_dir_all(parent)
                .context("Failed to create database directory")?;
            log::info!("Created database directory: {}", parent.display());
        }

        // For SQLite, use the correct connection string format
        let path_str = config.db_path.to_string_lossy();
        log::info!("Attempting to connect to database: {}", path_str);

        // Ensure the database file exists by creating it if necessary
        if !config.db_path.exists() {
            log::info!("Database file doesn't exist, creating: {}", path_str);
            if let Err(e) = std::fs::File::create(&config.db_path) {
                log::error!("Failed to create database file: {}", e);
                return Err(anyhow::anyhow!("Failed to create database file: {}", e));
            }
        }

        // Use simple sqlite: prefix for connection string
        let connection_string = format!("sqlite:{}", path_str);
        log::info!("Using connection string: {}", connection_string);

        let pool = SqlitePool::connect(&connection_string).await
            .context(format!("Failed to connect to SQLite database at: {}", path_str))?;

        log::info!("Successfully connected to database: {}", path_str);

        // Initialize database schema
        sqlx::query(INIT_SQL)
            .execute(&pool)
            .await
            .context("Failed to initialize database schema")?;

        let manager = Self { pool, config };

        // Perform initial cleanup
        manager.cleanup_old_logs().await?;

        Ok(manager)
    }

    /// Add a new log entry
    pub async fn add_log(&self, entry: LogEntry) -> Result<()> {
        let details_json = entry.details.as_ref()
            .map(|d| serde_json::to_string(d).unwrap_or_default());

        sqlx::query(r#"
            INSERT INTO logs (
                id, timestamp, level, source, message, session_id, session_name,
                details, category, direction, client_id, protocol, data_size, connection_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#)
        .bind(&entry.id)
        .bind(&entry.timestamp)
        .bind(&entry.level)
        .bind(&entry.source)
        .bind(&entry.message)
        .bind(&entry.session_id)
        .bind(&entry.session_name)
        .bind(details_json)
        .bind(&entry.category)
        .bind(&entry.direction)
        .bind(&entry.client_id)
        .bind(&entry.protocol)
        .bind(entry.data_size)
        .bind(&entry.connection_type)
        .execute(&self.pool)
        .await
        .context("Failed to insert log entry")?;

        // Check if we need to cleanup old logs
        self.maybe_cleanup().await?;

        Ok(())
    }

    /// Get logs based on filter criteria
    pub async fn get_logs(&self, filter: LogFilter) -> Result<Vec<LogEntry>> {
        let mut query = String::from(r#"
            SELECT id, timestamp, level, source, message, session_id, session_name,
                   details, category, direction, client_id, protocol, data_size, connection_type
            FROM logs
            WHERE 1=1
        "#);

        let mut conditions = Vec::new();
        let mut bind_values: Vec<Box<dyn sqlx::Encode<'_, sqlx::Sqlite> + Send + Sync>> = Vec::new();

        // Add filters
        if let Some(session_id) = &filter.session_id {
            conditions.push("(session_id = ? OR session_name LIKE ?)");
            bind_values.push(Box::new(session_id.clone()));
            bind_values.push(Box::new(format!("%{}%", session_id)));
        }

        if let Some(level) = &filter.level {
            conditions.push("level = ?");
            bind_values.push(Box::new(level.clone()));
        }

        if let Some(category) = &filter.category {
            conditions.push("category = ?");
            bind_values.push(Box::new(category.clone()));
        }

        if let Some(time_range) = &filter.time_range {
            let cutoff_time = match time_range {
                TimeRange::All => None,
                TimeRange::Today => {
                    let today = Utc::now().date_naive();
                    Some(today.and_hms_opt(0, 0, 0).unwrap().and_utc())
                },
                TimeRange::Hours24 => Some(Utc::now() - Duration::hours(24)),
                TimeRange::Days7 => Some(Utc::now() - Duration::days(7)),
                TimeRange::Days30 => Some(Utc::now() - Duration::days(30)),
            };

            if let Some(cutoff) = cutoff_time {
                conditions.push("timestamp >= ?");
                bind_values.push(Box::new(cutoff));
            }
        }

        if let Some(search_query) = &filter.search_query {
            conditions.push("(message LIKE ? OR source LIKE ? OR session_name LIKE ?)");
            let search_pattern = format!("%{}%", search_query);
            bind_values.push(Box::new(search_pattern.clone()));
            bind_values.push(Box::new(search_pattern.clone()));
            bind_values.push(Box::new(search_pattern));
        }

        // Add conditions to query
        for condition in conditions {
            query.push_str(" AND ");
            query.push_str(condition);
        }

        // Add ordering and pagination
        query.push_str(" ORDER BY timestamp DESC");
        
        if let Some(limit) = filter.limit {
            query.push_str(&format!(" LIMIT {}", limit));
        }

        if let Some(offset) = filter.offset {
            query.push_str(&format!(" OFFSET {}", offset));
        }

        // Execute query - simplified version for now
        let rows = sqlx::query(&query)
            .fetch_all(&self.pool)
            .await
            .context("Failed to fetch logs")?;

        let mut logs = Vec::new();
        for row in rows {
            let details_str: Option<String> = row.try_get("details")?;
            let details = details_str.and_then(|s| serde_json::from_str(&s).ok());

            logs.push(LogEntry {
                id: row.try_get("id")?,
                timestamp: row.try_get("timestamp")?,
                level: row.try_get("level")?,
                source: row.try_get("source")?,
                message: row.try_get("message")?,
                session_id: row.try_get("session_id")?,
                session_name: row.try_get("session_name")?,
                details,
                category: row.try_get("category")?,
                direction: row.try_get("direction")?,
                client_id: row.try_get("client_id")?,
                protocol: row.try_get("protocol")?,
                data_size: row.try_get("data_size")?,
                connection_type: row.try_get("connection_type")?,
            });
        }

        Ok(logs)
    }

    /// Get log count based on filter
    pub async fn get_log_count(&self, _filter: LogFilter) -> Result<i64> {
        // Simplified count query for now
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM logs")
            .fetch_one(&self.pool)
            .await
            .context("Failed to get log count")?;

        Ok(count.0)
    }

    /// Clear all logs
    pub async fn clear_logs(&self) -> Result<()> {
        sqlx::query("DELETE FROM logs")
            .execute(&self.pool)
            .await
            .context("Failed to clear logs")?;

        Ok(())
    }

    /// Cleanup old logs based on configuration
    async fn cleanup_old_logs(&self) -> Result<()> {
        let cutoff_date = Utc::now() - Duration::days(self.config.auto_cleanup_days);
        
        sqlx::query("DELETE FROM logs WHERE timestamp < ?")
            .bind(cutoff_date)
            .execute(&self.pool)
            .await
            .context("Failed to cleanup old logs")?;

        Ok(())
    }

    /// Maybe cleanup if we have too many logs
    async fn maybe_cleanup(&self) -> Result<()> {
        let count = self.get_log_count(LogFilter::default()).await?;
        
        if count > self.config.max_logs {
            // Delete oldest logs to keep within limit
            let to_delete = count - self.config.max_logs + 1000; // Delete extra to avoid frequent cleanups
            
            sqlx::query(r#"
                DELETE FROM logs 
                WHERE id IN (
                    SELECT id FROM logs 
                    ORDER BY timestamp ASC 
                    LIMIT ?
                )
            "#)
            .bind(to_delete)
            .execute(&self.pool)
            .await
            .context("Failed to cleanup excess logs")?;
        }

        Ok(())
    }

    /// Get database statistics
    pub async fn get_stats(&self) -> Result<LogStats> {
        let total_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM logs")
            .fetch_one(&self.pool)
            .await?;

        let level_stats = sqlx::query("SELECT level, COUNT(*) as count FROM logs GROUP BY level")
            .fetch_all(&self.pool)
            .await?;

        let mut by_level = std::collections::HashMap::new();
        for row in level_stats {
            let level: String = row.try_get("level")?;
            let count: i64 = row.try_get("count")?;
            by_level.insert(level, count);
        }

        Ok(LogStats {
            total: total_count.0,
            by_level,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct LogStats {
    pub total: i64,
    pub by_level: std::collections::HashMap<String, i64>,
}

// Helper functions for creating common log entries
impl LogManager {
    pub async fn log_network_event(
        &self,
        session_id: String,
        session_name: Option<String>,
        event_type: &str,
        client_id: Option<String>,
        protocol: Option<String>,
        data_size: Option<i64>,
    ) -> Result<()> {
        let (level, message, category, direction) = match event_type {
            "connected" => {
                let msg = if let Some(ref client_id) = client_id {
                    format!("客户端 {} 连接成功", client_id)
                } else {
                    "连接建立成功".to_string()
                };
                (LogLevel::Info, msg, LogCategory::Network, None)
            },
            "disconnected" => {
                let msg = if let Some(ref client_id) = client_id {
                    format!("客户端 {} 断开连接", client_id)
                } else {
                    "连接断开".to_string()
                };
                (LogLevel::Warning, msg, LogCategory::Network, None)
            },
            "message_sent" => {
                let size_info = data_size.map(|s| format!(" ({} bytes)", s)).unwrap_or_default();
                let msg = if let Some(ref client_id) = client_id {
                    format!("向客户端 {} 发送消息{}", client_id, size_info)
                } else {
                    format!("发送消息{}", size_info)
                };
                (LogLevel::Info, msg, LogCategory::Message, Some(Direction::Out))
            },
            "message_received" => {
                let size_info = data_size.map(|s| format!(" ({} bytes)", s)).unwrap_or_default();
                let msg = if let Some(ref client_id) = client_id {
                    format!("从客户端 {} 接收消息{}", client_id, size_info)
                } else {
                    format!("接收消息{}", size_info)
                };
                (LogLevel::Info, msg, LogCategory::Message, Some(Direction::In))
            },
            _ => (LogLevel::Debug, format!("网络事件: {}", event_type), LogCategory::Network, None),
        };

        let mut entry = LogEntry::new(level, session_name.clone().unwrap_or_else(|| session_id.clone()), message)
            .with_session(session_id, session_name)
            .with_category(category);

        if let Some(direction) = direction {
            entry = entry.with_direction(direction);
        }

        if let Some(client_id) = client_id {
            entry = entry.with_client_id(client_id);
        }

        if let Some(protocol) = protocol {
            entry = entry.with_protocol(protocol);
        }

        if let Some(data_size) = data_size {
            entry = entry.with_data_size(data_size);
        }

        self.add_log(entry).await
    }
}
