//! Schema definitions for protocol parsing rules
//! 
//! This module defines the data structures used to represent parsing rules
//! loaded from .kkp.yaml files. These structures form the foundation of
//! the parsing system.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Root structure for a .kkp.yaml protocol rule file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolRule {
    /// Metadata about the protocol
    pub meta: ProtocolMeta,
    
    /// Frame synchronization rules
    pub framing: FramingRule,
    
    /// Field definitions
    pub fields: Vec<FieldDefinition>,
    
    /// Validation rules
    #[serde(default)]
    pub validation: ValidationRules,
    
    /// Conditional parsing rules
    #[serde(default)]
    pub conditions: Vec<ConditionalRule>,
    
    /// Custom functions and expressions
    #[serde(default)]
    pub functions: HashMap<String, String>,
}

/// Protocol metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolMeta {
    /// Protocol name
    pub name: String,
    
    /// Protocol version
    pub version: String,
    
    /// Author information
    pub author: String,
    
    /// Protocol description
    #[serde(default)]
    pub description: String,
    
    /// Supported data formats
    #[serde(default)]
    pub supported_formats: Vec<String>,
    
    /// Protocol category
    #[serde(default)]
    pub category: String,
    
    /// Tags for classification
    #[serde(default)]
    pub tags: Vec<String>,
}

/// Frame synchronization rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FramingRule {
    /// Start delimiter pattern
    #[serde(default)]
    pub start_delimiter: Option<String>,
    
    /// End delimiter pattern
    #[serde(default)]
    pub end_delimiter: Option<String>,
    
    /// Length field configuration
    #[serde(default)]
    pub length_field: Option<LengthField>,
    
    /// Fixed frame size
    #[serde(default)]
    pub fixed_size: Option<usize>,
    
    /// Escape sequence handling
    #[serde(default)]
    pub escape_rules: Vec<EscapeRule>,
    
    /// Frame validation rules
    #[serde(default)]
    pub frame_validation: FrameValidation,
}

/// Length field configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LengthField {
    /// Offset from frame start
    pub offset: usize,
    
    /// Length of the length field in bytes
    pub length: usize,
    
    /// Encoding format
    pub encoding: LengthEncoding,
    
    /// Whether length includes header
    #[serde(default)]
    pub includes_header: bool,
    
    /// Whether length includes the length field itself
    #[serde(default)]
    pub includes_length_field: bool,
    
    /// Byte order for multi-byte length fields
    #[serde(default)]
    pub endian: Endianness,
}

/// Length field encoding formats
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LengthEncoding {
    Binary,
    AsciiDecimal,
    AsciiHex,
    Bcd,
}

/// Byte order specification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Endianness {
    Big,
    Little,
    Native,
}

impl Default for Endianness {
    fn default() -> Self {
        Self::Big
    }
}

/// Escape sequence rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscapeRule {
    /// Pattern to escape
    pub pattern: String,
    
    /// Replacement sequence
    pub replacement: String,
    
    /// Whether this is for escaping or unescaping
    #[serde(default)]
    pub direction: EscapeDirection,
}

/// Escape direction
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EscapeDirection {
    Escape,
    Unescape,
    Both,
}

impl Default for EscapeDirection {
    fn default() -> Self {
        Self::Both
    }
}

/// Frame validation rules
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FrameValidation {
    /// Minimum frame size
    #[serde(default)]
    pub min_size: Option<usize>,
    
    /// Maximum frame size
    #[serde(default)]
    pub max_size: Option<usize>,
    
    /// Required patterns
    #[serde(default)]
    pub required_patterns: Vec<String>,
    
    /// Forbidden patterns
    #[serde(default)]
    pub forbidden_patterns: Vec<String>,
}

/// Field definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDefinition {
    /// Field name
    pub name: String,
    
    /// Field data type
    #[serde(rename = "type")]
    pub field_type: FieldType,
    
    /// Field offset from frame start
    pub offset: FieldOffset,
    
    /// Field length specification
    #[serde(default)]
    pub length: FieldLength,
    
    /// Byte order for multi-byte fields
    #[serde(default)]
    pub endian: Endianness,
    
    /// Field description
    #[serde(default)]
    pub description: String,
    
    /// Whether field is optional
    #[serde(default)]
    pub optional: bool,
    
    /// Default value if field is missing
    #[serde(default)]
    pub default_value: Option<serde_json::Value>,
    
    /// Field validation rules
    #[serde(default)]
    pub validation: FieldValidation,
    
    /// Conditional parsing rules
    #[serde(default)]
    pub condition: Option<String>,
}

/// Field data types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FieldType {
    // Integer types
    Uint8,
    Uint16,
    Uint32,
    Uint64,
    Int8,
    Int16,
    Int32,
    Int64,
    
    // Floating point types
    Float32,
    Float64,
    
    // String types
    String,
    CString,
    PascalString,
    
    // Binary types
    Bytes,
    Hex,
    
    // Bit field types
    Bitfield,
    
    // Complex types
    Struct,
    Array,
    Union,
    Enum,
    
    // Special types
    Checksum,
    Crc,
    Timestamp,
}

/// Field offset specification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum FieldOffset {
    /// Absolute offset from frame start
    Absolute(usize),
    
    /// Relative offset from previous field
    Relative(i32),
    
    /// Calculated offset using expression
    Expression(String),
}

/// Field length specification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum FieldLength {
    /// Fixed length in bytes
    Fixed(usize),
    
    /// Variable length determined by another field
    Variable(String),
    
    /// Length until delimiter
    UntilDelimiter(String),
    
    /// Remaining bytes in frame
    Remaining,
    
    /// Calculated length using expression
    Expression(String),
}

impl Default for FieldLength {
    fn default() -> Self {
        Self::Fixed(1)
    }
}

/// Field validation rules
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FieldValidation {
    /// Minimum value (for numeric types)
    #[serde(default)]
    pub min_value: Option<f64>,
    
    /// Maximum value (for numeric types)
    #[serde(default)]
    pub max_value: Option<f64>,
    
    /// Allowed values
    #[serde(default)]
    pub allowed_values: Vec<serde_json::Value>,
    
    /// Regular expression pattern (for string types)
    #[serde(default)]
    pub pattern: Option<String>,
    
    /// Custom validation function
    #[serde(default)]
    pub custom_validator: Option<String>,
}

/// Validation rules for the entire protocol
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ValidationRules {
    /// CRC validation configuration
    #[serde(default)]
    pub crc: Vec<CrcValidation>,
    
    /// Checksum validation configuration
    #[serde(default)]
    pub checksum: Vec<ChecksumValidation>,
    
    /// Custom validation functions
    #[serde(default)]
    pub custom: Vec<CustomValidation>,
}

/// CRC validation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrcValidation {
    /// CRC algorithm name
    pub algorithm: String,
    
    /// Field containing the CRC value
    pub crc_field: String,
    
    /// Range of data to calculate CRC over
    pub data_range: DataRange,
    
    /// Whether to validate or just calculate
    #[serde(default = "default_true")]
    pub validate: bool,
}

/// Checksum validation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecksumValidation {
    /// Checksum algorithm (sum, xor, etc.)
    pub algorithm: String,
    
    /// Field containing the checksum value
    pub checksum_field: String,
    
    /// Range of data to calculate checksum over
    pub data_range: DataRange,
    
    /// Whether to validate or just calculate
    #[serde(default = "default_true")]
    pub validate: bool,
}

/// Custom validation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomValidation {
    /// Validation function name
    pub function: String,
    
    /// Parameters for the validation function
    #[serde(default)]
    pub parameters: HashMap<String, serde_json::Value>,
    
    /// Error message template
    #[serde(default)]
    pub error_message: String,
}

/// Data range specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataRange {
    /// Start offset
    pub start: usize,
    
    /// End offset (exclusive) or length
    pub end: DataRangeEnd,
}

/// End specification for data range
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum DataRangeEnd {
    /// Absolute end offset
    Absolute(usize),
    
    /// Length from start
    Length(usize),
    
    /// End of frame
    EndOfFrame,
    
    /// Calculated using expression
    Expression(String),
}

/// Conditional parsing rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionalRule {
    /// Condition expression
    pub condition: String,
    
    /// Fields to parse if condition is true
    pub then_fields: Vec<FieldDefinition>,
    
    /// Fields to parse if condition is false
    #[serde(default)]
    pub else_fields: Vec<FieldDefinition>,
}

// Helper function for serde default
fn default_true() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_protocol_rule_deserialization() {
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
        
        let rule: Result<ProtocolRule, _> = serde_yaml::from_str(yaml);
        assert!(rule.is_ok());
        
        let rule = rule.unwrap();
        assert_eq!(rule.meta.name, "Test Protocol");
        assert_eq!(rule.fields.len(), 1);
        assert_eq!(rule.fields[0].name, "test_field");
    }
}
