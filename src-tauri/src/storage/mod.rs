// Storage module for ProtoTool
// Provides database connectivity and data storage capabilities

pub mod connector;
pub mod manager;
pub mod mysql;
// TODO: Implement these storage modules
// pub mod influxdb;
// pub mod redis;
// pub mod timescaledb;
// pub mod minio;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::SystemTime;
use async_trait::async_trait;
use uuid;

// Re-export main types
pub use connector::{DatabaseConnector, StorageResult, StorageError};
pub use manager::StorageManager;

/// Database connection types supported by ProtoTool
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseType {
    #[serde(rename = "mysql5")]
    MySQL5,
    #[serde(rename = "mysql8")]
    MySQL8,
    #[serde(rename = "influxdb")]
    InfluxDB,
    #[serde(rename = "redis")]
    Redis,
    #[serde(rename = "timescaledb")]
    TimescaleDB,
    #[serde(rename = "minio")]
    MinIO,
}

/// Connection status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionStatus {
    Connected,
    Disconnected,
    Connecting,
    Error,
}

/// Database connection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConnection {
    pub id: String,
    pub name: String,
    pub db_type: DatabaseType,
    pub host: String,
    pub port: u16,
    pub database: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub ssl: Option<bool>,
    pub status: ConnectionStatus,
    pub last_connected: Option<SystemTime>,
    pub config: HashMap<String, serde_json::Value>,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

/// Data storage request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataStorageRequest {
    pub session_id: String,
    pub protocol: String,
    pub data: serde_json::Value,
    pub metadata: DataMetadata,
}

/// Metadata for stored data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataMetadata {
    pub timestamp: SystemTime,
    pub direction: DataDirection,
    pub size: usize,
    pub format: String,
}

/// Data direction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DataDirection {
    Inbound,
    Outbound,
}

/// Storage metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageMetrics {
    pub connection_id: String,
    pub total_records: u64,
    pub total_size: u64,
    pub avg_response_time: f64,
    pub error_rate: f64,
    pub last_activity: SystemTime,
}

/// Storage rule condition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageCondition {
    pub field: String,
    pub operator: ConditionOperator,
    pub value: serde_json::Value,
    pub logical_operator: Option<LogicalOperator>,
}

/// Condition operators
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConditionOperator {
    Equals,
    Contains,
    StartsWith,
    EndsWith,
    Regex,
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
}

/// Logical operators for combining conditions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum LogicalOperator {
    And,
    Or,
}

/// Storage action
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageAction {
    pub action_type: ActionType,
    pub target: String,
    pub table: Option<String>,
    pub collection: Option<String>,
    pub bucket: Option<String>,
    pub transformation: Option<String>,
    pub config: HashMap<String, serde_json::Value>,
}

/// Action types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ActionType {
    Store,
    Transform,
    Filter,
    Route,
}

/// Storage rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub enabled: bool,
    pub conditions: Vec<StorageCondition>,
    pub actions: Vec<StorageAction>,
    pub priority: u32,
    pub created_at: SystemTime,
    pub updated_at: SystemTime,
}

/// Database configuration template
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub name: String,
    pub icon: String,
    pub color: String,
    pub bg_color: String,
    pub default_port: u16,
    pub category: DatabaseCategory,
    pub required_fields: Vec<String>,
    pub optional_fields: Vec<String>,
    pub connection_string_template: Option<String>,
}

/// Database categories
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseCategory {
    Relational,
    Timeseries,
    Cache,
    Object,
}

impl DatabaseType {
    /// Get the configuration for this database type
    pub fn config(&self) -> DatabaseConfig {
        match self {
            DatabaseType::MySQL5 => DatabaseConfig {
                name: "MySQL 5.x".to_string(),
                icon: "Database".to_string(),
                color: "text-blue-600".to_string(),
                bg_color: "bg-blue-50".to_string(),
                default_port: 3306,
                category: DatabaseCategory::Relational,
                required_fields: vec!["host".to_string(), "port".to_string(), "database".to_string(), "username".to_string()],
                optional_fields: vec!["password".to_string(), "ssl".to_string(), "charset".to_string(), "timezone".to_string()],
                connection_string_template: Some("mysql://{username}:{password}@{host}:{port}/{database}".to_string()),
            },
            DatabaseType::MySQL8 => DatabaseConfig {
                name: "MySQL 8.x".to_string(),
                icon: "Database".to_string(),
                color: "text-blue-700".to_string(),
                bg_color: "bg-blue-100".to_string(),
                default_port: 3306,
                category: DatabaseCategory::Relational,
                required_fields: vec!["host".to_string(), "port".to_string(), "database".to_string(), "username".to_string()],
                optional_fields: vec!["password".to_string(), "ssl".to_string(), "charset".to_string(), "timezone".to_string(), "auth_plugin".to_string()],
                connection_string_template: Some("mysql://{username}:{password}@{host}:{port}/{database}".to_string()),
            },
            DatabaseType::InfluxDB => DatabaseConfig {
                name: "InfluxDB v1".to_string(),
                icon: "Activity".to_string(),
                color: "text-purple-600".to_string(),
                bg_color: "bg-purple-50".to_string(),
                default_port: 8086,
                category: DatabaseCategory::Timeseries,
                required_fields: vec!["host".to_string(), "port".to_string(), "database".to_string()],
                optional_fields: vec!["username".to_string(), "password".to_string(), "ssl".to_string(), "precision".to_string(), "retention_policy".to_string()],
                connection_string_template: Some("http://{host}:{port}".to_string()),
            },
            DatabaseType::Redis => DatabaseConfig {
                name: "Redis".to_string(),
                icon: "Server".to_string(),
                color: "text-red-600".to_string(),
                bg_color: "bg-red-50".to_string(),
                default_port: 6379,
                category: DatabaseCategory::Cache,
                required_fields: vec!["host".to_string(), "port".to_string()],
                optional_fields: vec!["password".to_string(), "database".to_string(), "ssl".to_string(), "key_prefix".to_string(), "ttl".to_string()],
                connection_string_template: Some("redis://:{password}@{host}:{port}/{database}".to_string()),
            },
            DatabaseType::TimescaleDB => DatabaseConfig {
                name: "TimescaleDB".to_string(),
                icon: "HardDrive".to_string(),
                color: "text-green-600".to_string(),
                bg_color: "bg-green-50".to_string(),
                default_port: 5432,
                category: DatabaseCategory::Timeseries,
                required_fields: vec!["host".to_string(), "port".to_string(), "database".to_string(), "username".to_string()],
                optional_fields: vec!["password".to_string(), "ssl".to_string(), "schema".to_string(), "application_name".to_string()],
                connection_string_template: Some("postgresql://{username}:{password}@{host}:{port}/{database}".to_string()),
            },
            DatabaseType::MinIO => DatabaseConfig {
                name: "MinIO".to_string(),
                icon: "Cloud".to_string(),
                color: "text-orange-600".to_string(),
                bg_color: "bg-orange-50".to_string(),
                default_port: 9000,
                category: DatabaseCategory::Object,
                required_fields: vec!["host".to_string(), "port".to_string(), "access_key".to_string(), "secret_key".to_string()],
                optional_fields: vec!["ssl".to_string(), "region".to_string(), "bucket".to_string()],
                connection_string_template: Some("http://{host}:{port}".to_string()),
            },
        }
    }

    /// Get all supported database types
    pub fn all() -> Vec<DatabaseType> {
        vec![
            DatabaseType::MySQL5,
            DatabaseType::MySQL8,
            DatabaseType::InfluxDB,
            DatabaseType::Redis,
            DatabaseType::TimescaleDB,
            DatabaseType::MinIO,
        ]
    }
}

impl Default for ConnectionStatus {
    fn default() -> Self {
        ConnectionStatus::Disconnected
    }
}

impl DatabaseConnection {
    /// Create a new database connection
    pub fn new(
        name: String,
        db_type: DatabaseType,
        host: String,
        port: u16,
    ) -> Self {
        let now = SystemTime::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            db_type,
            host,
            port,
            database: None,
            username: None,
            password: None,
            ssl: None,
            status: ConnectionStatus::default(),
            last_connected: None,
            config: HashMap::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Update the connection status
    pub fn set_status(&mut self, status: ConnectionStatus) {
        self.status = status;
        self.updated_at = SystemTime::now();
        
        if status == ConnectionStatus::Connected {
            self.last_connected = Some(SystemTime::now());
        }
    }

    /// Check if the connection is active
    pub fn is_connected(&self) -> bool {
        self.status == ConnectionStatus::Connected
    }

    /// Get connection string (without password for logging)
    pub fn connection_string_safe(&self) -> String {
        format!("{}://{}@{}:{}/{}", 
            match self.db_type {
                DatabaseType::MySQL5 | DatabaseType::MySQL8 => "mysql",
                DatabaseType::InfluxDB => "http",
                DatabaseType::Redis => "redis",
                DatabaseType::TimescaleDB => "postgresql",
                DatabaseType::MinIO => "http",
            },
            self.username.as_deref().unwrap_or(""),
            self.host,
            self.port,
            self.database.as_deref().unwrap_or("")
        )
    }
}
