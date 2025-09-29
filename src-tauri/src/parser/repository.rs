//! Protocol Repository System
//! 
//! This module provides a comprehensive protocol repository system that manages
//! stored protocol definitions in the application data directory. It supports
//! importing, exporting, and managing protocol rule files with metadata tracking.

use crate::parser::schema::ProtocolRule;
use crate::parser::rules::RulesLoader;
use crate::parser::ProtocolParser;
use crate::types::{NetworkResult, NetworkError};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Protocol repository for managing stored protocol definitions
pub struct ProtocolRepository {
    /// Repository root directory
    repository_path: PathBuf,
    
    /// Protocol metadata cache
    metadata_cache: HashMap<String, ProtocolMetadata>,
    
    /// Rules loader for parsing protocol files
    rules_loader: RulesLoader,
}

/// Metadata for a stored protocol
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolMetadata {
    /// Unique protocol ID
    pub id: String,
    
    /// Protocol name
    pub name: String,
    
    /// Protocol version
    pub version: String,
    
    /// Author information
    pub author: String,
    
    /// Protocol description
    pub description: String,
    
    /// Protocol category
    pub category: String,
    
    /// Tags for classification
    pub tags: Vec<String>,
    
    /// File name in repository
    pub filename: String,
    
    /// File size in bytes
    pub file_size: u64,
    
    /// Import timestamp
    pub imported_at: DateTime<Utc>,
    
    /// Last modified timestamp
    pub modified_at: DateTime<Utc>,
    
    /// Whether the protocol is enabled
    pub enabled: bool,
    
    /// Protocol validation status
    pub validation_status: ValidationStatus,
    
    /// Additional metadata
    pub extra: HashMap<String, serde_json::Value>,
}

/// Protocol validation status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationStatus {
    Valid,
    Invalid(String),
    NotValidated,
}

/// Protocol import request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolImportRequest {
    /// Protocol content (YAML)
    pub content: String,
    
    /// Optional custom name
    pub custom_name: Option<String>,
    
    /// Optional custom category
    pub custom_category: Option<String>,
    
    /// Optional tags
    pub tags: Vec<String>,
    
    /// Whether to enable the protocol immediately
    pub enabled: bool,
}

/// Protocol export options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolExportOptions {
    /// Protocol ID to export
    pub protocol_id: String,
    
    /// Export path
    pub export_path: PathBuf,
    
    /// Whether to include metadata
    pub include_metadata: bool,
}

impl ProtocolRepository {
    /// Create a new protocol repository
    pub fn new<P: AsRef<Path>>(repository_path: P) -> NetworkResult<Self> {
        let repository_path = repository_path.as_ref().to_path_buf();
        
        // Ensure repository directory exists
        fs::create_dir_all(&repository_path)
            .map_err(|e| NetworkError::ParseError(format!("Failed to create repository directory: {}", e)))?;
        
        // Create subdirectories
        let protocols_dir = repository_path.join("protocols");
        let metadata_dir = repository_path.join("metadata");
        
        fs::create_dir_all(&protocols_dir)
            .map_err(|e| NetworkError::ParseError(format!("Failed to create protocols directory: {}", e)))?;
        
        fs::create_dir_all(&metadata_dir)
            .map_err(|e| NetworkError::ParseError(format!("Failed to create metadata directory: {}", e)))?;
        
        let mut repository = Self {
            repository_path,
            metadata_cache: HashMap::new(),
            rules_loader: RulesLoader::new(),
        };
        
        // Load existing protocols
        repository.load_existing_protocols()?;
        
        Ok(repository)
    }
    
    /// Import a protocol from content
    pub fn import_protocol(&mut self, request: ProtocolImportRequest) -> NetworkResult<String> {
        // Parse the protocol rule to validate it
        let rule = self.rules_loader.load_rule_from_string(&request.content)?;
        
        // Generate unique ID
        let protocol_id = Uuid::new_v4().to_string();
        
        // Determine filename
        let filename = format!("{}.kkp.yaml", sanitize_filename(&rule.meta.name));
        let file_path = self.repository_path.join("protocols").join(&filename);
        
        // Check if file already exists
        if file_path.exists() {
            return Err(NetworkError::ParseError(format!(
                "Protocol file '{}' already exists",
                filename
            )));
        }
        
        // Write protocol file
        fs::write(&file_path, &request.content)
            .map_err(|e| NetworkError::ParseError(format!("Failed to write protocol file: {}", e)))?;
        
        // Create metadata
        let now = Utc::now();
        let metadata = ProtocolMetadata {
            id: protocol_id.clone(),
            name: request.custom_name.unwrap_or(rule.meta.name.clone()),
            version: rule.meta.version.clone(),
            author: rule.meta.author.clone(),
            description: rule.meta.description.clone(),
            category: request.custom_category.unwrap_or(rule.meta.category.clone()),
            tags: request.tags,
            filename: filename.clone(),
            file_size: request.content.len() as u64,
            imported_at: now,
            modified_at: now,
            enabled: request.enabled,
            validation_status: ValidationStatus::Valid,
            extra: HashMap::new(),
        };
        
        // Save metadata
        self.save_metadata(&metadata)?;
        
        // Cache metadata
        self.metadata_cache.insert(protocol_id.clone(), metadata);
        
        log::info!("Imported protocol '{}' with ID: {}", rule.meta.name, protocol_id);
        
        Ok(protocol_id)
    }
    
    /// Export a protocol
    pub fn export_protocol(&self, options: ProtocolExportOptions) -> NetworkResult<PathBuf> {
        let metadata = self.get_protocol_metadata(&options.protocol_id)?;
        let protocol_path = self.repository_path.join("protocols").join(&metadata.filename);
        
        // Read protocol content
        let content = fs::read_to_string(&protocol_path)
            .map_err(|e| NetworkError::ParseError(format!("Failed to read protocol file: {}", e)))?;
        
        // Write to export path
        fs::write(&options.export_path, &content)
            .map_err(|e| NetworkError::ParseError(format!("Failed to export protocol: {}", e)))?;
        
        log::info!("Exported protocol '{}' to: {}", metadata.name, options.export_path.display());
        
        Ok(options.export_path)
    }
    
    /// Get protocol metadata by ID
    pub fn get_protocol_metadata(&self, protocol_id: &str) -> NetworkResult<&ProtocolMetadata> {
        self.metadata_cache.get(protocol_id)
            .ok_or_else(|| NetworkError::ParseError(format!("Protocol not found: {}", protocol_id)))
    }
    
    /// List all protocols
    pub fn list_protocols(&self) -> Vec<&ProtocolMetadata> {
        self.metadata_cache.values().collect()
    }
    
    /// List enabled protocols
    pub fn list_enabled_protocols(&self) -> Vec<&ProtocolMetadata> {
        self.metadata_cache.values()
            .filter(|metadata| metadata.enabled)
            .collect()
    }
    
    /// Delete a protocol
    pub fn delete_protocol(&mut self, protocol_id: &str) -> NetworkResult<()> {
        let metadata = self.get_protocol_metadata(protocol_id)?.clone();
        
        // Delete protocol file
        let protocol_path = self.repository_path.join("protocols").join(&metadata.filename);
        if protocol_path.exists() {
            fs::remove_file(&protocol_path)
                .map_err(|e| NetworkError::ParseError(format!("Failed to delete protocol file: {}", e)))?;
        }
        
        // Delete metadata file
        let metadata_path = self.repository_path.join("metadata").join(format!("{}.json", protocol_id));
        if metadata_path.exists() {
            fs::remove_file(&metadata_path)
                .map_err(|e| NetworkError::ParseError(format!("Failed to delete metadata file: {}", e)))?;
        }
        
        // Remove from cache
        self.metadata_cache.remove(protocol_id);
        
        log::info!("Deleted protocol '{}' with ID: {}", metadata.name, protocol_id);
        
        Ok(())
    }
    
    /// Enable or disable a protocol
    pub fn set_protocol_enabled(&mut self, protocol_id: &str, enabled: bool) -> NetworkResult<()> {
        // First, update the metadata
        {
            let metadata = self.metadata_cache.get_mut(protocol_id)
                .ok_or_else(|| NetworkError::ParseError(format!("Protocol not found: {}", protocol_id)))?;

            metadata.enabled = enabled;
            metadata.modified_at = Utc::now();
        }

        // Then save the metadata (need to get it again to avoid borrowing issues)
        let metadata = self.metadata_cache.get(protocol_id).unwrap().clone();
        self.save_metadata(&metadata)?;

        log::info!("Set protocol '{}' enabled: {}", metadata.name, enabled);

        Ok(())
    }
    
    /// Load a protocol rule by ID
    pub fn load_protocol_rule(&mut self, protocol_id: &str) -> NetworkResult<ProtocolRule> {
        let metadata = self.get_protocol_metadata(protocol_id)?;
        let protocol_path = self.repository_path.join("protocols").join(&metadata.filename);
        
        self.rules_loader.load_rule(&protocol_path)
    }
    
    /// Create a protocol parser by ID
    pub fn create_protocol_parser(&mut self, protocol_id: &str) -> NetworkResult<ProtocolParser> {
        let rule = self.load_protocol_rule(protocol_id)?;
        ProtocolParser::from_rule(protocol_id.to_string(), rule)
    }
    
    /// Load existing protocols from repository
    fn load_existing_protocols(&mut self) -> NetworkResult<()> {
        let metadata_dir = self.repository_path.join("metadata");
        
        if !metadata_dir.exists() {
            return Ok(());
        }
        
        let entries = fs::read_dir(&metadata_dir)
            .map_err(|e| NetworkError::ParseError(format!("Failed to read metadata directory: {}", e)))?;
        
        for entry in entries {
            let entry = entry.map_err(|e| NetworkError::ParseError(format!("Failed to read directory entry: {}", e)))?;
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                match self.load_metadata_file(&path) {
                    Ok(metadata) => {
                        self.metadata_cache.insert(metadata.id.clone(), metadata);
                    }
                    Err(e) => {
                        log::warn!("Failed to load metadata file {}: {}", path.display(), e);
                    }
                }
            }
        }
        
        log::info!("Loaded {} protocols from repository", self.metadata_cache.len());
        
        Ok(())
    }
    
    /// Save metadata to file
    fn save_metadata(&self, metadata: &ProtocolMetadata) -> NetworkResult<()> {
        let metadata_path = self.repository_path.join("metadata").join(format!("{}.json", metadata.id));
        let content = serde_json::to_string_pretty(metadata)
            .map_err(|e| NetworkError::ParseError(format!("Failed to serialize metadata: {}", e)))?;
        
        fs::write(&metadata_path, content)
            .map_err(|e| NetworkError::ParseError(format!("Failed to write metadata file: {}", e)))?;
        
        Ok(())
    }
    
    /// Load metadata from file
    fn load_metadata_file(&self, path: &Path) -> NetworkResult<ProtocolMetadata> {
        let content = fs::read_to_string(path)
            .map_err(|e| NetworkError::ParseError(format!("Failed to read metadata file: {}", e)))?;
        
        let metadata: ProtocolMetadata = serde_json::from_str(&content)
            .map_err(|e| NetworkError::ParseError(format!("Failed to parse metadata: {}", e)))?;
        
        Ok(metadata)
    }
}

/// Sanitize filename for cross-platform compatibility
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    
    #[test]
    fn test_sanitize_filename() {
        assert_eq!(sanitize_filename("Test Protocol"), "Test Protocol");
        assert_eq!(sanitize_filename("Test/Protocol"), "Test_Protocol");
        assert_eq!(sanitize_filename("Test:Protocol*"), "Test_Protocol_");
    }
    
    #[test]
    fn test_repository_creation() {
        let temp_dir = TempDir::new().unwrap();
        let repo = ProtocolRepository::new(temp_dir.path());
        assert!(repo.is_ok());
        
        let repo = repo.unwrap();
        assert!(temp_dir.path().join("protocols").exists());
        assert!(temp_dir.path().join("metadata").exists());
        assert_eq!(repo.list_protocols().len(), 0);
    }
}
