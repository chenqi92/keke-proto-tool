//! Frame boundary detection and synchronization
//! 
//! This module handles frame synchronization, boundary detection,
//! and frame extraction from data streams.

use crate::parser::schema::{FramingRule, LengthField, LengthEncoding, Endianness};
use crate::types::{NetworkResult, NetworkError};

/// Frame boundary detector
pub struct FrameDetector {
    /// Framing rules
    rules: FramingRule,
    
    /// Internal state for streaming detection
    state: DetectorState,
}

/// Internal state for frame detection
#[derive(Debug, Clone)]
struct DetectorState {
    /// Buffer for partial frames
    buffer: Vec<u8>,
    
    /// Current detection state
    current_state: FrameState,
    
    /// Bytes processed so far
    bytes_processed: usize,
}

/// Frame detection states
#[derive(Debug, Clone, PartialEq)]
enum FrameState {
    /// Looking for frame start
    SearchingStart,
    
    /// Reading frame length
    ReadingLength,
    
    /// Reading frame data
    ReadingData { expected_length: usize },
    
    /// Frame complete
    Complete,
}

/// Detected frame information
#[derive(Debug, Clone)]
pub struct DetectedFrame {
    /// Frame data
    pub data: Vec<u8>,
    
    /// Frame start offset in original data
    pub start_offset: usize,
    
    /// Frame end offset in original data
    pub end_offset: usize,
    
    /// Whether frame appears complete
    pub complete: bool,
    
    /// Frame metadata
    pub metadata: FrameMetadata,
}

/// Frame metadata
#[derive(Debug, Clone)]
pub struct FrameMetadata {
    /// Detected frame length
    pub length: Option<usize>,
    
    /// Start delimiter found
    pub has_start_delimiter: bool,
    
    /// End delimiter found
    pub has_end_delimiter: bool,
    
    /// Length field value (if present)
    pub length_field_value: Option<u64>,
}

impl FrameDetector {
    /// Create a new frame detector
    pub fn new(rules: FramingRule) -> Self {
        Self {
            rules,
            state: DetectorState {
                buffer: Vec::new(),
                current_state: FrameState::SearchingStart,
                bytes_processed: 0,
            },
        }
    }
    
    /// Detect frames in data
    pub fn detect_frames(&mut self, data: &[u8]) -> NetworkResult<Vec<DetectedFrame>> {
        let mut frames = Vec::new();
        
        // Add new data to buffer
        self.state.buffer.extend_from_slice(data);
        
        // Process buffer to extract frames
        while !self.state.buffer.is_empty() {
            match self.process_buffer()? {
                Some(frame) => frames.push(frame),
                None => break, // Need more data
            }
        }
        
        Ok(frames)
    }
    
    /// Process internal buffer to extract a frame
    fn process_buffer(&mut self) -> NetworkResult<Option<DetectedFrame>> {
        match &self.state.current_state {
            FrameState::SearchingStart => self.search_frame_start(),
            FrameState::ReadingLength => self.read_frame_length(),
            FrameState::ReadingData { expected_length } => self.read_frame_data(*expected_length),
            FrameState::Complete => {
                // Reset state for next frame
                self.state.current_state = FrameState::SearchingStart;
                Ok(None)
            }
        }
    }
    
    /// Search for frame start delimiter
    fn search_frame_start(&mut self) -> NetworkResult<Option<DetectedFrame>> {
        if let Some(ref start_delimiter) = self.rules.start_delimiter {
            let delimiter_bytes = start_delimiter.as_bytes();
            
            // Look for start delimiter in buffer
            if let Some(pos) = self.find_pattern(&self.state.buffer, delimiter_bytes) {
                // Remove data before delimiter
                self.state.buffer.drain(..pos);
                
                // Move to next state based on framing method
                if self.rules.length_field.is_some() {
                    self.state.current_state = FrameState::ReadingLength;
                } else if let Some(fixed_size) = self.rules.fixed_size {
                    self.state.current_state = FrameState::ReadingData { expected_length: fixed_size };
                } else {
                    // Use end delimiter
                    self.state.current_state = FrameState::ReadingData { expected_length: usize::MAX };
                }
                
                return self.process_buffer();
            }
        } else {
            // No start delimiter, proceed based on other framing methods
            if self.rules.length_field.is_some() {
                self.state.current_state = FrameState::ReadingLength;
            } else if let Some(fixed_size) = self.rules.fixed_size {
                self.state.current_state = FrameState::ReadingData { expected_length: fixed_size };
            } else {
                return Err(NetworkError::ParseError(
                    "No framing method specified".to_string()
                ));
            }
            
            return self.process_buffer();
        }
        
        Ok(None) // Need more data
    }
    
    /// Read frame length field
    fn read_frame_length(&mut self) -> NetworkResult<Option<DetectedFrame>> {
        let length_field = self.rules.length_field.as_ref().unwrap();
        
        // Check if we have enough data for length field
        if self.state.buffer.len() < length_field.offset + length_field.length {
            return Ok(None); // Need more data
        }
        
        // Extract length field data
        let length_data = &self.state.buffer[length_field.offset..length_field.offset + length_field.length];
        
        // Parse length based on encoding
        let frame_length = self.parse_length_field(length_data, length_field)?;
        
        // Adjust length based on configuration
        let total_length = if length_field.includes_header {
            frame_length
        } else {
            frame_length + length_field.offset + length_field.length
        };
        
        self.state.current_state = FrameState::ReadingData { expected_length: total_length };
        self.process_buffer()
    }
    
    /// Read frame data
    fn read_frame_data(&mut self, expected_length: usize) -> NetworkResult<Option<DetectedFrame>> {
        if expected_length == usize::MAX {
            // Use end delimiter
            if let Some(ref end_delimiter) = self.rules.end_delimiter {
                let delimiter_bytes = end_delimiter.as_bytes();
                
                if let Some(pos) = self.find_pattern(&self.state.buffer, delimiter_bytes) {
                    // Extract frame data including delimiter
                    let frame_data = self.state.buffer.drain(..pos + delimiter_bytes.len()).collect();
                    
                    let frame = DetectedFrame {
                        data: frame_data,
                        start_offset: self.state.bytes_processed,
                        end_offset: self.state.bytes_processed + pos + delimiter_bytes.len(),
                        complete: true,
                        metadata: FrameMetadata {
                            length: Some(pos + delimiter_bytes.len()),
                            has_start_delimiter: self.rules.start_delimiter.is_some(),
                            has_end_delimiter: true,
                            length_field_value: None,
                        },
                    };
                    
                    self.state.current_state = FrameState::SearchingStart;
                    self.state.bytes_processed += pos + delimiter_bytes.len();
                    
                    return Ok(Some(frame));
                }
            } else {
                return Err(NetworkError::ParseError(
                    "No end delimiter specified for variable-length frame".to_string()
                ));
            }
        } else {
            // Fixed or calculated length
            if self.state.buffer.len() >= expected_length {
                let frame_data = self.state.buffer.drain(..expected_length).collect();
                
                let frame = DetectedFrame {
                    data: frame_data,
                    start_offset: self.state.bytes_processed,
                    end_offset: self.state.bytes_processed + expected_length,
                    complete: true,
                    metadata: FrameMetadata {
                        length: Some(expected_length),
                        has_start_delimiter: self.rules.start_delimiter.is_some(),
                        has_end_delimiter: self.rules.end_delimiter.is_some(),
                        length_field_value: None,
                    },
                };
                
                self.state.current_state = FrameState::SearchingStart;
                self.state.bytes_processed += expected_length;
                
                return Ok(Some(frame));
            }
        }
        
        Ok(None) // Need more data
    }
    
    /// Parse length field value
    fn parse_length_field(&self, data: &[u8], length_field: &LengthField) -> NetworkResult<usize> {
        match length_field.encoding {
            LengthEncoding::Binary => {
                match data.len() {
                    1 => Ok(data[0] as usize),
                    2 => {
                        let value = match length_field.endian {
                            Endianness::Big => u16::from_be_bytes([data[0], data[1]]),
                            Endianness::Little => u16::from_le_bytes([data[0], data[1]]),
                            Endianness::Native => u16::from_ne_bytes([data[0], data[1]]),
                        };
                        Ok(value as usize)
                    }
                    4 => {
                        let value = match length_field.endian {
                            Endianness::Big => u32::from_be_bytes([data[0], data[1], data[2], data[3]]),
                            Endianness::Little => u32::from_le_bytes([data[0], data[1], data[2], data[3]]),
                            Endianness::Native => u32::from_ne_bytes([data[0], data[1], data[2], data[3]]),
                        };
                        Ok(value as usize)
                    }
                    _ => Err(NetworkError::ParseError(format!(
                        "Unsupported binary length field size: {}",
                        data.len()
                    ))),
                }
            }
            LengthEncoding::AsciiDecimal => {
                let length_str = String::from_utf8_lossy(data);
                length_str.trim().parse::<usize>()
                    .map_err(|e| NetworkError::ParseError(format!(
                        "Failed to parse ASCII decimal length: {}",
                        e
                    )))
            }
            LengthEncoding::AsciiHex => {
                let length_str = String::from_utf8_lossy(data);
                usize::from_str_radix(length_str.trim(), 16)
                    .map_err(|e| NetworkError::ParseError(format!(
                        "Failed to parse ASCII hex length: {}",
                        e
                    )))
            }
            LengthEncoding::Bcd => {
                // TODO: Implement BCD parsing
                Err(NetworkError::ParseError("BCD length encoding not yet implemented".to_string()))
            }
        }
    }
    
    /// Find pattern in data
    fn find_pattern(&self, data: &[u8], pattern: &[u8]) -> Option<usize> {
        if pattern.is_empty() {
            return Some(0);
        }
        
        data.windows(pattern.len())
            .position(|window| window == pattern)
    }
    
    /// Reset detector state
    pub fn reset(&mut self) {
        self.state = DetectorState {
            buffer: Vec::new(),
            current_state: FrameState::SearchingStart,
            bytes_processed: 0,
        };
    }
    
    /// Get current buffer size
    pub fn buffer_size(&self) -> usize {
        self.state.buffer.len()
    }
    
    /// Check if detector has buffered data
    pub fn has_buffered_data(&self) -> bool {
        !self.state.buffer.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::schema::*;
    
    #[test]
    fn test_fixed_size_framing() {
        let rules = FramingRule {
            start_delimiter: None,
            end_delimiter: None,
            length_field: None,
            fixed_size: Some(4),
            escape_rules: vec![],
            frame_validation: FrameValidation::default(),
        };
        
        let mut detector = FrameDetector::new(rules);
        let data = b"ABCDEFGH";
        
        let frames = detector.detect_frames(data).unwrap();
        assert_eq!(frames.len(), 2);
        assert_eq!(frames[0].data, b"ABCD");
        assert_eq!(frames[1].data, b"EFGH");
    }
    
    #[test]
    fn test_delimiter_framing() {
        let rules = FramingRule {
            start_delimiter: Some("##".to_string()),
            end_delimiter: Some("\r\n".to_string()),
            length_field: None,
            fixed_size: None,
            escape_rules: vec![],
            frame_validation: FrameValidation::default(),
        };
        
        let mut detector = FrameDetector::new(rules);
        let data = b"##Hello\r\n##World\r\n";
        
        let frames = detector.detect_frames(data).unwrap();
        assert_eq!(frames.len(), 2);
        assert_eq!(frames[0].data, b"##Hello\r\n");
        assert_eq!(frames[1].data, b"##World\r\n");
    }
}
