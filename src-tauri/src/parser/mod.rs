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

// Re-export key types for convenience
pub use schema::*;
pub use rules::*;
pub use result::*;
pub use validation_report::*;
pub use protocol_parser::ProtocolParser;

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
}

impl ParserRegistry {
    /// Create a new parser registry
    pub fn new() -> Self {
        Self {
            parsers: HashMap::new(),
            auto_detect_order: Vec::new(),
        }
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
}

impl Default for ParserRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Global parser registry instance
static mut PARSER_REGISTRY: Option<ParserRegistry> = None;
static REGISTRY_INIT: std::sync::Once = std::sync::Once::new();

/// Get the global parser registry
pub fn get_parser_registry() -> &'static mut ParserRegistry {
    unsafe {
        REGISTRY_INIT.call_once(|| {
            PARSER_REGISTRY = Some(ParserRegistry::new());
        });
        PARSER_REGISTRY.as_mut().unwrap()
    }
}

/// Initialize the parser system with built-in parsers
pub fn initialize_parser_system() -> NetworkResult<()> {
    let registry = get_parser_registry();
    
    // TODO: Register built-in parsers here
    // registry.register_parser(Box::new(ModbusParser::new()));
    // registry.register_parser(Box::new(TcpParser::new()));
    // etc.
    
    log::info!("Parser system initialized with {} parsers", registry.get_parser_ids().len());
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
