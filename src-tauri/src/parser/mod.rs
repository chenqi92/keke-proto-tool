//! Protocol parsing engine for ProtoTool
//! 
//! This module provides a comprehensive protocol parsing system that supports:
//! - YAML-based rule definitions (.kkp.yaml files)
//! - Frame synchronization and boundary detection
//! - Field parsing with various data types
//! - Validation and error reporting
//! - Protocol auto-identification
//! - Caching for performance optimization

use crate::types::NetworkResult;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Core parsing modules
pub mod schema;
pub mod rules;
pub mod compiler;
pub mod cache;
pub mod framing;
pub mod state_machine;
pub mod escape;
pub mod types;
pub mod complex_types;
pub mod bitfield;
pub mod conditional;
pub mod crc_validator;
pub mod custom_validator;
pub mod range_validator;
pub mod validation_report;
pub mod result;
pub mod fingerprint;
pub mod protocol_matcher;
pub mod protocol_parser;
pub mod repository;
pub mod factor_translator;

// Re-export key types for convenience
pub use result::*;
pub use validation_report::*;
pub use protocol_parser::ProtocolParser;
pub use repository::{ProtocolRepository, ProtocolMetadata, ProtocolImportRequest, ProtocolExportOptions, ValidationStatus};
pub use factor_translator::{FactorTranslator, FactorDefinition, ParsedFactor, FactorValue, FactorSummary};

/// Main parser interface that all protocol parsers must implement
pub trait Parser: Send + Sync {
    /// Parse raw data using the configured rules
    fn parse(&self, data: &[u8]) -> NetworkResult<ParseResult>;
    
    /// Validate a parse result against the rules
    fn validate(&self, result: &ParseResult) -> ValidationReport;
    
    /// Get information about the protocol this parser handles
    fn get_protocol_info(&self) -> ProtocolInfo;
    
    /// Get the parser's unique identifier
    fn get_id(&self) -> &str;
    
    /// Check if this parser can handle the given data
    fn can_parse(&self, data: &[u8]) -> bool;
}

/// Protocol information structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolInfo {
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub supported_formats: Vec<String>,
    pub magic_bytes: Option<Vec<u8>>,
    pub min_frame_size: Option<usize>,
    pub max_frame_size: Option<usize>,
}

/// Parser registry for managing multiple protocol parsers
pub struct ParserRegistry {
    parsers: HashMap<String, Box<dyn Parser>>,
    auto_detect_order: Vec<String>,
    repository: Option<ProtocolRepository>,
}

impl ParserRegistry {
    /// Create a new parser registry
    pub fn new() -> Self {
        Self {
            parsers: HashMap::new(),
            auto_detect_order: Vec::new(),
            repository: None,
        }
    }

    /// Create a new parser registry with protocol repository
    pub fn with_repository(repository: ProtocolRepository) -> Self {
        Self {
            parsers: HashMap::new(),
            auto_detect_order: Vec::new(),
            repository: Some(repository),
        }
    }

    /// Set the protocol repository
    pub fn set_repository(&mut self, repository: ProtocolRepository) {
        self.repository = Some(repository);
    }

    /// Get a reference to the protocol repository
    pub fn repository(&self) -> Option<&ProtocolRepository> {
        self.repository.as_ref()
    }

    /// Get a mutable reference to the protocol repository
    pub fn repository_mut(&mut self) -> Option<&mut ProtocolRepository> {
        self.repository.as_mut()
    }
    
    /// Register a new parser
    pub fn register_parser(&mut self, parser: Box<dyn Parser>) {
        let id = parser.get_id().to_string();
        self.parsers.insert(id.clone(), parser);
        self.auto_detect_order.push(id);
    }
    
    /// Get a parser by ID
    pub fn get_parser(&self, id: &str) -> Option<&dyn Parser> {
        self.parsers.get(id).map(|p| p.as_ref())
    }
    
    /// Get all registered parser IDs
    pub fn get_parser_ids(&self) -> Vec<String> {
        self.parsers.keys().cloned().collect()
    }
    
    /// Auto-detect the best parser for the given data
    pub fn auto_detect(&self, data: &[u8]) -> Option<&dyn Parser> {
        for parser_id in &self.auto_detect_order {
            if let Some(parser) = self.parsers.get(parser_id) {
                if parser.can_parse(data) {
                    return Some(parser.as_ref());
                }
            }
        }
        None
    }
    
    /// Parse data using a specific parser
    pub fn parse_with_parser(&self, parser_id: &str, data: &[u8]) -> NetworkResult<ParseResult> {
        match self.get_parser(parser_id) {
            Some(parser) => parser.parse(data),
            None => Err(crate::types::NetworkError::ParseError(
                format!("Parser '{}' not found", parser_id)
            )),
        }
    }
    
    /// Parse data with auto-detection
    pub fn parse_auto(&self, data: &[u8]) -> NetworkResult<ParseResult> {
        match self.auto_detect(data) {
            Some(parser) => parser.parse(data),
            None => Err(crate::types::NetworkError::ParseError(
                "No suitable parser found for the data".to_string()
            )),
        }
    }

    /// Load protocols from repository
    pub fn load_protocols_from_repository(&mut self) -> NetworkResult<usize> {
        // Collect protocol IDs first to avoid borrowing issues
        let protocol_ids: Vec<String> = if let Some(repository) = &self.repository {
            repository.list_enabled_protocols()
                .into_iter()
                .map(|metadata| metadata.id.clone())
                .collect()
        } else {
            return Ok(0);
        };

        let mut loaded_count = 0;

        for protocol_id in protocol_ids {
            if let Some(repository) = &mut self.repository {
                match repository.create_protocol_parser(&protocol_id) {
                    Ok(parser) => {
                        let protocol_name = parser.get_protocol_info().name.clone();
                        self.register_parser(Box::new(parser));
                        loaded_count += 1;
                        log::info!("Loaded protocol parser: {} ({})", protocol_name, protocol_id);
                    }
                    Err(e) => {
                        log::warn!("Failed to load protocol parser for {}: {}", protocol_id, e);
                    }
                }
            }
        }

        Ok(loaded_count)
    }

    /// Reload a specific protocol from repository
    pub fn reload_protocol(&mut self, protocol_id: &str) -> NetworkResult<()> {
        // Remove existing parser if it exists
        self.remove_parser(protocol_id);

        // Load new parser
        if let Some(repository) = &mut self.repository {
            let parser = repository.create_protocol_parser(protocol_id)?;
            self.register_parser(Box::new(parser));

            log::info!("Reloaded protocol parser: {}", protocol_id);
            Ok(())
        } else {
            Err(crate::types::NetworkError::ParseError(
                "No protocol repository available".to_string()
            ))
        }
    }

    /// Remove a parser by ID
    pub fn remove_parser(&mut self, parser_id: &str) {
        self.parsers.remove(parser_id);
        self.auto_detect_order.retain(|id| id != parser_id);
    }
}

impl Default for ParserRegistry {
    fn default() -> Self {
        Self::new()
    }
}

use std::sync::{Arc, RwLock, OnceLock};

/// Global parser registry instance
static PARSER_REGISTRY: OnceLock<Arc<RwLock<ParserRegistry>>> = OnceLock::new();

/// Get the global parser registry
pub fn get_parser_registry() -> Arc<RwLock<ParserRegistry>> {
    PARSER_REGISTRY.get_or_init(|| {
        Arc::new(RwLock::new(ParserRegistry::new()))
    }).clone()
}

/// Initialize the parser system with built-in parsers and protocol repository
pub fn initialize_parser_system() -> NetworkResult<()> {
    initialize_parser_system_with_repository(None)
}

/// Initialize the parser system with a specific repository path
pub fn initialize_parser_system_with_repository(repository_path: Option<std::path::PathBuf>) -> NetworkResult<()> {
    let registry = get_parser_registry();

    // Set up protocol repository if path is provided
    if let Some(repo_path) = repository_path {
        let repository = ProtocolRepository::new(repo_path)?;
        let mut registry_guard = registry.write().unwrap();
        registry_guard.set_repository(repository);

        // Load protocols from repository
        let loaded_count = registry_guard.load_protocols_from_repository()?;
        log::info!("Loaded {} protocols from repository", loaded_count);
    }

    // TODO: Register built-in parsers here
    // registry.write().unwrap().register_parser(Box::new(ModbusParser::new()));
    // registry.write().unwrap().register_parser(Box::new(TcpParser::new()));
    // etc.

    log::info!("Parser system initialized with {} parsers", registry.read().unwrap().get_parser_ids().len());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parser_registry_creation() {
        let registry = ParserRegistry::new();
        assert_eq!(registry.get_parser_ids().len(), 0);
    }
    
    #[test]
    fn test_parser_registry_auto_detect_empty() {
        let registry = ParserRegistry::new();
        let data = b"test data";
        assert!(registry.auto_detect(data).is_none());
    }
}
