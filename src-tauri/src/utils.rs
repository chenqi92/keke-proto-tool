use std::net::{IpAddr, SocketAddr};
use std::str::FromStr;

/// Parse a host:port string into a SocketAddr
pub fn parse_socket_addr(host: &str, port: u16) -> Result<SocketAddr, std::net::AddrParseError> {
    let addr_str = if host.contains(':') {
        // IPv6 address
        format!("[{}]:{}", host, port)
    } else {
        // IPv4 address or hostname
        format!("{}:{}", host, port)
    };
    
    addr_str.parse()
}

/// Validate if a string is a valid IP address
pub fn is_valid_ip(ip: &str) -> bool {
    IpAddr::from_str(ip).is_ok()
}

/// Validate if a port number is valid
pub fn is_valid_port(port: u16) -> bool {
    port > 0
}

/// Convert bytes to hex string
pub fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Convert hex string to bytes
pub fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, hex::FromHexError> {
    let hex_clean = hex.replace(" ", "").replace("-", "");
    hex::decode(hex_clean)
}

/// Format bytes for display (with units)
pub fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;
    
    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }
    
    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.2} {}", size, UNITS[unit_index])
    }
}

/// Generate a unique session ID
pub fn generate_session_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Validate MQTT topic name
pub fn validate_mqtt_topic(topic: &str, for_publish: bool) -> bool {
    if topic.is_empty() || topic.len() > 65535 {
        return false;
    }
    
    // Check for invalid characters
    if topic.contains('\0') {
        return false;
    }
    
    // For publishing, wildcards are not allowed
    if for_publish && (topic.contains('+') || topic.contains('#')) {
        return false;
    }
    
    // Check wildcard rules for subscription
    if !for_publish {
        let parts: Vec<&str> = topic.split('/').collect();
        for (i, part) in parts.iter().enumerate() {
            if part == &"#" {
                // # must be the last character and must be preceded by /
                if i != parts.len() - 1 {
                    return false;
                }
            } else if part.contains('#') {
                // # can only appear as a single character
                return false;
            }
            
            if part.contains('+') && part != &"+" {
                // + can only appear as a single character
                return false;
            }
        }
    }
    
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_socket_addr() {
        assert!(parse_socket_addr("127.0.0.1", 8080).is_ok());
        assert!(parse_socket_addr("::1", 8080).is_ok());
        assert!(parse_socket_addr("localhost", 8080).is_err()); // hostname resolution not supported
    }

    #[test]
    fn test_is_valid_ip() {
        assert!(is_valid_ip("127.0.0.1"));
        assert!(is_valid_ip("::1"));
        assert!(!is_valid_ip("invalid"));
    }

    #[test]
    fn test_bytes_to_hex() {
        assert_eq!(bytes_to_hex(&[0x01, 0x02, 0x03]), "01 02 03");
    }

    #[test]
    fn test_hex_to_bytes() {
        assert_eq!(hex_to_bytes("01 02 03").unwrap(), vec![0x01, 0x02, 0x03]);
        assert_eq!(hex_to_bytes("010203").unwrap(), vec![0x01, 0x02, 0x03]);
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(1024), "1.00 KB");
        assert_eq!(format_bytes(1048576), "1.00 MB");
    }

    #[test]
    fn test_validate_mqtt_topic() {
        assert!(validate_mqtt_topic("test/topic", true));
        assert!(!validate_mqtt_topic("test/+/topic", true)); // wildcards not allowed for publish
        assert!(validate_mqtt_topic("test/+/topic", false)); // wildcards allowed for subscribe
        assert!(validate_mqtt_topic("test/#", false));
        assert!(!validate_mqtt_topic("test/#/more", false)); // # must be last
    }
}
