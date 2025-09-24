//! Escape sequence handling for data parsing
//! 
//! This module handles escape sequences in protocol data,
//! including byte replacement and custom escape rules.

use crate::parser::schema::{EscapeRule, EscapeDirection};
use crate::types::NetworkResult;

/// Escape sequence processor
pub struct EscapeProcessor {
    /// Escape rules to apply
    rules: Vec<EscapeRule>,
}

impl EscapeProcessor {
    /// Create a new escape processor
    pub fn new(rules: Vec<EscapeRule>) -> Self {
        Self { rules }
    }
    
    /// Process escape sequences in data
    pub fn process(&self, data: &[u8], direction: EscapeDirection) -> NetworkResult<Vec<u8>> {
        let mut result = data.to_vec();
        
        for rule in &self.rules {
            if matches!(rule.direction, EscapeDirection::Both) || rule.direction == direction {
                result = self.apply_rule(&result, rule, &direction)?;
            }
        }
        
        Ok(result)
    }
    
    /// Apply a single escape rule
    fn apply_rule(&self, data: &[u8], rule: &EscapeRule, direction: &EscapeDirection) -> NetworkResult<Vec<u8>> {
        let pattern = rule.pattern.as_bytes();
        let replacement = rule.replacement.as_bytes();
        
        match direction {
            EscapeDirection::Escape => {
                // Replace pattern with replacement
                self.replace_bytes(data, pattern, replacement)
            }
            EscapeDirection::Unescape => {
                // Replace replacement with pattern
                self.replace_bytes(data, replacement, pattern)
            }
            EscapeDirection::Both => {
                // This should be handled by the caller
                Ok(data.to_vec())
            }
        }
    }
    
    /// Replace byte sequences
    fn replace_bytes(&self, data: &[u8], from: &[u8], to: &[u8]) -> NetworkResult<Vec<u8>> {
        if from.is_empty() {
            return Ok(data.to_vec());
        }
        
        let mut result = Vec::new();
        let mut i = 0;
        
        while i < data.len() {
            if i + from.len() <= data.len() && &data[i..i + from.len()] == from {
                // Found pattern, replace with replacement
                result.extend_from_slice(to);
                i += from.len();
            } else {
                // No match, copy byte as-is
                result.push(data[i]);
                i += 1;
            }
        }
        
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_escape_processing() {
        let rules = vec![
            EscapeRule {
                pattern: "\\n".to_string(),
                replacement: "\n".to_string(),
                direction: EscapeDirection::Unescape,
            }
        ];
        
        let processor = EscapeProcessor::new(rules);
        let data = b"Hello\\nWorld";
        let result = processor.process(data, EscapeDirection::Unescape).unwrap();
        assert_eq!(result, b"Hello\nWorld");
    }
}
