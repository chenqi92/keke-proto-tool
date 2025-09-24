//! Concrete protocol parser implementation
//! 
//! This module provides a concrete implementation of the Parser trait
//! that can handle .kkp.yaml rules and parse protocol data.

use crate::parser::{Parser, ProtocolInfo as ParserProtocolInfo};
use crate::parser::schema::*;
use crate::parser::rules::RulesLoader;
use crate::parser::compiler::{RuleCompiler, CompiledRule};
use crate::parser::cache::RuleCache;
use crate::parser::framing::FrameDetector;
use crate::parser::types::TypeParser;
use crate::parser::result::{ParseResult, ParseError, ErrorSeverity, FieldValue, ParsedField, ParsedFields, ProtocolInfo, FieldMetadata, FieldValidationResult};
use crate::parser::validation_report::{ValidationReport, ValidationIssue, IssueSeverity, IssueCategory, IssueLocation};
use crate::types::{NetworkResult, NetworkError};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use chrono::Utc;

/// Concrete protocol parser implementation
pub struct ProtocolParser {
    /// Parser ID
    id: String,
    
    /// Compiled rule
    compiled_rule: Arc<CompiledRule>,
    
    /// Frame detector
    frame_detector: Arc<RwLock<FrameDetector>>,
    
    /// Rule cache
    cache: Arc<RuleCache>,
}

impl ProtocolParser {
    /// Create a new protocol parser from a rule file
    pub fn from_rule_file(parser_id: String, rule_file_path: &str) -> NetworkResult<Self> {
        let mut rules_loader = RulesLoader::new();
        let rule = rules_loader.load_rule(rule_file_path)?;
        Self::from_rule(parser_id, rule)
    }
    
    /// Create a new protocol parser from a rule string
    pub fn from_rule_string(parser_id: String, rule_content: &str) -> NetworkResult<Self> {
        let mut rules_loader = RulesLoader::new();
        let rule = rules_loader.load_rule_from_string(rule_content)?;
        Self::from_rule(parser_id, rule)
    }
    
    /// Create a new protocol parser from a protocol rule
    pub fn from_rule(parser_id: String, rule: ProtocolRule) -> NetworkResult<Self> {
        // Compile the rule
        let compiler = RuleCompiler::new();
        let compiled_rule = compiler.compile(rule)?;
        
        // Create frame detector
        let frame_detector = FrameDetector::new(compiled_rule.rule.framing.clone());
        
        // Create cache
        let cache = Arc::new(RuleCache::new(100));
        
        Ok(Self {
            id: parser_id,
            compiled_rule: Arc::new(compiled_rule),
            frame_detector: Arc::new(RwLock::new(frame_detector)),
            cache,
        })
    }
    
    /// Parse a single frame
    fn parse_frame(&self, frame_data: &[u8]) -> NetworkResult<ParsedFields> {
        let mut fields = ParsedFields::new();
        let rule = &self.compiled_rule.rule;
        
        // Parse each field according to the rule
        for field_def in &rule.fields {
            match self.parse_single_field(frame_data, field_def) {
                Ok(parsed_field) => {
                    fields.add_field(field_def.name.clone(), parsed_field);
                }
                Err(e) => {
                    log::warn!("Failed to parse field '{}': {}", field_def.name, e);
                    // Create an error field
                    let error_field = ParsedField {
                        name: field_def.name.clone(),
                        value: FieldValue::Null,
                        raw_bytes: vec![],
                        offset: 0,
                        length: 0,
                        field_type: format!("{:?}", field_def.field_type),
                        description: field_def.description.clone(),
                        valid: false,
                        validation: FieldValidationResult {
                            valid: false,
                            errors: vec![e.to_string()],
                            warnings: vec![],
                            metadata: HashMap::new(),
                        },
                        nested_fields: None,
                        metadata: FieldMetadata::default(),
                    };
                    fields.add_field(field_def.name.clone(), error_field);
                }
            }
        }
        
        Ok(fields)
    }
    
    /// Parse a single field
    fn parse_single_field(&self, data: &[u8], field_def: &FieldDefinition) -> NetworkResult<ParsedField> {
        // Calculate field offset
        let offset = match &field_def.offset {
            FieldOffset::Absolute(offset) => *offset,
            FieldOffset::Relative(_) => {
                // TODO: Implement relative offset calculation
                return Err(NetworkError::ParseError("Relative offsets not yet implemented".to_string()));
            }
            FieldOffset::Expression(_) => {
                // TODO: Implement expression evaluation
                return Err(NetworkError::ParseError("Expression offsets not yet implemented".to_string()));
            }
        };
        
        // Calculate field length
        let length = match &field_def.length {
            FieldLength::Fixed(len) => *len,
            FieldLength::Variable(_) => {
                // TODO: Implement variable length calculation
                return Err(NetworkError::ParseError("Variable lengths not yet implemented".to_string()));
            }
            FieldLength::UntilDelimiter(_) => {
                // TODO: Implement delimiter-based length
                return Err(NetworkError::ParseError("Delimiter-based lengths not yet implemented".to_string()));
            }
            FieldLength::Remaining => {
                if offset < data.len() {
                    data.len() - offset
                } else {
                    0
                }
            }
            FieldLength::Expression(_) => {
                // TODO: Implement expression evaluation
                return Err(NetworkError::ParseError("Expression lengths not yet implemented".to_string()));
            }
        };
        
        // Check bounds
        if offset + length > data.len() {
            return Err(NetworkError::ParseError(format!(
                "Field '{}' extends beyond data bounds: offset={}, length={}, data_len={}",
                field_def.name, offset, length, data.len()
            )));
        }
        
        // Extract raw bytes
        let raw_bytes = data[offset..offset + length].to_vec();
        
        // Parse field value
        let value = TypeParser::parse_field(
            data,
            offset,
            length,
            &field_def.field_type,
            &field_def.endian,
        )?;
        
        // Create parsed field
        Ok(ParsedField {
            name: field_def.name.clone(),
            value,
            raw_bytes,
            offset,
            length,
            field_type: format!("{:?}", field_def.field_type),
            description: field_def.description.clone(),
            valid: true,
            validation: FieldValidationResult::default(),
            nested_fields: None,
            metadata: FieldMetadata {
                optional: field_def.optional,
                used_default: false,
                endianness: Some(format!("{:?}", field_def.endian)),
                encoding: None,
                extra: HashMap::new(),
            },
        })
    }
}

impl Parser for ProtocolParser {
    fn parse(&self, data: &[u8]) -> NetworkResult<ParseResult> {
        let start_time = std::time::Instant::now();
        
        // Detect frames in the data
        let mut frame_detector = self.frame_detector.write().unwrap();
        let frames = frame_detector.detect_frames(data)?;
        drop(frame_detector);
        
        if frames.is_empty() {
            return Ok(ParseResult::failure(
                ProtocolInfo {
                    name: self.compiled_rule.rule.meta.name.clone(),
                    version: self.compiled_rule.rule.meta.version.clone(),
                    parser_id: self.id.clone(),
                    confidence: 0.0,
                },
                data.to_vec(),
                ParseError {
                    message: "No frames detected in data".to_string(),
                    code: "NO_FRAMES".to_string(),
                    offset: None,
                    field: None,
                    severity: ErrorSeverity::Error,
                    context: HashMap::new(),
                },
            ));
        }
        
        // Parse the first complete frame
        let frame = &frames[0];
        if !frame.complete {
            return Ok(ParseResult::failure(
                ProtocolInfo {
                    name: self.compiled_rule.rule.meta.name.clone(),
                    version: self.compiled_rule.rule.meta.version.clone(),
                    parser_id: self.id.clone(),
                    confidence: 0.5,
                },
                data.to_vec(),
                ParseError {
                    message: "Incomplete frame detected".to_string(),
                    code: "INCOMPLETE_FRAME".to_string(),
                    offset: Some(frame.start_offset),
                    field: None,
                    severity: ErrorSeverity::Warning,
                    context: HashMap::new(),
                },
            ));
        }
        
        // Parse fields from the frame
        let fields = self.parse_frame(&frame.data)?;
        
        // Create parse result
        let mut result = ParseResult::success(
            ProtocolInfo {
                name: self.compiled_rule.rule.meta.name.clone(),
                version: self.compiled_rule.rule.meta.version.clone(),
                parser_id: self.id.clone(),
                confidence: 1.0,
            },
            fields,
            data.to_vec(),
            frame.data.len(),
        );
        
        // Update metadata
        result.metadata.parse_time_ms = start_time.elapsed().as_secs_f64() * 1000.0;
        result.metadata.timestamp = Utc::now();
        result.metadata.parser_version = "1.0.0".to_string();
        
        Ok(result)
    }
    
    fn validate(&self, result: &ParseResult) -> ValidationReport {
        let mut report = ValidationReport::new();
        
        // Basic validation - check if parsing was successful
        if !result.success {
            let issue = ValidationIssue {
                id: "PARSE_FAILED".to_string(),
                severity: IssueSeverity::Critical,
                category: IssueCategory::Protocol,
                title: "Parsing Failed".to_string(),
                description: "The data could not be parsed successfully".to_string(),
                location: IssueLocation {
                    offset: None,
                    length: None,
                    field: None,
                    field_path: None,
                    line: None,
                    column: None,
                },
                expected: None,
                actual: None,
                rule: None,
                context: HashMap::new(),
                timestamp: Utc::now(),
            };
            report.add_issue(issue);
        }
        
        // Validate individual fields
        for field_name in result.fields.get_field_names() {
            if let Some(field) = result.fields.get_field(field_name) {
                if !field.valid {
                    let issue = ValidationIssue {
                        id: format!("FIELD_INVALID_{}", field_name),
                        severity: IssueSeverity::Error,
                        category: IssueCategory::FieldParsing,
                        title: format!("Field '{}' validation failed", field_name),
                        description: field.validation.errors.join("; "),
                        location: IssueLocation {
                            offset: Some(field.offset),
                            length: Some(field.length),
                            field: Some(field_name.clone()),
                            field_path: Some(field_name.clone()),
                            line: None,
                            column: None,
                        },
                        expected: None,
                        actual: Some(serde_json::Value::String(field.value.as_string())),
                        rule: None,
                        context: HashMap::new(),
                        timestamp: Utc::now(),
                    };
                    report.add_issue(issue);
                }
            }
        }
        
        // TODO: Add more comprehensive validation
        // - CRC/checksum validation
        // - Range validation
        // - Custom validation rules
        
        report
    }
    
    fn get_protocol_info(&self) -> ParserProtocolInfo {
        ParserProtocolInfo {
            name: self.compiled_rule.rule.meta.name.clone(),
            version: self.compiled_rule.rule.meta.version.clone(),
            author: self.compiled_rule.rule.meta.author.clone(),
            description: self.compiled_rule.rule.meta.description.clone(),
            supported_formats: vec!["binary".to_string()],
            magic_bytes: None,
            min_frame_size: None,
            max_frame_size: None,
        }
    }
    
    fn get_id(&self) -> &str {
        &self.id
    }
    
    fn can_parse(&self, data: &[u8]) -> bool {
        // Simple heuristic - try to detect at least one frame
        let mut frame_detector = match self.frame_detector.write() {
            Ok(detector) => detector,
            Err(_) => return false,
        };
        
        match frame_detector.detect_frames(data) {
            Ok(frames) => !frames.is_empty(),
            Err(_) => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_rule() -> ProtocolRule {
        ProtocolRule {
            meta: ProtocolMeta {
                name: "Test Protocol".to_string(),
                version: "1.0.0".to_string(),
                author: "Test".to_string(),
                description: "Test protocol".to_string(),
                supported_formats: vec!["hex".to_string()],
                category: "test".to_string(),
                tags: vec![],
            },
            framing: FramingRule {
                start_delimiter: None,
                end_delimiter: None,
                length_field: None,
                fixed_size: Some(4),
                escape_rules: vec![],
                frame_validation: FrameValidation::default(),
            },
            fields: vec![
                FieldDefinition {
                    name: "field1".to_string(),
                    field_type: FieldType::Uint8,
                    offset: FieldOffset::Absolute(0),
                    length: FieldLength::Fixed(1),
                    endian: Endianness::Big,
                    description: "Test field 1".to_string(),
                    optional: false,
                    default_value: None,
                    validation: FieldValidation::default(),
                    condition: None,
                },
                FieldDefinition {
                    name: "field2".to_string(),
                    field_type: FieldType::Uint16,
                    offset: FieldOffset::Absolute(1),
                    length: FieldLength::Fixed(2),
                    endian: Endianness::Big,
                    description: "Test field 2".to_string(),
                    optional: false,
                    default_value: None,
                    validation: FieldValidation::default(),
                    condition: None,
                },
                FieldDefinition {
                    name: "field3".to_string(),
                    field_type: FieldType::Uint8,
                    offset: FieldOffset::Absolute(3),
                    length: FieldLength::Fixed(1),
                    endian: Endianness::Big,
                    description: "Test field 3".to_string(),
                    optional: false,
                    default_value: None,
                    validation: FieldValidation::default(),
                    condition: None,
                },
            ],
            validation: ValidationRules::default(),
            conditions: vec![],
            functions: HashMap::new(),
        }
    }
    
    #[test]
    fn test_protocol_parser_creation() {
        let rule = create_test_rule();
        let parser = ProtocolParser::from_rule("test".to_string(), rule);
        assert!(parser.is_ok());
        
        let parser = parser.unwrap();
        assert_eq!(parser.get_id(), "test");
        
        let info = parser.get_protocol_info();
        assert_eq!(info.name, "Test Protocol");
        assert_eq!(info.version, "1.0.0");
    }
    
    #[test]
    fn test_protocol_parser_parsing() {
        let rule = create_test_rule();
        let parser = ProtocolParser::from_rule("test".to_string(), rule).unwrap();
        
        // Test data: [0x01, 0x02, 0x03, 0x04]
        let data = [0x01, 0x02, 0x03, 0x04];
        let result = parser.parse(&data);
        assert!(result.is_ok());
        
        let result = result.unwrap();
        assert!(result.success);
        assert_eq!(result.fields.len(), 3);
        
        // Check field values
        let field1 = result.fields.get_field("field1").unwrap();
        assert_eq!(field1.value, FieldValue::UInt(0x01));
        
        let field2 = result.fields.get_field("field2").unwrap();
        assert_eq!(field2.value, FieldValue::UInt(0x0203));
        
        let field3 = result.fields.get_field("field3").unwrap();
        assert_eq!(field3.value, FieldValue::UInt(0x04));
    }
    
    #[test]
    fn test_protocol_parser_validation() {
        let rule = create_test_rule();
        let parser = ProtocolParser::from_rule("test".to_string(), rule).unwrap();
        
        let data = [0x01, 0x02, 0x03, 0x04];
        let result = parser.parse(&data).unwrap();
        
        let validation_report = parser.validate(&result);
        assert!(validation_report.valid);
        assert_eq!(validation_report.issues.len(), 0);
    }
    
    #[test]
    fn test_protocol_parser_can_parse() {
        let rule = create_test_rule();
        let parser = ProtocolParser::from_rule("test".to_string(), rule).unwrap();
        
        let data = [0x01, 0x02, 0x03, 0x04];
        assert!(parser.can_parse(&data));
        
        let short_data = [0x01, 0x02];
        assert!(!parser.can_parse(&short_data));
    }
}
