//! YAML rules parser for .kkp.yaml protocol definition files
//! 
//! This module handles loading, parsing, and validating protocol rules
//! from YAML files. It supports rule inheritance, references, and
//! comprehensive validation.

use crate::parser::schema::*;
use crate::types::{NetworkResult, NetworkError};
use serde_yaml;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Rules loader and parser
#[derive(Debug)]
pub struct RulesLoader {
    /// Cache of loaded rules by file path
    rules_cache: HashMap<PathBuf, ProtocolRule>,
    
    /// Search paths for rule files
    search_paths: Vec<PathBuf>,
    
    /// Rule inheritance resolver
    inheritance_resolver: InheritanceResolver,
}

impl RulesLoader {
    /// Create a new rules loader
    pub fn new() -> Self {
        Self {
            rules_cache: HashMap::new(),
            search_paths: vec![
                PathBuf::from("rules"),
                PathBuf::from("protocols"),
                PathBuf::from("."),
            ],
            inheritance_resolver: InheritanceResolver::new(),
        }
    }
    
    /// Add a search path for rule files
    pub fn add_search_path<P: AsRef<Path>>(&mut self, path: P) {
        self.search_paths.push(path.as_ref().to_path_buf());
    }
    
    /// Load a protocol rule from a file
    pub fn load_rule<P: AsRef<Path>>(&mut self, path: P) -> NetworkResult<ProtocolRule> {
        let path = path.as_ref().to_path_buf();
        
        // Check cache first
        if let Some(cached_rule) = self.rules_cache.get(&path) {
            return Ok(cached_rule.clone());
        }
        
        // Try to find the file in search paths
        let file_path = self.find_rule_file(&path)?;
        
        // Load and parse the YAML file
        let content = fs::read_to_string(&file_path)
            .map_err(|e| NetworkError::ParseError(format!("Failed to read rule file: {}", e)))?;
        
        let mut rule: ProtocolRule = serde_yaml::from_str(&content)
            .map_err(|e| NetworkError::ParseError(format!("Failed to parse YAML: {}", e)))?;
        
        // Resolve inheritance and references
        rule = self.inheritance_resolver.resolve_inheritance(rule, &file_path.parent().unwrap_or(&file_path))?;
        
        // Validate the rule
        self.validate_rule(&rule)?;
        
        // Cache the rule
        self.rules_cache.insert(path, rule.clone());
        
        Ok(rule)
    }
    
    /// Load a protocol rule from a string
    pub fn load_rule_from_string(&mut self, content: &str) -> NetworkResult<ProtocolRule> {
        let mut rule: ProtocolRule = serde_yaml::from_str(content)
            .map_err(|e| NetworkError::ParseError(format!("Failed to parse YAML: {}", e)))?;
        
        // Resolve inheritance (limited without file context)
        rule = self.inheritance_resolver.resolve_inheritance(rule, Path::new("."))?;
        
        // Validate the rule
        self.validate_rule(&rule)?;
        
        Ok(rule)
    }
    
    /// Find a rule file in the search paths
    fn find_rule_file(&self, path: &Path) -> NetworkResult<PathBuf> {
        // If path is absolute and exists, use it directly
        if path.is_absolute() && path.exists() {
            return Ok(path.to_path_buf());
        }
        
        // Search in configured paths
        for search_path in &self.search_paths {
            let candidate = search_path.join(path);
            if candidate.exists() {
                return Ok(candidate);
            }
            
            // Try with .kkp.yaml extension
            let candidate_with_ext = candidate.with_extension("kkp.yaml");
            if candidate_with_ext.exists() {
                return Ok(candidate_with_ext);
            }
        }
        
        Err(NetworkError::ParseError(format!(
            "Rule file not found: {}",
            path.display()
        )))
    }
    
    /// Validate a protocol rule
    fn validate_rule(&self, rule: &ProtocolRule) -> NetworkResult<()> {
        let validator = RuleValidator::new();
        validator.validate(rule)
    }
    
    /// Clear the rules cache
    pub fn clear_cache(&mut self) {
        self.rules_cache.clear();
    }
    
    /// Get cached rule count
    pub fn cache_size(&self) -> usize {
        self.rules_cache.len()
    }
}

impl Default for RulesLoader {
    fn default() -> Self {
        Self::new()
    }
}

/// Rule inheritance resolver
#[derive(Debug)]
struct InheritanceResolver {
    /// Stack to detect circular references
    resolution_stack: Vec<PathBuf>,
}

impl InheritanceResolver {
    fn new() -> Self {
        Self {
            resolution_stack: Vec::new(),
        }
    }
    
    /// Resolve inheritance and references in a rule
    fn resolve_inheritance(&mut self, rule: ProtocolRule, _base_path: &Path) -> NetworkResult<ProtocolRule> {
        // TODO: Implement inheritance resolution
        // This would handle:
        // - extends: "base_protocol.kkp.yaml"
        // - field references: $ref: "common_fields.yaml#/timestamp"
        // - template expansion
        
        // For now, return the rule as-is
        // In a full implementation, this would:
        // 1. Check for 'extends' field in meta
        // 2. Load parent rules recursively
        // 3. Merge fields, validation rules, etc.
        // 4. Resolve $ref references
        // 5. Expand templates and variables
        
        Ok(rule)
    }
}

/// Rule validator
struct RuleValidator;

impl RuleValidator {
    fn new() -> Self {
        Self
    }
    
    /// Validate a protocol rule
    fn validate(&self, rule: &ProtocolRule) -> NetworkResult<()> {
        // Validate metadata
        self.validate_meta(&rule.meta)?;
        
        // Validate framing rules
        self.validate_framing(&rule.framing)?;
        
        // Validate field definitions
        self.validate_fields(&rule.fields)?;
        
        // Validate field references in validation rules
        self.validate_field_references(rule)?;
        
        // Validate conditional rules
        self.validate_conditions(&rule.conditions, &rule.fields)?;
        
        Ok(())
    }
    
    fn validate_meta(&self, meta: &ProtocolMeta) -> NetworkResult<()> {
        if meta.name.is_empty() {
            return Err(NetworkError::ParseError("Protocol name cannot be empty".to_string()));
        }
        
        if meta.version.is_empty() {
            return Err(NetworkError::ParseError("Protocol version cannot be empty".to_string()));
        }
        
        Ok(())
    }
    
    fn validate_framing(&self, framing: &FramingRule) -> NetworkResult<()> {
        // Check that at least one framing method is specified
        let has_delimiters = framing.start_delimiter.is_some() || framing.end_delimiter.is_some();
        let has_length_field = framing.length_field.is_some();
        let has_fixed_size = framing.fixed_size.is_some();
        
        if !has_delimiters && !has_length_field && !has_fixed_size {
            return Err(NetworkError::ParseError(
                "At least one framing method must be specified (delimiters, length field, or fixed size)".to_string()
            ));
        }
        
        // Validate length field if present
        if let Some(length_field) = &framing.length_field {
            if length_field.length == 0 {
                return Err(NetworkError::ParseError("Length field size cannot be zero".to_string()));
            }
            
            if length_field.length > 8 {
                return Err(NetworkError::ParseError("Length field size cannot exceed 8 bytes".to_string()));
            }
        }
        
        // Validate fixed size if present
        if let Some(fixed_size) = framing.fixed_size {
            if fixed_size == 0 {
                return Err(NetworkError::ParseError("Fixed frame size cannot be zero".to_string()));
            }
        }
        
        Ok(())
    }
    
    fn validate_fields(&self, fields: &[FieldDefinition]) -> NetworkResult<()> {
        if fields.is_empty() {
            return Err(NetworkError::ParseError("At least one field must be defined".to_string()));
        }
        
        // Check for duplicate field names
        let mut field_names = std::collections::HashSet::new();
        for field in fields {
            if field.name.is_empty() {
                return Err(NetworkError::ParseError("Field name cannot be empty".to_string()));
            }
            
            if !field_names.insert(&field.name) {
                return Err(NetworkError::ParseError(format!(
                    "Duplicate field name: {}",
                    field.name
                )));
            }
            
            // Validate field-specific rules
            self.validate_field(field)?;
        }
        
        Ok(())
    }
    
    fn validate_field(&self, field: &FieldDefinition) -> NetworkResult<()> {
        // Validate offset
        match &field.offset {
            FieldOffset::Absolute(offset) => {
                // Absolute offsets should be reasonable
                if *offset > 65536 {
                    log::warn!("Large absolute offset {} for field '{}'", offset, field.name);
                }
            }
            FieldOffset::Relative(offset) => {
                // Relative offsets should not be too large
                if offset.abs() > 1024 {
                    log::warn!("Large relative offset {} for field '{}'", offset, field.name);
                }
            }
            FieldOffset::Expression(expr) => {
                // TODO: Validate expression syntax
                if expr.is_empty() {
                    return Err(NetworkError::ParseError(format!(
                        "Empty offset expression for field '{}'",
                        field.name
                    )));
                }
            }
        }
        
        // Validate length for variable-length fields
        match &field.length {
            FieldLength::Fixed(len) => {
                if *len == 0 {
                    return Err(NetworkError::ParseError(format!(
                        "Field '{}' cannot have zero length",
                        field.name
                    )));
                }
            }
            FieldLength::Variable(ref_field) => {
                if ref_field.is_empty() {
                    return Err(NetworkError::ParseError(format!(
                        "Empty length reference for field '{}'",
                        field.name
                    )));
                }
            }
            FieldLength::UntilDelimiter(delimiter) => {
                if delimiter.is_empty() {
                    return Err(NetworkError::ParseError(format!(
                        "Empty delimiter for field '{}'",
                        field.name
                    )));
                }
            }
            FieldLength::Expression(expr) => {
                if expr.is_empty() {
                    return Err(NetworkError::ParseError(format!(
                        "Empty length expression for field '{}'",
                        field.name
                    )));
                }
            }
            FieldLength::Remaining => {
                // This is always valid
            }
        }
        
        Ok(())
    }
    
    fn validate_field_references(&self, rule: &ProtocolRule) -> NetworkResult<()> {
        let field_names: std::collections::HashSet<_> = rule.fields.iter().map(|f| &f.name).collect();
        
        // Check CRC validation references
        for crc_validation in &rule.validation.crc {
            if !field_names.contains(&crc_validation.crc_field) {
                return Err(NetworkError::ParseError(format!(
                    "CRC validation references unknown field: {}",
                    crc_validation.crc_field
                )));
            }
        }
        
        // Check checksum validation references
        for checksum_validation in &rule.validation.checksum {
            if !field_names.contains(&checksum_validation.checksum_field) {
                return Err(NetworkError::ParseError(format!(
                    "Checksum validation references unknown field: {}",
                    checksum_validation.checksum_field
                )));
            }
        }
        
        Ok(())
    }
    
    fn validate_conditions(&self, conditions: &[ConditionalRule], fields: &[FieldDefinition]) -> NetworkResult<()> {
        let _field_names: std::collections::HashSet<_> = fields.iter().map(|f| &f.name).collect();
        
        for condition in conditions {
            if condition.condition.is_empty() {
                return Err(NetworkError::ParseError("Conditional rule cannot have empty condition".to_string()));
            }
            
            // TODO: Validate that condition expression references valid fields
            // This would require parsing the expression and checking field references
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::io::Write;
    
    #[test]
    fn test_load_rule_from_string() {
        let yaml = "
meta:
  name: \"Test Protocol\"
  version: \"1.0.0\"
  author: \"Test Author\"

framing:
  start_delimiter: \"##\"
  end_delimiter: \"\\r\\n\"

fields:
  - name: \"test_field\"
    type: \"uint16\"
    offset: 0
";
        
        let mut loader = RulesLoader::new();
        let result = loader.load_rule_from_string(yaml);
        assert!(result.is_ok());
        
        let rule = result.unwrap();
        assert_eq!(rule.meta.name, "Test Protocol");
        assert_eq!(rule.fields.len(), 1);
    }
    
    #[test]
    fn test_validate_empty_fields() {
        let yaml = r#"
meta:
  name: "Test Protocol"
  version: "1.0.0"
  author: "Test Author"

framing:
  fixed_size: 10

fields: []
"#;
        
        let mut loader = RulesLoader::new();
        let result = loader.load_rule_from_string(yaml);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_validate_duplicate_field_names() {
        let yaml = r#"
meta:
  name: "Test Protocol"
  version: "1.0.0"
  author: "Test Author"

framing:
  fixed_size: 10

fields:
  - name: "duplicate"
    type: "uint8"
    offset: 0
  - name: "duplicate"
    type: "uint8"
    offset: 1
"#;
        
        let mut loader = RulesLoader::new();
        let result = loader.load_rule_from_string(yaml);
        assert!(result.is_err());
    }
}
