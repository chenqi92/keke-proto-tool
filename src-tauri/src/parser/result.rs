//! Parse result structures and management
//! 
//! This module defines the data structures used to represent parsing results,
//! including parsed fields, metadata, and error information.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

/// Main parse result structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    /// Whether parsing was successful
    pub success: bool,
    
    /// Protocol information
    pub protocol: ProtocolInfo,
    
    /// Parsed fields organized hierarchically
    pub fields: ParsedFields,
    
    /// Raw data that was parsed
    pub raw_data: Vec<u8>,
    
    /// Number of bytes successfully parsed
    pub parsed_size: usize,
    
    /// Parse metadata
    pub metadata: ParseMetadata,
    
    /// Validation results
    pub validation: ValidationResults,
    
    /// Parse errors and warnings
    pub errors: Vec<ParseError>,
    pub warnings: Vec<ParseWarning>,
}

/// Protocol information in parse result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolInfo {
    /// Protocol name
    pub name: String,
    
    /// Protocol version
    pub version: String,
    
    /// Parser ID that was used
    pub parser_id: String,
    
    /// Confidence level (0.0 - 1.0) for auto-detected protocols
    pub confidence: f64,
}

/// Hierarchical structure for parsed fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedFields {
    /// Root-level fields
    pub fields: HashMap<String, ParsedField>,
    
    /// Field parsing order (for display purposes)
    pub field_order: Vec<String>,
}

impl ParsedFields {
    /// Create a new empty parsed fields structure
    pub fn new() -> Self {
        Self {
            fields: HashMap::new(),
            field_order: Vec::new(),
        }
    }
    
    /// Add a parsed field
    pub fn add_field(&mut self, name: String, field: ParsedField) {
        if !self.fields.contains_key(&name) {
            self.field_order.push(name.clone());
        }
        self.fields.insert(name, field);
    }
    
    /// Get a field by name
    pub fn get_field(&self, name: &str) -> Option<&ParsedField> {
        self.fields.get(name)
    }
    
    /// Get all field names in parsing order
    pub fn get_field_names(&self) -> &[String] {
        &self.field_order
    }
    
    /// Check if fields are empty
    pub fn is_empty(&self) -> bool {
        self.fields.is_empty()
    }
    
    /// Get field count
    pub fn len(&self) -> usize {
        self.fields.len()
    }
}

impl Default for ParsedFields {
    fn default() -> Self {
        Self::new()
    }
}

/// Individual parsed field
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedField {
    /// Field name
    pub name: String,
    
    /// Parsed value
    pub value: FieldValue,
    
    /// Raw bytes for this field
    pub raw_bytes: Vec<u8>,
    
    /// Field offset in the original data
    pub offset: usize,
    
    /// Field length in bytes
    pub length: usize,
    
    /// Field type information
    pub field_type: String,
    
    /// Field description
    pub description: String,
    
    /// Whether this field was parsed successfully
    pub valid: bool,
    
    /// Field-specific validation results
    pub validation: FieldValidationResult,
    
    /// Nested fields (for complex types)
    pub nested_fields: Option<ParsedFields>,
    
    /// Field metadata
    pub metadata: FieldMetadata,
}

/// Field value types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum FieldValue {
    /// Unsigned integer
    UInt(u64),
    
    /// Signed integer
    Int(i64),
    
    /// Floating point number
    Float(f64),
    
    /// String value
    String(String),
    
    /// Binary data
    Bytes(Vec<u8>),
    
    /// Boolean value
    Bool(bool),
    
    /// Array of values
    Array(Vec<FieldValue>),
    
    /// Object/struct with named fields
    Object(HashMap<String, FieldValue>),
    
    /// Null/empty value
    Null,
}

impl FieldValue {
    /// Get the value as a string representation
    pub fn as_string(&self) -> String {
        match self {
            FieldValue::UInt(v) => v.to_string(),
            FieldValue::Int(v) => v.to_string(),
            FieldValue::Float(v) => v.to_string(),
            FieldValue::String(v) => v.clone(),
            FieldValue::Bytes(v) => hex::encode(v),
            FieldValue::Bool(v) => v.to_string(),
            FieldValue::Array(v) => format!("[{}]", v.len()),
            FieldValue::Object(v) => format!("{{{}}}", v.len()),
            FieldValue::Null => "null".to_string(),
        }
    }
    
    /// Check if the value is numeric
    pub fn is_numeric(&self) -> bool {
        matches!(self, FieldValue::UInt(_) | FieldValue::Int(_) | FieldValue::Float(_))
    }
    
    /// Get the value as a number (if possible)
    pub fn as_number(&self) -> Option<f64> {
        match self {
            FieldValue::UInt(v) => Some(*v as f64),
            FieldValue::Int(v) => Some(*v as f64),
            FieldValue::Float(v) => Some(*v),
            _ => None,
        }
    }
}

/// Field validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldValidationResult {
    /// Whether the field passed validation
    pub valid: bool,
    
    /// Validation errors
    pub errors: Vec<String>,
    
    /// Validation warnings
    pub warnings: Vec<String>,
    
    /// Validation metadata
    pub metadata: HashMap<String, serde_json::Value>,
}

impl Default for FieldValidationResult {
    fn default() -> Self {
        Self {
            valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
            metadata: HashMap::new(),
        }
    }
}

/// Field metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldMetadata {
    /// Whether this field was optional
    pub optional: bool,
    
    /// Whether this field used a default value
    pub used_default: bool,
    
    /// Endianness used for parsing
    pub endianness: Option<String>,
    
    /// Encoding used for parsing
    pub encoding: Option<String>,
    
    /// Additional metadata
    pub extra: HashMap<String, serde_json::Value>,
}

impl Default for FieldMetadata {
    fn default() -> Self {
        Self {
            optional: false,
            used_default: false,
            endianness: None,
            encoding: None,
            extra: HashMap::new(),
        }
    }
}

/// Parse metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseMetadata {
    /// When the parsing was performed
    pub timestamp: DateTime<Utc>,
    
    /// Time taken to parse (in milliseconds)
    pub parse_time_ms: f64,
    
    /// Parser version used
    pub parser_version: String,
    
    /// Rule file used (if any)
    pub rule_file: Option<String>,
    
    /// Additional metadata
    pub extra: HashMap<String, serde_json::Value>,
}

impl Default for ParseMetadata {
    fn default() -> Self {
        Self {
            timestamp: Utc::now(),
            parse_time_ms: 0.0,
            parser_version: "1.0.0".to_string(),
            rule_file: None,
            extra: HashMap::new(),
        }
    }
}

/// Overall validation results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResults {
    /// Whether all validations passed
    pub valid: bool,
    
    /// CRC validation results
    pub crc_results: Vec<CrcValidationResult>,
    
    /// Checksum validation results
    pub checksum_results: Vec<ChecksumValidationResult>,
    
    /// Custom validation results
    pub custom_results: Vec<CustomValidationResult>,
    
    /// Overall validation score (0.0 - 1.0)
    pub score: f64,
}

impl Default for ValidationResults {
    fn default() -> Self {
        Self {
            valid: true,
            crc_results: Vec::new(),
            checksum_results: Vec::new(),
            custom_results: Vec::new(),
            score: 1.0,
        }
    }
}

/// CRC validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrcValidationResult {
    /// CRC algorithm used
    pub algorithm: String,
    
    /// Expected CRC value
    pub expected: u64,
    
    /// Calculated CRC value
    pub calculated: u64,
    
    /// Whether CRC validation passed
    pub valid: bool,
    
    /// Data range used for calculation
    pub data_range: String,
}

/// Checksum validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecksumValidationResult {
    /// Checksum algorithm used
    pub algorithm: String,
    
    /// Expected checksum value
    pub expected: u64,
    
    /// Calculated checksum value
    pub calculated: u64,
    
    /// Whether checksum validation passed
    pub valid: bool,
    
    /// Data range used for calculation
    pub data_range: String,
}

/// Custom validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomValidationResult {
    /// Validation function name
    pub function: String,
    
    /// Whether validation passed
    pub valid: bool,
    
    /// Validation message
    pub message: String,
    
    /// Additional result data
    pub data: HashMap<String, serde_json::Value>,
}

/// Parse error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseError {
    /// Error message
    pub message: String,
    
    /// Error code
    pub code: String,
    
    /// Byte offset where error occurred
    pub offset: Option<usize>,
    
    /// Field name where error occurred
    pub field: Option<String>,
    
    /// Error severity
    pub severity: ErrorSeverity,
    
    /// Additional error context
    pub context: HashMap<String, serde_json::Value>,
}

/// Parse warning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseWarning {
    /// Warning message
    pub message: String,
    
    /// Warning code
    pub code: String,
    
    /// Byte offset where warning occurred
    pub offset: Option<usize>,
    
    /// Field name where warning occurred
    pub field: Option<String>,
    
    /// Additional warning context
    pub context: HashMap<String, serde_json::Value>,
}

/// Error severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorSeverity {
    /// Critical error that prevents parsing
    Critical,
    
    /// Error that affects parsing quality
    Error,
    
    /// Warning that doesn't prevent parsing
    Warning,
    
    /// Informational message
    Info,
}

impl ParseResult {
    /// Create a new successful parse result
    pub fn success(protocol: ProtocolInfo, fields: ParsedFields, raw_data: Vec<u8>, parsed_size: usize) -> Self {
        Self {
            success: true,
            protocol,
            fields,
            raw_data,
            parsed_size,
            metadata: ParseMetadata::default(),
            validation: ValidationResults::default(),
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }
    
    /// Create a new failed parse result
    pub fn failure(protocol: ProtocolInfo, raw_data: Vec<u8>, error: ParseError) -> Self {
        Self {
            success: false,
            protocol,
            fields: ParsedFields::new(),
            raw_data,
            parsed_size: 0,
            metadata: ParseMetadata::default(),
            validation: ValidationResults {
                valid: false,
                ..Default::default()
            },
            errors: vec![error],
            warnings: Vec::new(),
        }
    }
    
    /// Add an error to the result
    pub fn add_error(&mut self, error: ParseError) {
        if matches!(error.severity, ErrorSeverity::Critical | ErrorSeverity::Error) {
            self.success = false;
            self.validation.valid = false;
        }
        self.errors.push(error);
    }
    
    /// Add a warning to the result
    pub fn add_warning(&mut self, warning: ParseWarning) {
        self.warnings.push(warning);
    }
    
    /// Check if the result has any errors
    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }
    
    /// Check if the result has any warnings
    pub fn has_warnings(&self) -> bool {
        !self.warnings.is_empty()
    }
    
    /// Get the overall quality score (0.0 - 1.0)
    pub fn quality_score(&self) -> f64 {
        if !self.success {
            return 0.0;
        }
        
        let error_penalty = self.errors.len() as f64 * 0.2;
        let warning_penalty = self.warnings.len() as f64 * 0.1;
        let validation_score = self.validation.score;
        
        (validation_score - error_penalty - warning_penalty).max(0.0).min(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parsed_fields_operations() {
        let mut fields = ParsedFields::new();
        assert!(fields.is_empty());
        assert_eq!(fields.len(), 0);
        
        let field = ParsedField {
            name: "test".to_string(),
            value: FieldValue::UInt(42),
            raw_bytes: vec![0x2A],
            offset: 0,
            length: 1,
            field_type: "uint8".to_string(),
            description: "Test field".to_string(),
            valid: true,
            validation: FieldValidationResult::default(),
            nested_fields: None,
            metadata: FieldMetadata::default(),
        };
        
        fields.add_field("test".to_string(), field);
        assert!(!fields.is_empty());
        assert_eq!(fields.len(), 1);
        assert!(fields.get_field("test").is_some());
    }
    
    #[test]
    fn test_field_value_conversions() {
        let uint_val = FieldValue::UInt(42);
        assert!(uint_val.is_numeric());
        assert_eq!(uint_val.as_number(), Some(42.0));
        assert_eq!(uint_val.as_string(), "42");
        
        let string_val = FieldValue::String("hello".to_string());
        assert!(!string_val.is_numeric());
        assert_eq!(string_val.as_number(), None);
        assert_eq!(string_val.as_string(), "hello");
    }
    
    #[test]
    fn test_parse_result_quality_score() {
        let protocol = ProtocolInfo {
            name: "Test".to_string(),
            version: "1.0".to_string(),
            parser_id: "test".to_string(),
            confidence: 1.0,
        };
        
        let mut result = ParseResult::success(
            protocol,
            ParsedFields::new(),
            vec![1, 2, 3],
            3,
        );
        
        assert_eq!(result.quality_score(), 1.0);
        
        result.add_warning(ParseWarning {
            message: "Test warning".to_string(),
            code: "W001".to_string(),
            offset: None,
            field: None,
            context: HashMap::new(),
        });
        
        assert_eq!(result.quality_score(), 0.9);
    }
}
