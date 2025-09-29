//! Factor code translation module for HJ212 and other environmental protocols
//! 
//! This module provides functionality to translate factor codes (like a00001)
//! into human-readable names and metadata.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::types::{NetworkResult, NetworkError};

/// Factor code definition with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FactorDefinition {
    /// Factor name in Chinese
    pub name: String,
    
    /// Factor name in English
    pub name_en: Option<String>,
    
    /// Unit of measurement
    pub unit: String,
    
    /// Unit in English
    pub unit_en: Option<String>,
    
    /// Factor category
    pub category: String,
    
    /// Data type (float, integer, string)
    pub data_type: String,
    
    /// Decimal precision
    pub precision: Option<u8>,
    
    /// Valid range [min, max]
    pub range: Option<[f64; 2]>,
    
    /// Description
    pub description: String,

    /// High alarm threshold
    pub alarm_high: Option<f64>,

    /// Low alarm threshold
    pub alarm_low: Option<f64>,

    /// Standard reference value
    pub standard_value: Option<f64>,

    /// Quality grade or standard
    pub quality_grade: Option<String>,
}

/// Parsed factor data with translation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedFactor {
    /// Original factor code
    pub code: String,
    
    /// Translated name
    pub name: String,
    
    /// English name if available
    pub name_en: Option<String>,
    
    /// Unit
    pub unit: String,
    
    /// Category
    pub category: String,
    
    /// Parsed value
    pub value: Option<FactorValue>,
    
    /// Quality flag
    pub quality_flag: Option<String>,
    
    /// Quality description
    pub quality_description: Option<String>,
    
    /// Validation errors
    pub validation_errors: Vec<String>,
    
    /// Whether this is an unknown factor
    pub is_unknown: bool,

    /// Alarm status
    pub alarm_status: Option<AlarmStatus>,

    /// Standard reference value
    pub standard_value: Option<f64>,

    /// Quality grade
    pub quality_grade: Option<String>,
}

/// Alarm status for factor values
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlarmStatus {
    Normal,
    HighAlarm,
    LowAlarm,
    OutOfRange,
}

/// Factor value with type information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum FactorValue {
    Float(f64),
    Integer(i64),
    String(String),
}

/// Quality flag descriptions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityFlags {
    flags: HashMap<String, String>,
}

impl Default for QualityFlags {
    fn default() -> Self {
        let mut flags = HashMap::new();
        flags.insert("N".to_string(), "正常数据".to_string());
        flags.insert("F".to_string(), "停运".to_string());
        flags.insert("M".to_string(), "维护".to_string());
        flags.insert("S".to_string(), "手工置数".to_string());
        flags.insert("D".to_string(), "故障".to_string());
        flags.insert("C".to_string(), "校准".to_string());
        flags.insert("P".to_string(), "超标准量程上限".to_string());
        flags.insert("T".to_string(), "通讯异常".to_string());
        flags.insert("B".to_string(), "超标准量程下限".to_string());
        
        Self { flags }
    }
}

impl QualityFlags {
    pub fn get_description(&self, flag: &str) -> Option<&String> {
        self.flags.get(flag)
    }
}

/// Factor code translator
#[derive(Debug, Clone)]
pub struct FactorTranslator {
    /// Factor definitions
    factor_definitions: HashMap<String, FactorDefinition>,
    
    /// Quality flag descriptions
    quality_flags: QualityFlags,
}

impl FactorTranslator {
    /// Create a new factor translator
    pub fn new() -> Self {
        Self {
            factor_definitions: HashMap::new(),
            quality_flags: QualityFlags::default(),
        }
    }
    
    /// Load factor definitions from a HashMap
    pub fn load_factor_definitions(&mut self, definitions: HashMap<String, FactorDefinition>) {
        self.factor_definitions = definitions;
    }
    
    /// Add a single factor definition
    pub fn add_factor_definition(&mut self, code: String, definition: FactorDefinition) {
        self.factor_definitions.insert(code, definition);
    }
    
    /// Get factor definition by code
    pub fn get_factor_definition(&self, code: &str) -> Option<&FactorDefinition> {
        self.factor_definitions.get(code)
    }
    
    /// Parse factor string (format: code-value-flag,code-value-flag,...)
    pub fn parse_factor_string(&self, factor_string: &str) -> NetworkResult<Vec<ParsedFactor>> {
        let mut parsed_factors = Vec::new();
        
        if factor_string.is_empty() {
            return Ok(parsed_factors);
        }
        
        // Split by comma to get individual factors
        let factor_groups: Vec<&str> = factor_string.split(',').collect();
        
        for group in factor_groups {
            let group = group.trim();
            if group.is_empty() {
                continue;
            }
            
            // Parse individual factor group (code-value-flag)
            let parts: Vec<&str> = group.split('-').collect();
            if parts.is_empty() {
                continue;
            }
            
            let factor_code = parts[0].trim();
            let mut parsed_factor = ParsedFactor {
                code: factor_code.to_string(),
                name: "未知因子".to_string(),
                name_en: None,
                unit: "".to_string(),
                category: "unknown".to_string(),
                value: None,
                quality_flag: None,
                quality_description: None,
                validation_errors: Vec::new(),
                is_unknown: true,
                alarm_status: None,
                standard_value: None,
                quality_grade: None,
            };
            
            // Try to get factor definition
            if let Some(definition) = self.factor_definitions.get(factor_code) {
                parsed_factor.name = definition.name.clone();
                parsed_factor.name_en = definition.name_en.clone();
                parsed_factor.unit = definition.unit.clone();
                parsed_factor.category = definition.category.clone();
                parsed_factor.is_unknown = false;
                parsed_factor.standard_value = definition.standard_value;
                parsed_factor.quality_grade = definition.quality_grade.clone();
                
                // Parse value if present
                if parts.len() >= 2 {
                    let value_str = parts[1].trim();
                    if !value_str.is_empty() && value_str != "-" {
                        match self.parse_factor_value(value_str, definition) {
                            Ok(value) => {
                                parsed_factor.value = Some(value);
                                
                                // Validate range and check alarms
                                if let Some(FactorValue::Float(val)) = &parsed_factor.value {
                                    // Check range
                                    if let Some(range) = &definition.range {
                                        if *val < range[0] || *val > range[1] {
                                            parsed_factor.validation_errors.push(
                                                format!("数值{}超出有效范围[{}, {}]", val, range[0], range[1])
                                            );
                                            parsed_factor.alarm_status = Some(AlarmStatus::OutOfRange);
                                        }
                                    }

                                    // Check alarm thresholds
                                    if parsed_factor.alarm_status.is_none() {
                                        if let Some(high_threshold) = definition.alarm_high {
                                            if *val > high_threshold {
                                                parsed_factor.alarm_status = Some(AlarmStatus::HighAlarm);
                                            }
                                        }

                                        if let Some(low_threshold) = definition.alarm_low {
                                            if *val < low_threshold {
                                                parsed_factor.alarm_status = Some(AlarmStatus::LowAlarm);
                                            }
                                        }

                                        // If no alarms, set as normal
                                        if parsed_factor.alarm_status.is_none() {
                                            parsed_factor.alarm_status = Some(AlarmStatus::Normal);
                                        }
                                    }
                                }
                            }
                            Err(e) => {
                                parsed_factor.validation_errors.push(
                                    format!("数值解析错误: {}", e)
                                );
                            }
                        }
                    }
                }
                
                // Parse quality flag if present
                if parts.len() >= 3 {
                    let flag = parts[2].trim();
                    if !flag.is_empty() {
                        parsed_factor.quality_flag = Some(flag.to_string());
                        parsed_factor.quality_description = self.quality_flags
                            .get_description(flag)
                            .map(|s| s.clone());
                        
                        if parsed_factor.quality_description.is_none() {
                            parsed_factor.validation_errors.push(
                                format!("未知的质量标识: {}", flag)
                            );
                        }
                    }
                }
            } else {
                parsed_factor.validation_errors.push(
                    format!("未知的因子代码: {}", factor_code)
                );
            }
            
            parsed_factors.push(parsed_factor);
        }
        
        Ok(parsed_factors)
    }
    
    /// Parse factor value according to its data type
    fn parse_factor_value(&self, value_str: &str, definition: &FactorDefinition) -> NetworkResult<FactorValue> {
        match definition.data_type.as_str() {
            "float" => {
                match value_str.parse::<f64>() {
                    Ok(val) => Ok(FactorValue::Float(val)),
                    Err(_) => Err(NetworkError::ParseError(
                        format!("无法将'{}'解析为浮点数", value_str)
                    )),
                }
            }
            "integer" => {
                match value_str.parse::<i64>() {
                    Ok(val) => Ok(FactorValue::Integer(val)),
                    Err(_) => Err(NetworkError::ParseError(
                        format!("无法将'{}'解析为整数", value_str)
                    )),
                }
            }
            _ => Ok(FactorValue::String(value_str.to_string())),
        }
    }
    
    /// Get summary statistics for parsed factors
    pub fn get_factor_summary(&self, factors: &[ParsedFactor]) -> FactorSummary {
        let mut summary = FactorSummary {
            total_factors: factors.len(),
            unknown_factors: 0,
            categories: HashMap::new(),
            quality_status: HashMap::new(),
            validation_errors: 0,
        };
        
        for factor in factors {
            // Count unknown factors
            if factor.is_unknown {
                summary.unknown_factors += 1;
            }
            
            // Count by category
            *summary.categories.entry(factor.category.clone()).or_insert(0) += 1;
            
            // Count by quality status
            let quality = factor.quality_flag.as_deref().unwrap_or("未知");
            *summary.quality_status.entry(quality.to_string()).or_insert(0) += 1;
            
            // Count validation errors
            summary.validation_errors += factor.validation_errors.len();
        }
        
        summary
    }
}

/// Factor parsing summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FactorSummary {
    pub total_factors: usize,
    pub unknown_factors: usize,
    pub categories: HashMap<String, usize>,
    pub quality_status: HashMap<String, usize>,
    pub validation_errors: usize,
}

impl Default for FactorTranslator {
    fn default() -> Self {
        Self::new()
    }
}
