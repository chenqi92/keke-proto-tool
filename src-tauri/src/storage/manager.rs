// Storage manager for handling database connections and operations

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};

use super::{
    DatabaseConnection, 
    DataStorageRequest, 
    StorageMetrics, 
    StorageRule,
    ConnectionStatus,
    DatabaseType
};
use super::connector::{DatabaseConnector, StorageResult, StorageError, ConnectorRegistry};

/// Storage manager configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageManagerConfig {
    pub max_connections: usize,
    pub connection_timeout: u64,
    pub retry_attempts: u32,
    pub retry_delay: u64,
    pub batch_size: usize,
    pub flush_interval: u64,
    pub enable_metrics: bool,
    pub enable_rules: bool,
}

impl Default for StorageManagerConfig {
    fn default() -> Self {
        Self {
            max_connections: 10,
            connection_timeout: 5000,
            retry_attempts: 3,
            retry_delay: 1000,
            batch_size: 100,
            flush_interval: 5000,
            enable_metrics: true,
            enable_rules: true,
        }
    }
}

/// Storage manager events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StorageEvent {
    ConnectionStatusChanged {
        connection_id: String,
        status: ConnectionStatus,
        error: Option<String>,
    },
    DataStored {
        connection_id: String,
        record_count: u64,
        size: u64,
    },
    MetricsUpdated {
        connection_id: String,
        metrics: StorageMetrics,
    },
    RuleExecuted {
        rule_id: String,
        connection_id: String,
        success: bool,
        error: Option<String>,
    },
}

/// Main storage manager
pub struct StorageManager {
    config: StorageManagerConfig,
    connections: Arc<RwLock<HashMap<String, DatabaseConnection>>>,
    connectors: Arc<RwLock<HashMap<String, Box<dyn DatabaseConnector>>>>,
    rules: Arc<RwLock<Vec<StorageRule>>>,
    registry: ConnectorRegistry,
    event_sender: Option<tokio::sync::mpsc::UnboundedSender<StorageEvent>>,
}

impl StorageManager {
    /// Create a new storage manager
    pub fn new(config: StorageManagerConfig) -> Self {
        let mut registry = ConnectorRegistry::new();
        
        // Register built-in connector factories
        // Note: These would be implemented in their respective modules
        // registry.register_factory(Box::new(mysql::MySQLConnectorFactory::new()));
        // registry.register_factory(Box::new(influxdb::InfluxDBConnectorFactory::new()));
        // registry.register_factory(Box::new(redis::RedisConnectorFactory::new()));
        // registry.register_factory(Box::new(timescaledb::TimescaleDBConnectorFactory::new()));
        // registry.register_factory(Box::new(minio::MinIOConnectorFactory::new()));
        
        Self {
            config,
            connections: Arc::new(RwLock::new(HashMap::new())),
            connectors: Arc::new(RwLock::new(HashMap::new())),
            rules: Arc::new(RwLock::new(Vec::new())),
            registry,
            event_sender: None,
        }
    }
    
    /// Initialize the storage manager
    pub async fn initialize(&mut self) -> StorageResult<()> {
        // Load persisted connections and rules
        self.load_persisted_data().await?;
        
        // Set up event channel
        let (sender, mut receiver) = tokio::sync::mpsc::unbounded_channel();
        self.event_sender = Some(sender);
        
        // Start event processing task
        tokio::spawn(async move {
            while let Some(event) = receiver.recv().await {
                // Process storage events (logging, notifications, etc.)
                log::info!("Storage event: {:?}", event);
            }
        });
        
        Ok(())
    }
    
    /// Add a new database connection
    pub async fn add_connection(&self, mut connection: DatabaseConnection) -> StorageResult<String> {
        // Validate connection configuration
        self.validate_connection(&connection)?;
        
        // Generate ID if not provided
        if connection.id.is_empty() {
            connection.id = uuid::Uuid::new_v4().to_string();
        }
        
        // Set initial status
        connection.status = ConnectionStatus::Disconnected;
        connection.created_at = std::time::SystemTime::now();
        connection.updated_at = std::time::SystemTime::now();
        
        let connection_id = connection.id.clone();
        
        // Store connection
        {
            let mut connections = self.connections.write().await;
            connections.insert(connection_id.clone(), connection);
        }
        
        // Persist to storage
        self.persist_connections().await?;
        
        Ok(connection_id)
    }
    
    /// Update an existing connection
    pub async fn update_connection(&self, connection_id: &str, updates: DatabaseConnection) -> StorageResult<()> {
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(connection_id) {
            // Preserve certain fields
            let old_id = connection.id.clone();
            let old_created_at = connection.created_at;
            
            *connection = updates;
            connection.id = old_id;
            connection.created_at = old_created_at;
            connection.updated_at = std::time::SystemTime::now();
            
            drop(connections);
            self.persist_connections().await?;
            Ok(())
        } else {
            Err(StorageError::ConfigurationError(
                format!("Connection not found: {}", connection_id)
            ))
        }
    }
    
    /// Remove a connection
    pub async fn remove_connection(&self, connection_id: &str) -> StorageResult<()> {
        // Disconnect if connected
        if self.is_connected(connection_id).await {
            self.disconnect(connection_id).await?;
        }
        
        // Remove from storage
        {
            let mut connections = self.connections.write().await;
            connections.remove(connection_id);
        }
        
        self.persist_connections().await?;
        Ok(())
    }
    
    /// Get a connection by ID
    pub async fn get_connection(&self, connection_id: &str) -> Option<DatabaseConnection> {
        let connections = self.connections.read().await;
        connections.get(connection_id).cloned()
    }
    
    /// Get all connections
    pub async fn get_all_connections(&self) -> Vec<DatabaseConnection> {
        let connections = self.connections.read().await;
        connections.values().cloned().collect()
    }
    
    /// Connect to a database
    pub async fn connect(&self, connection_id: &str) -> StorageResult<()> {
        let connection = {
            let connections = self.connections.read().await;
            connections.get(connection_id).cloned()
                .ok_or_else(|| StorageError::ConfigurationError(
                    format!("Connection not found: {}", connection_id)
                ))?
        };
        
        // Update status to connecting
        self.update_connection_status(connection_id, ConnectionStatus::Connecting).await?;
        
        // Create connector
        let db_type_str = match connection.db_type {
            DatabaseType::MySQL5 => "mysql5",
            DatabaseType::MySQL8 => "mysql8",
            DatabaseType::InfluxDB => "influxdb",
            DatabaseType::Redis => "redis",
            DatabaseType::TimescaleDB => "timescaledb",
            DatabaseType::MinIO => "minio",
        };
        
        let mut connector = self.registry.create_connector(db_type_str)
            .ok_or_else(|| StorageError::ConfigurationError(
                format!("Unsupported database type: {:?}", connection.db_type)
            ))?;
        
        // Attempt connection
        match connector.connect(&connection).await {
            Ok(()) => {
                // Store connector
                {
                    let mut connectors = self.connectors.write().await;
                    connectors.insert(connection_id.to_string(), connector);
                }
                
                // Update status
                self.update_connection_status(connection_id, ConnectionStatus::Connected).await?;
                
                // Send event
                if let Some(sender) = &self.event_sender {
                    let _ = sender.send(StorageEvent::ConnectionStatusChanged {
                        connection_id: connection_id.to_string(),
                        status: ConnectionStatus::Connected,
                        error: None,
                    });
                }
                
                Ok(())
            }
            Err(error) => {
                self.update_connection_status(connection_id, ConnectionStatus::Error).await?;
                
                // Send event
                if let Some(sender) = &self.event_sender {
                    let _ = sender.send(StorageEvent::ConnectionStatusChanged {
                        connection_id: connection_id.to_string(),
                        status: ConnectionStatus::Error,
                        error: Some(error.to_string()),
                    });
                }
                
                Err(error)
            }
        }
    }
    
    /// Disconnect from a database
    pub async fn disconnect(&self, connection_id: &str) -> StorageResult<()> {
        let mut connectors = self.connectors.write().await;
        
        if let Some(mut connector) = connectors.remove(connection_id) {
            connector.disconnect().await?;
            
            self.update_connection_status(connection_id, ConnectionStatus::Disconnected).await?;
            
            // Send event
            if let Some(sender) = &self.event_sender {
                let _ = sender.send(StorageEvent::ConnectionStatusChanged {
                    connection_id: connection_id.to_string(),
                    status: ConnectionStatus::Disconnected,
                    error: None,
                });
            }
        }
        
        Ok(())
    }
    
    /// Test a connection
    pub async fn test_connection(&self, connection_id: &str) -> StorageResult<bool> {
        let connection = self.get_connection(connection_id).await
            .ok_or_else(|| StorageError::ConfigurationError(
                format!("Connection not found: {}", connection_id)
            ))?;
        
        let db_type_str = match connection.db_type {
            DatabaseType::MySQL5 => "mysql5",
            DatabaseType::MySQL8 => "mysql8",
            DatabaseType::InfluxDB => "influxdb",
            DatabaseType::Redis => "redis",
            DatabaseType::TimescaleDB => "timescaledb",
            DatabaseType::MinIO => "minio",
        };
        
        let mut connector = self.registry.create_connector(db_type_str)
            .ok_or_else(|| StorageError::ConfigurationError(
                format!("Unsupported database type: {:?}", connection.db_type)
            ))?;
        
        // Test connection
        connector.connect(&connection).await?;
        let result = connector.test_connection().await?;
        connector.disconnect().await?;
        
        Ok(result)
    }
    
    /// Check if a connection is active
    pub async fn is_connected(&self, connection_id: &str) -> bool {
        let connectors = self.connectors.read().await;
        connectors.get(connection_id)
            .map(|c| c.is_connected())
            .unwrap_or(false)
    }
    
    /// Store data using storage rules
    pub async fn store_data(&self, request: &DataStorageRequest) -> StorageResult<()> {
        if !self.config.enable_rules {
            // Store to first available connection
            return self.store_to_default(request).await;
        }
        
        let rules = self.rules.read().await;
        let applicable_rules: Vec<_> = rules.iter()
            .filter(|rule| rule.enabled)
            .filter(|rule| self.evaluate_rule_conditions(rule, request))
            .collect();
        
        for rule in applicable_rules {
            for action in &rule.actions {
                if let Err(error) = self.execute_storage_action(action, request).await {
                    // Send rule execution event
                    if let Some(sender) = &self.event_sender {
                        let _ = sender.send(StorageEvent::RuleExecuted {
                            rule_id: rule.id.clone(),
                            connection_id: action.target.clone(),
                            success: false,
                            error: Some(error.to_string()),
                        });
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// Get metrics for a connection
    pub async fn get_connection_metrics(&self, connection_id: &str) -> StorageResult<StorageMetrics> {
        let connectors = self.connectors.read().await;
        
        if let Some(connector) = connectors.get(connection_id) {
            connector.get_metrics().await
        } else {
            Err(StorageError::ConfigurationError(
                format!("Connection not found or not connected: {}", connection_id)
            ))
        }
    }
    
    // Private helper methods
    
    async fn update_connection_status(&self, connection_id: &str, status: ConnectionStatus) -> StorageResult<()> {
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(connection_id) {
            connection.set_status(status);
            Ok(())
        } else {
            Err(StorageError::ConfigurationError(
                format!("Connection not found: {}", connection_id)
            ))
        }
    }
    
    fn validate_connection(&self, connection: &DatabaseConnection) -> StorageResult<()> {
        let config = connection.db_type.config();
        
        // Validate required fields
        for field in &config.required_fields {
            match field.as_str() {
                "host" => {
                    if connection.host.is_empty() {
                        return Err(StorageError::ConfigurationError("Host is required".to_string()));
                    }
                }
                "port" => {
                    if connection.port == 0 {
                        return Err(StorageError::ConfigurationError("Port is required".to_string()));
                    }
                }
                "database" => {
                    if connection.database.is_none() || connection.database.as_ref().unwrap().is_empty() {
                        return Err(StorageError::ConfigurationError("Database is required".to_string()));
                    }
                }
                "username" => {
                    if connection.username.is_none() || connection.username.as_ref().unwrap().is_empty() {
                        return Err(StorageError::ConfigurationError("Username is required".to_string()));
                    }
                }
                _ => {}
            }
        }
        
        Ok(())
    }
    
    async fn load_persisted_data(&self) -> StorageResult<()> {
        // In a real implementation, this would load from a persistent store
        // For now, we'll just initialize with empty data
        Ok(())
    }
    
    async fn persist_connections(&self) -> StorageResult<()> {
        // In a real implementation, this would persist to a file or database
        // For now, we'll just log the operation
        log::info!("Persisting connections to storage");
        Ok(())
    }
    
    async fn store_to_default(&self, request: &DataStorageRequest) -> StorageResult<()> {
        let connectors = self.connectors.read().await;
        
        if let Some((_, connector)) = connectors.iter().next() {
            connector.store(request).await
        } else {
            Err(StorageError::ConfigurationError("No connections available".to_string()))
        }
    }
    
    fn evaluate_rule_conditions(&self, _rule: &StorageRule, _request: &DataStorageRequest) -> bool {
        // Simplified rule evaluation - would be more complex in real implementation
        true
    }
    
    async fn execute_storage_action(&self, action: &super::StorageAction, request: &DataStorageRequest) -> StorageResult<()> {
        let connectors = self.connectors.read().await;
        
        if let Some(connector) = connectors.get(&action.target) {
            connector.store(request).await
        } else {
            Err(StorageError::ConfigurationError(
                format!("Target connection not found: {}", action.target)
            ))
        }
    }
}
