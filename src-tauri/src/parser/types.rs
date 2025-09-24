//! Basic data type parsing implementations
//! 
//! This module provides parsers for fundamental data types including
//! integers, floating point numbers, strings, and binary data.

use crate::parser::schema::{FieldType, Endianness};
use crate::parser::result::FieldValue;
use crate::types::{NetworkError, NetworkResult};

/// Type parser for basic data types
pub struct TypeParser;

impl TypeParser {
    /// Parse a field value from raw bytes
    pub fn parse_field(
        data: &[u8],
        offset: usize,
        length: usize,
        field_type: &FieldType,
        endianness: &Endianness,
    ) -> NetworkResult<FieldValue> {
        // Check bounds
        if offset + length > data.len() {
            return Err(NetworkError::ParseError(format!(
                "Field extends beyond data bounds: offset={}, length={}, data_len={}",
                offset, length, data.len()
            )));
        }
        
        let field_data = &data[offset..offset + length];
        
        match field_type {
            FieldType::Uint8 => Self::parse_uint8(field_data),
            FieldType::Uint16 => Self::parse_uint16(field_data, endianness),
            FieldType::Uint32 => Self::parse_uint32(field_data, endianness),
            FieldType::Uint64 => Self::parse_uint64(field_data, endianness),
            FieldType::Int8 => Self::parse_int8(field_data),
            FieldType::Int16 => Self::parse_int16(field_data, endianness),
            FieldType::Int32 => Self::parse_int32(field_data, endianness),
            FieldType::Int64 => Self::parse_int64(field_data, endianness),
            FieldType::Float32 => Self::parse_float32(field_data, endianness),
            FieldType::Float64 => Self::parse_float64(field_data, endianness),
            FieldType::String => Self::parse_string(field_data),
            FieldType::CString => Self::parse_cstring(field_data),
            FieldType::PascalString => Self::parse_pascal_string(field_data),
            FieldType::Bytes => Self::parse_bytes(field_data),
            FieldType::Hex => Self::parse_hex(field_data),
            _ => Err(NetworkError::ParseError(format!(
                "Unsupported field type: {:?}",
                field_type
            ))),
        }
    }
    
    /// Parse unsigned 8-bit integer
    fn parse_uint8(data: &[u8]) -> NetworkResult<FieldValue> {
        if data.len() != 1 {
            return Err(NetworkError::ParseError(format!(
                "Invalid data length for uint8: expected 1, got {}",
                data.len()
            )));
        }
        Ok(FieldValue::UInt(data[0] as u64))
    }
    
    /// Parse unsigned 16-bit integer
    fn parse_uint16(data: &[u8], endianness: &Endianness) -> NetworkResult<FieldValue> {
        if data.len() != 2 {
            return Err(NetworkError::ParseError(format!(
                "Invalid data length for uint16: expected 2, got {}",
                data.len()
            )));
        }
        
        let value = match endianness {
            Endianness::Big => u16::from_be_bytes([data[0], data[1]]),
            Endianness::Little => u16::from_le_bytes([data[0], data[1]]),
            Endianness::Native => u16::from_ne_bytes([data[0], data[1]]),
        };
        
        Ok(FieldValue::UInt(value as u64))
    }
    
    /// Parse unsigned 32-bit integer
    fn parse_uint32(data: &[u8], endianness: &Endianness) -> NetworkResult<FieldValue> {
        if data.len() != 4 {
            return Err(NetworkError::ParseError(format!(
                "Invalid data length for uint32: expected 4, got {}",
                data.len()
            )));
        }
        
        let value = match endianness {
            Endianness::Big => u32::from_be_bytes([data[0], data[1], data[2], data[3]]),
            Endianness::Little => u32::from_le_bytes([data[0], data[1], data[2], data[3]]),
            Endianness::Native => u32::from_ne_bytes([data[0], data[1], data[2], data[3]]),
        };
        
        Ok(FieldValue::UInt(value as u64))
    }
    
    /// Parse unsigned 64-bit integer
    fn parse_uint64(data: &[u8], endianness: &Endianness) -> NetworkResult<FieldValue> {
        if data.len() != 8 {
            return Err(NetworkError::ParseError(format!(
                "Invalid data length for uint64: expected 8, got {}",
                data.len()
            )));
        }
        
        let value = match endianness {
            Endianness::Big => u64::from_be_bytes([
                data[0], data[1], data[2], data[3],
                data[4], data[5], data[6], data[7]
            ]),
            Endianness::Little => u64::from_le_bytes([
                data[0], data[1], data[2], data[3],
                data[4], data[5], data[6], data[7]
            ]),
            Endianness::Native => u64::from_ne_bytes([
                data[0], data[1], data[2], data[3],
                data[4], data[5], data[6], data[7]
            ]),
        };
        
        Ok(FieldValue::UInt(value))
    }
    
    /// Parse signed 8-bit integer
    fn parse_int8(data: &[u8]) -> NetworkResult<FieldValue> {
        if data.len() != 1 {
            return Err(NetworkError::ParseError(format!(
                "Invalid data length for int8: expected 1, got {}",
                data.len()
            )));
        }
        Ok(FieldValue::Int(data[0] as i8 as i64))
    }
    
    /// Parse signed 16-bit integer
    fn parse_int16(data: &[u8], endianness: &Endianness) -> NetworkResult<FieldValue> {
        if data.len() != 2 {
            return Err(NetworkError::ParseError(format!(
                "Invalid data length for int16: expected 2, got {}",
                data.len()
            )));
        }
        
        let value = match endianness {
            Endianness::Big => i16::from_be_bytes([data[0], data[1]]),
            Endianness::Little => i16::from_le_bytes([data[0], data[1]]),
            Endianness::Native => i16::from_ne_bytes([data[0], data[1]]),
        };
        
        Ok(FieldValue::Int(value as i64))
    }
    
    /// Parse signed 32-bit integer
    fn parse_int32(data: &[u8], endianness: &Endianness) -> NetworkResult<FieldValue> {
        if data.len() != 4 {
            return Err(NetworkError::ParseError(format!(
                "Invalid data length for int32: expected 4, got {}",
                data.len()
            )));
        }
        
        let value = match endianness {
            Endianness::Big => i32::from_be_bytes([data[0], data[1], data[2], data[3]]),
            Endianness::Little => i32::from_le_bytes([data[0], data[1], data[2], data[3]]),
            Endianness::Native => i32::from_ne_bytes([data[0], data[1], data[2], data[3]]),
        };
        
        Ok(FieldValue::Int(value as i64))
    }
    
    /// Parse signed 64-bit integer
    fn parse_int64(data: &[u8], endianness: &Endianness) -> NetworkResult<FieldValue> {
        if data.len() != 8 {
            return Err(NetworkError::ParseError(format!(
                "Invalid data length for int64: expected 8, got {}",
                data.len()
            )));
        }
        
        let value = match endianness {
            Endianness::Big => i64::from_be_bytes([
                data[0], data[1], data[2], data[3],
                data[4], data[5], data[6], data[7]
            ]),
            Endianness::Little => i64::from_le_bytes([
                data[0], data[1], data[2], data[3],
                data[4], data[5], data[6], data[7]
            ]),
            Endianness::Native => i64::from_ne_bytes([
                data[0], data[1], data[2], data[3],
                data[4], data[5], data[6], data[7]
            ]),
        };
        
        Ok(FieldValue::Int(value))
    }
    
    /// Parse 32-bit floating point number
    fn parse_float32(data: &[u8], endianness: &Endianness) -> NetworkResult<FieldValue> {
        if data.len() != 4 {
            return Err(NetworkError::ParseError(format!(
                "Invalid data length for float32: expected 4, got {}",
                data.len()
            )));
        }
        
        let value = match endianness {
            Endianness::Big => f32::from_be_bytes([data[0], data[1], data[2], data[3]]),
            Endianness::Little => f32::from_le_bytes([data[0], data[1], data[2], data[3]]),
            Endianness::Native => f32::from_ne_bytes([data[0], data[1], data[2], data[3]]),
        };
        
        Ok(FieldValue::Float(value as f64))
    }
    
    /// Parse 64-bit floating point number
    fn parse_float64(data: &[u8], endianness: &Endianness) -> NetworkResult<FieldValue> {
        if data.len() != 8 {
            return Err(NetworkError::ParseError(format!(
                "Invalid data length for float64: expected 8, got {}",
                data.len()
            )));
        }
        
        let value = match endianness {
            Endianness::Big => f64::from_be_bytes([
                data[0], data[1], data[2], data[3],
                data[4], data[5], data[6], data[7]
            ]),
            Endianness::Little => f64::from_le_bytes([
                data[0], data[1], data[2], data[3],
                data[4], data[5], data[6], data[7]
            ]),
            Endianness::Native => f64::from_ne_bytes([
                data[0], data[1], data[2], data[3],
                data[4], data[5], data[6], data[7]
            ]),
        };
        
        Ok(FieldValue::Float(value))
    }
    
    /// Parse UTF-8 string
    fn parse_string(data: &[u8]) -> NetworkResult<FieldValue> {
        match String::from_utf8(data.to_vec()) {
            Ok(s) => Ok(FieldValue::String(s)),
            Err(e) => {
                // Try to parse as lossy UTF-8
                let lossy = String::from_utf8_lossy(data);
                log::warn!("Invalid UTF-8 sequence, using lossy conversion: {}", e);
                Ok(FieldValue::String(lossy.to_string()))
            }
        }
    }
    
    /// Parse null-terminated C string
    fn parse_cstring(data: &[u8]) -> NetworkResult<FieldValue> {
        // Find null terminator
        let null_pos = data.iter().position(|&b| b == 0).unwrap_or(data.len());
        let string_data = &data[..null_pos];
        
        match String::from_utf8(string_data.to_vec()) {
            Ok(s) => Ok(FieldValue::String(s)),
            Err(e) => {
                let lossy = String::from_utf8_lossy(string_data);
                log::warn!("Invalid UTF-8 sequence in C string, using lossy conversion: {}", e);
                Ok(FieldValue::String(lossy.to_string()))
            }
        }
    }
    
    /// Parse Pascal string (length-prefixed)
    fn parse_pascal_string(data: &[u8]) -> NetworkResult<FieldValue> {
        if data.is_empty() {
            return Err(NetworkError::ParseError("Empty data for Pascal string".to_string()));
        }
        
        let length = data[0] as usize;
        if data.len() < length + 1 {
            return Err(NetworkError::ParseError(format!(
                "Pascal string length {} exceeds available data {}",
                length, data.len() - 1
            )));
        }
        
        let string_data = &data[1..1 + length];
        match String::from_utf8(string_data.to_vec()) {
            Ok(s) => Ok(FieldValue::String(s)),
            Err(e) => {
                let lossy = String::from_utf8_lossy(string_data);
                log::warn!("Invalid UTF-8 sequence in Pascal string, using lossy conversion: {}", e);
                Ok(FieldValue::String(lossy.to_string()))
            }
        }
    }
    
    /// Parse raw bytes
    fn parse_bytes(data: &[u8]) -> NetworkResult<FieldValue> {
        Ok(FieldValue::Bytes(data.to_vec()))
    }
    
    /// Parse bytes as hexadecimal string
    fn parse_hex(data: &[u8]) -> NetworkResult<FieldValue> {
        let hex_string = hex::encode(data).to_uppercase();
        Ok(FieldValue::String(hex_string))
    }
    
    /// Get the expected size for a field type
    pub fn get_type_size(field_type: &FieldType) -> Option<usize> {
        match field_type {
            FieldType::Uint8 | FieldType::Int8 => Some(1),
            FieldType::Uint16 | FieldType::Int16 => Some(2),
            FieldType::Uint32 | FieldType::Int32 | FieldType::Float32 => Some(4),
            FieldType::Uint64 | FieldType::Int64 | FieldType::Float64 => Some(8),
            // Variable-length types
            FieldType::String | FieldType::CString | FieldType::PascalString |
            FieldType::Bytes | FieldType::Hex => None,
            // Complex types handled elsewhere
            _ => None,
        }
    }
    
    /// Check if a field type is numeric
    pub fn is_numeric_type(field_type: &FieldType) -> bool {
        matches!(field_type,
            FieldType::Uint8 | FieldType::Uint16 | FieldType::Uint32 | FieldType::Uint64 |
            FieldType::Int8 | FieldType::Int16 | FieldType::Int32 | FieldType::Int64 |
            FieldType::Float32 | FieldType::Float64
        )
    }
    
    /// Check if a field type is a string type
    pub fn is_string_type(field_type: &FieldType) -> bool {
        matches!(field_type,
            FieldType::String | FieldType::CString | FieldType::PascalString
        )
    }
    
    /// Check if a field type is a binary type
    pub fn is_binary_type(field_type: &FieldType) -> bool {
        matches!(field_type, FieldType::Bytes | FieldType::Hex)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_uint8() {
        let data = [42];
        let result = TypeParser::parse_uint8(&data).unwrap();
        assert_eq!(result, FieldValue::UInt(42));
    }
    
    #[test]
    fn test_parse_uint16_big_endian() {
        let data = [0x12, 0x34];
        let result = TypeParser::parse_uint16(&data, &Endianness::Big).unwrap();
        assert_eq!(result, FieldValue::UInt(0x1234));
    }
    
    #[test]
    fn test_parse_uint16_little_endian() {
        let data = [0x34, 0x12];
        let result = TypeParser::parse_uint16(&data, &Endianness::Little).unwrap();
        assert_eq!(result, FieldValue::UInt(0x1234));
    }
    
    #[test]
    fn test_parse_string() {
        let data = b"Hello, World!";
        let result = TypeParser::parse_string(data).unwrap();
        assert_eq!(result, FieldValue::String("Hello, World!".to_string()));
    }
    
    #[test]
    fn test_parse_cstring() {
        let data = b"Hello\0World";
        let result = TypeParser::parse_cstring(data).unwrap();
        assert_eq!(result, FieldValue::String("Hello".to_string()));
    }
    
    #[test]
    fn test_parse_pascal_string() {
        let data = b"\x05Hello";
        let result = TypeParser::parse_pascal_string(data).unwrap();
        assert_eq!(result, FieldValue::String("Hello".to_string()));
    }
    
    #[test]
    fn test_parse_hex() {
        let data = [0xDE, 0xAD, 0xBE, 0xEF];
        let result = TypeParser::parse_hex(&data).unwrap();
        assert_eq!(result, FieldValue::String("DEADBEEF".to_string()));
    }
    
    #[test]
    fn test_get_type_size() {
        assert_eq!(TypeParser::get_type_size(&FieldType::Uint8), Some(1));
        assert_eq!(TypeParser::get_type_size(&FieldType::Uint16), Some(2));
        assert_eq!(TypeParser::get_type_size(&FieldType::Uint32), Some(4));
        assert_eq!(TypeParser::get_type_size(&FieldType::Uint64), Some(8));
        assert_eq!(TypeParser::get_type_size(&FieldType::String), None);
    }
    
    #[test]
    fn test_type_classification() {
        assert!(TypeParser::is_numeric_type(&FieldType::Uint32));
        assert!(TypeParser::is_string_type(&FieldType::String));
        assert!(TypeParser::is_binary_type(&FieldType::Bytes));
        
        assert!(!TypeParser::is_numeric_type(&FieldType::String));
        assert!(!TypeParser::is_string_type(&FieldType::Uint32));
        assert!(!TypeParser::is_binary_type(&FieldType::String));
    }
}
