// Database connector trait and common types

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

use super::{DatabaseConnection, DataStorageRequest, StorageMetrics};

/// Result type for storage operations
pub type StorageResult<T> = Result<T, StorageError>;

/// Storage operation errors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StorageError {
    ConnectionFailed(String),
    AuthenticationFailed(String),
    QueryFailed(String),
    DataSerializationFailed(String),
    ConfigurationError(String),
    NetworkError(String),
    TimeoutError(String),
    UnknownError(String),
}

impl fmt::Display for StorageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StorageError::ConnectionFailed(msg) => write!(f, "Connection failed: {}", msg),
            StorageError::AuthenticationFailed(msg) => write!(f, "Authentication failed: {}", msg),
            StorageError::QueryFailed(msg) => write!(f, "Query failed: {}", msg),
            StorageError::DataSerializationFailed(msg) => write!(f, "Data serialization failed: {}", msg),
            StorageError::ConfigurationError(msg) => write!(f, "Configuration error: {}", msg),
            StorageError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            StorageError::TimeoutError(msg) => write!(f, "Timeout error: {}", msg),
            StorageError::UnknownError(msg) => write!(f, "Unknown error: {}", msg),
        }
    }
}

impl std::error::Error for StorageError {}

/// Database connector trait
/// 
/// This trait defines the interface that all database connectors must implement.
/// It provides a consistent API for connecting to different database types,
/// storing data, and retrieving metrics.
#[async_trait]
pub trait DatabaseConnector: Send + Sync {
    /// Connect to the database using the provided configuration
    async fn connect(&mut self, config: &DatabaseConnection) -> StorageResult<()>;
    
    /// Disconnect from the database
    async fn disconnect(&mut self) -> StorageResult<()>;
    
    /// Test the database connection
    async fn test_connection(&self) -> StorageResult<bool>;
    
    /// Store data in the database
    async fn store(&self, request: &DataStorageRequest) -> StorageResult<()>;
    
    /// Execute a query and return results
    async fn query(&self, query: &str, params: Option<Vec<serde_json::Value>>) -> StorageResult<Vec<HashMap<String, serde_json::Value>>>;
    
    /// Get connection metrics
    async fn get_metrics(&self) -> StorageResult<StorageMetrics>;
    
    /// Check if the connector is currently connected
    fn is_connected(&self) -> bool;
    
    /// Get the connector type name
    fn connector_type(&self) -> &'static str;
    
    /// Get connector-specific configuration schema
    fn config_schema(&self) -> serde_json::Value;
    
    /// Validate configuration before connecting
    fn validate_config(&self, config: &DatabaseConnection) -> StorageResult<()>;
}

/// Connection pool configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolConfig {
    pub max_connections: u32,
    pub min_connections: u32,
    pub connection_timeout: u64, // seconds
    pub idle_timeout: u64,       // seconds
    pub max_lifetime: u64,       // seconds
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            max_connections: 10,
            min_connections: 1,
            connection_timeout: 30,
            idle_timeout: 600,
            max_lifetime: 3600,
        }
    }
}

/// Connector factory trait
/// 
/// This trait is used to create new instances of database connectors.
/// Each database type should implement this trait to provide a factory
/// for creating connectors.
pub trait ConnectorFactory: Send + Sync {
    /// Create a new connector instance
    fn create_connector(&self) -> Box<dyn DatabaseConnector>;
    
    /// Get the database type this factory creates connectors for
    fn database_type(&self) -> &'static str;
    
    /// Get the display name for this database type
    fn display_name(&self) -> &'static str;
    
    /// Get the default configuration for this database type
    fn default_config(&self) -> HashMap<String, serde_json::Value>;
}

/// Registry for database connector factories
pub struct ConnectorRegistry {
    factories: HashMap<String, Box<dyn ConnectorFactory>>,
}

impl ConnectorRegistry {
    /// Create a new connector registry
    pub fn new() -> Self {
        Self {
            factories: HashMap::new(),
        }
    }
    
    /// Register a connector factory
    pub fn register_factory(&mut self, factory: Box<dyn ConnectorFactory>) {
        let db_type = factory.database_type().to_string();
        self.factories.insert(db_type, factory);
    }
    
    /// Create a connector for the specified database type
    pub fn create_connector(&self, db_type: &str) -> Option<Box<dyn DatabaseConnector>> {
        self.factories.get(db_type).map(|factory| factory.create_connector())
    }
    
    /// Get all registered database types
    pub fn get_supported_types(&self) -> Vec<String> {
        self.factories.keys().cloned().collect()
    }
    
    /// Get factory for a database type
    pub fn get_factory(&self, db_type: &str) -> Option<&dyn ConnectorFactory> {
        self.factories.get(db_type).map(|f| f.as_ref())
    }
}

impl Default for ConnectorRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Base connector implementation with common functionality
pub struct BaseConnector {
    pub connected: bool,
    pub connection_id: String,
    pub metrics: StorageMetrics,
}

impl BaseConnector {
    pub fn new(connection_id: String) -> Self {
        Self {
            connected: false,
            connection_id: connection_id.clone(),
            metrics: StorageMetrics {
                connection_id,
                total_records: 0,
                total_size: 0,
                avg_response_time: 0.0,
                error_rate: 0.0,
                last_activity: std::time::SystemTime::now(),
            },
        }
    }
    
    /// Update metrics after an operation
    pub fn update_metrics(&mut self, records: u64, size: u64, response_time: f64, success: bool) {
        self.metrics.total_records += records;
        self.metrics.total_size += size;
        
        // Update average response time (simple moving average)
        self.metrics.avg_response_time = (self.metrics.avg_response_time + response_time) / 2.0;
        
        // Update error rate
        if !success {
            self.metrics.error_rate = (self.metrics.error_rate + 1.0) / 2.0;
        } else {
            self.metrics.error_rate = self.metrics.error_rate * 0.9; // Decay error rate on success
        }
        
        self.metrics.last_activity = std::time::SystemTime::now();
    }
}

/// Utility functions for connectors
pub mod utils {
    use super::*;
    
    /// Build connection string from configuration
    pub fn build_connection_string(
        template: &str,
        config: &DatabaseConnection,
    ) -> String {
        let mut connection_string = template.to_string();
        
        connection_string = connection_string.replace("{host}", &config.host);
        connection_string = connection_string.replace("{port}", &config.port.to_string());
        
        if let Some(database) = &config.database {
            connection_string = connection_string.replace("{database}", database);
        }
        
        if let Some(username) = &config.username {
            connection_string = connection_string.replace("{username}", username);
        }
        
        if let Some(password) = &config.password {
            connection_string = connection_string.replace("{password}", password);
        }
        
        connection_string
    }
    
    /// Validate required fields in configuration
    pub fn validate_required_fields(
        config: &DatabaseConnection,
        required_fields: &[String],
    ) -> StorageResult<()> {
        for field in required_fields {
            match field.as_str() {
                "host" => {
                    if config.host.is_empty() {
                        return Err(StorageError::ConfigurationError(
                            "Host is required".to_string()
                        ));
                    }
                }
                "port" => {
                    if config.port == 0 {
                        return Err(StorageError::ConfigurationError(
                            "Port is required".to_string()
                        ));
                    }
                }
                "database" => {
                    if config.database.is_none() || config.database.as_ref().unwrap().is_empty() {
                        return Err(StorageError::ConfigurationError(
                            "Database is required".to_string()
                        ));
                    }
                }
                "username" => {
                    if config.username.is_none() || config.username.as_ref().unwrap().is_empty() {
                        return Err(StorageError::ConfigurationError(
                            "Username is required".to_string()
                        ));
                    }
                }
                _ => {
                    // Check in config map
                    if !config.config.contains_key(field) {
                        return Err(StorageError::ConfigurationError(
                            format!("{} is required", field)
                        ));
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Serialize data for storage
    pub fn serialize_data(data: &serde_json::Value) -> StorageResult<Vec<u8>> {
        serde_json::to_vec(data)
            .map_err(|e| StorageError::DataSerializationFailed(e.to_string()))
    }
    
    /// Deserialize data from storage
    pub fn deserialize_data(data: &[u8]) -> StorageResult<serde_json::Value> {
        serde_json::from_slice(data)
            .map_err(|e| StorageError::DataSerializationFailed(e.to_string()))
    }
}
