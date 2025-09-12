//! Validation reporting system
//! 
//! This module provides comprehensive validation reporting capabilities,
//! including error categorization, fix suggestions, and detailed diagnostics.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

/// Comprehensive validation report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    /// Overall validation status
    pub valid: bool,
    
    /// Validation score (0.0 - 1.0)
    pub score: f64,
    
    /// Summary of validation results
    pub summary: ValidationSummary,
    
    /// Detailed validation issues
    pub issues: Vec<ValidationIssue>,
    
    /// Validation metrics
    pub metrics: ValidationMetrics,
    
    /// Suggestions for fixing issues
    pub suggestions: Vec<FixSuggestion>,
    
    /// Report metadata
    pub metadata: ReportMetadata,
}

/// Validation summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationSummary {
    /// Total number of validations performed
    pub total_validations: usize,
    
    /// Number of passed validations
    pub passed: usize,
    
    /// Number of failed validations
    pub failed: usize,
    
    /// Number of warnings
    pub warnings: usize,
    
    /// Number of critical issues
    pub critical: usize,
    
    /// Validation categories breakdown
    pub categories: HashMap<String, CategorySummary>,
}

/// Category-specific validation summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategorySummary {
    /// Category name
    pub name: String,
    
    /// Number of validations in this category
    pub total: usize,
    
    /// Number of passed validations
    pub passed: usize,
    
    /// Number of failed validations
    pub failed: usize,
    
    /// Category score (0.0 - 1.0)
    pub score: f64,
}

/// Individual validation issue
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationIssue {
    /// Unique issue ID
    pub id: String,
    
    /// Issue severity
    pub severity: IssueSeverity,
    
    /// Issue category
    pub category: IssueCategory,
    
    /// Issue title
    pub title: String,
    
    /// Detailed description
    pub description: String,
    
    /// Location information
    pub location: IssueLocation,
    
    /// Expected vs actual values
    pub expected: Option<serde_json::Value>,
    pub actual: Option<serde_json::Value>,
    
    /// Rule or validation that failed
    pub rule: Option<String>,
    
    /// Additional context
    pub context: HashMap<String, serde_json::Value>,
    
    /// Timestamp when issue was detected
    pub timestamp: DateTime<Utc>,
}

/// Issue severity levels
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IssueSeverity {
    /// Critical issue that prevents parsing
    Critical,
    
    /// Error that affects parsing quality
    Error,
    
    /// Warning that doesn't prevent parsing
    Warning,
    
    /// Informational message
    Info,
}

/// Issue categories
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IssueCategory {
    /// Frame structure issues
    Framing,
    
    /// Field parsing issues
    FieldParsing,
    
    /// Data type issues
    DataType,
    
    /// Validation rule failures
    Validation,
    
    /// CRC/checksum issues
    Integrity,
    
    /// Protocol compliance issues
    Protocol,
    
    /// Performance issues
    Performance,
    
    /// Configuration issues
    Configuration,
    
    /// Unknown or other issues
    Other,
}

/// Issue location information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueLocation {
    /// Byte offset in the data
    pub offset: Option<usize>,
    
    /// Length of the problematic data
    pub length: Option<usize>,
    
    /// Field name (if applicable)
    pub field: Option<String>,
    
    /// Nested field path (e.g., "header.timestamp.seconds")
    pub field_path: Option<String>,
    
    /// Line number (for text-based protocols)
    pub line: Option<usize>,
    
    /// Column number (for text-based protocols)
    pub column: Option<usize>,
}

/// Validation metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationMetrics {
    /// Time taken for validation (milliseconds)
    pub validation_time_ms: f64,
    
    /// Number of bytes validated
    pub bytes_validated: usize,
    
    /// Validation throughput (bytes/second)
    pub throughput_bps: f64,
    
    /// Memory usage during validation (bytes)
    pub memory_usage: Option<usize>,
    
    /// Number of rules evaluated
    pub rules_evaluated: usize,
    
    /// Cache hit rate for rule evaluation
    pub cache_hit_rate: Option<f64>,
}

/// Fix suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixSuggestion {
    /// Suggestion ID
    pub id: String,
    
    /// Related issue IDs
    pub related_issues: Vec<String>,
    
    /// Suggestion title
    pub title: String,
    
    /// Detailed description
    pub description: String,
    
    /// Suggested action type
    pub action_type: SuggestionType,
    
    /// Confidence level (0.0 - 1.0)
    pub confidence: f64,
    
    /// Estimated effort to implement
    pub effort: EffortLevel,
    
    /// Specific fix instructions
    pub instructions: Vec<String>,
    
    /// Code examples or snippets
    pub examples: Vec<CodeExample>,
}

/// Types of fix suggestions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SuggestionType {
    /// Modify the rule configuration
    ConfigChange,
    
    /// Update field definitions
    FieldUpdate,
    
    /// Fix validation rules
    ValidationFix,
    
    /// Adjust framing rules
    FramingFix,
    
    /// Data preprocessing needed
    DataPreprocessing,
    
    /// Protocol version mismatch
    VersionUpdate,
    
    /// General recommendation
    Recommendation,
}

/// Effort level for implementing a fix
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EffortLevel {
    /// Quick fix (< 5 minutes)
    Low,
    
    /// Moderate effort (5-30 minutes)
    Medium,
    
    /// Significant effort (30+ minutes)
    High,
    
    /// Major changes required
    Critical,
}

/// Code example for fix suggestions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeExample {
    /// Example title
    pub title: String,
    
    /// Programming language or format
    pub language: String,
    
    /// Code content
    pub code: String,
    
    /// Description of the example
    pub description: String,
}

/// Report metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportMetadata {
    /// Report generation timestamp
    pub generated_at: DateTime<Utc>,
    
    /// Validator version
    pub validator_version: String,
    
    /// Rule file used
    pub rule_file: Option<String>,
    
    /// Data source information
    pub data_source: Option<String>,
    
    /// Additional metadata
    pub extra: HashMap<String, serde_json::Value>,
}

impl ValidationReport {
    /// Create a new validation report
    pub fn new() -> Self {
        Self {
            valid: true,
            score: 1.0,
            summary: ValidationSummary::new(),
            issues: Vec::new(),
            metrics: ValidationMetrics::default(),
            suggestions: Vec::new(),
            metadata: ReportMetadata::default(),
        }
    }
    
    /// Add a validation issue
    pub fn add_issue(&mut self, issue: ValidationIssue) {
        // Update overall validity
        if matches!(issue.severity, IssueSeverity::Critical | IssueSeverity::Error) {
            self.valid = false;
        }
        
        // Update summary
        self.summary.total_validations += 1;
        match issue.severity {
            IssueSeverity::Critical => {
                self.summary.failed += 1;
                self.summary.critical += 1;
            }
            IssueSeverity::Error => {
                self.summary.failed += 1;
            }
            IssueSeverity::Warning => {
                self.summary.warnings += 1;
            }
            IssueSeverity::Info => {
                self.summary.passed += 1;
            }
        }
        
        // Update category summary
        let category_name = format!("{:?}", issue.category);
        let category_summary = self.summary.categories
            .entry(category_name.clone())
            .or_insert_with(|| CategorySummary {
                name: category_name,
                total: 0,
                passed: 0,
                failed: 0,
                score: 1.0,
            });
        
        category_summary.total += 1;
        if matches!(issue.severity, IssueSeverity::Critical | IssueSeverity::Error) {
            category_summary.failed += 1;
        } else {
            category_summary.passed += 1;
        }
        category_summary.score = category_summary.passed as f64 / category_summary.total as f64;
        
        self.issues.push(issue);
        self.update_score();
    }
    
    /// Add a fix suggestion
    pub fn add_suggestion(&mut self, suggestion: FixSuggestion) {
        self.suggestions.push(suggestion);
    }
    
    /// Update the overall validation score
    fn update_score(&mut self) {
        if self.summary.total_validations == 0 {
            self.score = 1.0;
            return;
        }
        
        let critical_penalty = self.summary.critical as f64 * 0.5;
        let error_penalty = (self.summary.failed - self.summary.critical) as f64 * 0.3;
        let warning_penalty = self.summary.warnings as f64 * 0.1;
        
        let total_penalty = critical_penalty + error_penalty + warning_penalty;
        let max_penalty = self.summary.total_validations as f64;
        
        self.score = (1.0 - (total_penalty / max_penalty)).max(0.0);
    }
    
    /// Get issues by severity
    pub fn get_issues_by_severity(&self, severity: IssueSeverity) -> Vec<&ValidationIssue> {
        self.issues.iter()
            .filter(|issue| std::mem::discriminant(&issue.severity) == std::mem::discriminant(&severity))
            .collect()
    }
    
    /// Get issues by category
    pub fn get_issues_by_category(&self, category: IssueCategory) -> Vec<&ValidationIssue> {
        self.issues.iter()
            .filter(|issue| std::mem::discriminant(&issue.category) == std::mem::discriminant(&category))
            .collect()
    }
    
    /// Check if report has critical issues
    pub fn has_critical_issues(&self) -> bool {
        self.summary.critical > 0
    }
    
    /// Check if report has any errors
    pub fn has_errors(&self) -> bool {
        self.summary.failed > 0
    }
    
    /// Check if report has warnings
    pub fn has_warnings(&self) -> bool {
        self.summary.warnings > 0
    }
}

impl ValidationSummary {
    fn new() -> Self {
        Self {
            total_validations: 0,
            passed: 0,
            failed: 0,
            warnings: 0,
            critical: 0,
            categories: HashMap::new(),
        }
    }
}

impl Default for ValidationMetrics {
    fn default() -> Self {
        Self {
            validation_time_ms: 0.0,
            bytes_validated: 0,
            throughput_bps: 0.0,
            memory_usage: None,
            rules_evaluated: 0,
            cache_hit_rate: None,
        }
    }
}

impl Default for ReportMetadata {
    fn default() -> Self {
        Self {
            generated_at: Utc::now(),
            validator_version: "1.0.0".to_string(),
            rule_file: None,
            data_source: None,
            extra: HashMap::new(),
        }
    }
}

impl Default for ValidationReport {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validation_report_creation() {
        let report = ValidationReport::new();
        assert!(report.valid);
        assert_eq!(report.score, 1.0);
        assert_eq!(report.issues.len(), 0);
    }
    
    #[test]
    fn test_add_critical_issue() {
        let mut report = ValidationReport::new();
        
        let issue = ValidationIssue {
            id: "test-001".to_string(),
            severity: IssueSeverity::Critical,
            category: IssueCategory::Framing,
            title: "Critical framing error".to_string(),
            description: "Frame delimiter not found".to_string(),
            location: IssueLocation {
                offset: Some(0),
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
        
        assert!(!report.valid);
        assert!(report.has_critical_issues());
        assert_eq!(report.summary.critical, 1);
        assert!(report.score < 1.0);
    }
    
    #[test]
    fn test_issues_by_category() {
        let mut report = ValidationReport::new();
        
        let framing_issue = ValidationIssue {
            id: "framing-001".to_string(),
            severity: IssueSeverity::Error,
            category: IssueCategory::Framing,
            title: "Framing error".to_string(),
            description: "Invalid frame structure".to_string(),
            location: IssueLocation {
                offset: Some(0),
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
        
        let field_issue = ValidationIssue {
            id: "field-001".to_string(),
            severity: IssueSeverity::Warning,
            category: IssueCategory::FieldParsing,
            title: "Field parsing warning".to_string(),
            description: "Field value out of expected range".to_string(),
            location: IssueLocation {
                offset: Some(10),
                length: Some(2),
                field: Some("test_field".to_string()),
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
        
        report.add_issue(framing_issue);
        report.add_issue(field_issue);
        
        let framing_issues = report.get_issues_by_category(IssueCategory::Framing);
        assert_eq!(framing_issues.len(), 1);
        
        let field_issues = report.get_issues_by_category(IssueCategory::FieldParsing);
        assert_eq!(field_issues.len(), 1);
    }
}
