use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::path::PathBuf;
use uuid::Uuid;

pub mod manager;
pub mod export;

pub use manager::LogManager;
pub use export::ExportFormat;

/// Log entry structure matching the frontend LogEntry interface
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub source: String,
    pub message: String,
    pub session_id: Option<String>,
    pub session_name: Option<String>,
    pub details: Option<serde_json::Value>,
    // Extended fields for detailed log classification
    pub category: Option<LogCategory>,
    pub direction: Option<Direction>,
    pub client_id: Option<String>,
    pub protocol: Option<String>,
    pub data_size: Option<i64>,
    pub connection_type: Option<ConnectionType>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TEXT")]
pub enum LogLevel {
    #[sqlx(rename = "info")]
    Info,
    #[sqlx(rename = "warning")]
    Warning,
    #[sqlx(rename = "error")]
    Error,
    #[sqlx(rename = "debug")]
    Debug,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TEXT")]
pub enum LogCategory {
    #[sqlx(rename = "network")]
    Network,
    #[sqlx(rename = "protocol")]
    Protocol,
    #[sqlx(rename = "system")]
    System,
    #[sqlx(rename = "console")]
    Console,
    #[sqlx(rename = "message")]
    Message,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TEXT")]
pub enum Direction {
    #[sqlx(rename = "in")]
    In,
    #[sqlx(rename = "out")]
    Out,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "TEXT")]
pub enum ConnectionType {
    #[sqlx(rename = "client")]
    Client,
    #[sqlx(rename = "server")]
    Server,
}

/// Filter criteria for querying logs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogFilter {
    pub session_id: Option<String>,
    pub level: Option<LogLevel>,
    pub category: Option<LogCategory>,
    pub time_range: Option<TimeRange>,
    pub search_query: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TimeRange {
    All,
    Today,
    Hours24,
    Days7,
    Days30,
}

impl Default for LogFilter {
    fn default() -> Self {
        Self {
            session_id: None,
            level: None,
            category: None,
            time_range: Some(TimeRange::All),
            search_query: None,
            limit: Some(1000),
            offset: Some(0),
        }
    }
}

/// Database schema initialization
pub const INIT_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    level TEXT NOT NULL,
    source TEXT NOT NULL,
    message TEXT NOT NULL,
    session_id TEXT,
    session_name TEXT,
    details TEXT,
    category TEXT,
    direction TEXT,
    client_id TEXT,
    protocol TEXT,
    data_size INTEGER,
    connection_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
"#;

impl LogEntry {
    pub fn new(
        level: LogLevel,
        source: String,
        message: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            level,
            source,
            message,
            session_id: None,
            session_name: None,
            details: None,
            category: None,
            direction: None,
            client_id: None,
            protocol: None,
            data_size: None,
            connection_type: None,
        }
    }

    pub fn with_session(mut self, session_id: String, session_name: Option<String>) -> Self {
        self.session_id = Some(session_id);
        self.session_name = session_name;
        self
    }

    pub fn with_category(mut self, category: LogCategory) -> Self {
        self.category = Some(category);
        self
    }

    pub fn with_direction(mut self, direction: Direction) -> Self {
        self.direction = Some(direction);
        self
    }

    pub fn with_client_id(mut self, client_id: String) -> Self {
        self.client_id = Some(client_id);
        self
    }

    pub fn with_protocol(mut self, protocol: String) -> Self {
        self.protocol = Some(protocol);
        self
    }

    pub fn with_data_size(mut self, data_size: i64) -> Self {
        self.data_size = Some(data_size);
        self
    }

    pub fn with_connection_type(mut self, connection_type: ConnectionType) -> Self {
        self.connection_type = Some(connection_type);
        self
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}
