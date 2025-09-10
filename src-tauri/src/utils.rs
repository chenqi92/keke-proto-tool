use std::net::{IpAddr, SocketAddr, ToSocketAddrs};
use std::str::FromStr;

/// Parse a host:port string into a SocketAddr with hostname resolution support
pub fn parse_socket_addr(host: &str, port: u16) -> Result<SocketAddr, Box<dyn std::error::Error + Send + Sync>> {
    // First try to parse as IP address directly
    if let Ok(ip) = IpAddr::from_str(host) {
        return Ok(SocketAddr::new(ip, port));
    }

    // Handle IPv6 addresses with brackets
    if host.starts_with('[') && host.ends_with(']') {
        let ipv6_str = &host[1..host.len()-1];
        if let Ok(ip) = IpAddr::from_str(ipv6_str) {
            return Ok(SocketAddr::new(ip, port));
        }
    }

    // Try hostname resolution
    let addr_str = format!("{}:{}", host, port);
    match addr_str.to_socket_addrs() {
        Ok(mut addrs) => {
            if let Some(addr) = addrs.next() {
                Ok(addr)
            } else {
                Err(format!("No addresses found for hostname: {}", host).into())
            }
        }
        Err(e) => {
            // If hostname resolution fails, try as literal IP one more time
            if let Ok(ip) = IpAddr::from_str(host) {
                Ok(SocketAddr::new(ip, port))
            } else {
                Err(format!("Failed to resolve hostname '{}': {}", host, e).into())
            }
        }
    }
}

/// Validate if a string is a valid IP address
pub fn is_valid_ip(ip: &str) -> bool {
    IpAddr::from_str(ip).is_ok()
}

/// Validate if a port number is valid and check for potential permission issues
pub fn validate_port(port: u16) -> Result<(), String> {
    if port == 0 {
        return Err("Port cannot be 0".to_string());
    }

    // Warn about privileged ports on Windows/Unix
    if port < 1024 {
        return Err(format!(
            "Port {} requires administrator privileges. Consider using a port >= 1024 (e.g., 8080, 9090)",
            port
        ));
    }

    Ok(())
}

/// Check if a port is likely to be in use (common ports)
pub fn is_common_port(port: u16) -> Option<&'static str> {
    match port {
        80 => Some("HTTP"),
        443 => Some("HTTPS"),
        21 => Some("FTP"),
        22 => Some("SSH"),
        23 => Some("Telnet"),
        25 => Some("SMTP"),
        53 => Some("DNS"),
        110 => Some("POP3"),
        143 => Some("IMAP"),
        993 => Some("IMAPS"),
        995 => Some("POP3S"),
        3389 => Some("RDP"),
        5432 => Some("PostgreSQL"),
        3306 => Some("MySQL"),
        1433 => Some("SQL Server"),
        6379 => Some("Redis"),
        27017 => Some("MongoDB"),
        _ => None,
    }
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
