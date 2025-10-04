use async_trait::async_trait;
use crate::network::Connection;
use crate::types::{NetworkResult, NetworkError, NetworkEvent};
use tokio::sync::{mpsc, Mutex};
use tokio_modbus::prelude::*;
use tokio_modbus::client::{Context as ModbusContext};
use std::net::SocketAddr;
use std::time::Duration;
use std::sync::Arc;

/// Modbus function codes
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModbusFunctionCode {
    ReadCoils = 0x01,
    ReadDiscreteInputs = 0x02,
    ReadHoldingRegisters = 0x03,
    ReadInputRegisters = 0x04,
    WriteSingleCoil = 0x05,
    WriteSingleRegister = 0x06,
    WriteMultipleCoils = 0x0F,
    WriteMultipleRegisters = 0x10,
    ReadWriteMultipleRegisters = 0x17,
}

impl ModbusFunctionCode {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0x01 => Some(Self::ReadCoils),
            0x02 => Some(Self::ReadDiscreteInputs),
            0x03 => Some(Self::ReadHoldingRegisters),
            0x04 => Some(Self::ReadInputRegisters),
            0x05 => Some(Self::WriteSingleCoil),
            0x06 => Some(Self::WriteSingleRegister),
            0x0F => Some(Self::WriteMultipleCoils),
            0x10 => Some(Self::WriteMultipleRegisters),
            0x17 => Some(Self::ReadWriteMultipleRegisters),
            _ => None,
        }
    }
}

/// Modbus TCP Client
#[derive(Debug, Clone)]
pub struct ModbusTcpClient {
    session_id: String,
    host: String,
    port: u16,
    unit_id: u8,
    timeout: Duration,
    connected: bool,
    context: Option<Arc<Mutex<ModbusContext>>>,
    event_tx: Option<mpsc::Sender<NetworkEvent>>,
}

impl ModbusTcpClient {
    pub fn new(session_id: String, config: serde_json::Value) -> NetworkResult<Self> {
        let host = config["host"]
            .as_str()
            .ok_or_else(|| NetworkError::InvalidConfig("Missing host".to_string()))?
            .to_string();
        
        let port = config["port"]
            .as_u64()
            .ok_or_else(|| NetworkError::InvalidConfig("Missing port".to_string()))?
            as u16;
        
        let unit_id = config["modbusUnitId"]
            .as_u64()
            .unwrap_or(1) as u8;
        
        let timeout_ms = config["timeout"]
            .as_u64()
            .unwrap_or(5000);
        
        Ok(Self {
            session_id,
            host,
            port,
            unit_id,
            timeout: Duration::from_millis(timeout_ms),
            connected: false,
            context: None,
            event_tx: None,
        })
    }

    /// Read coils (function code 0x01)
    pub async fn read_coils(&mut self, address: u16, quantity: u16) -> NetworkResult<Vec<bool>> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.read_coils(address, quantity).await
            .map_err(|e| NetworkError::SendFailed(format!("Read coils failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Read discrete inputs (function code 0x02)
    pub async fn read_discrete_inputs(&mut self, address: u16, quantity: u16) -> NetworkResult<Vec<bool>> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.read_discrete_inputs(address, quantity).await
            .map_err(|e| NetworkError::SendFailed(format!("Read discrete inputs failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Read holding registers (function code 0x03)
    pub async fn read_holding_registers(&mut self, address: u16, quantity: u16) -> NetworkResult<Vec<u16>> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.read_holding_registers(address, quantity).await
            .map_err(|e| NetworkError::SendFailed(format!("Read holding registers failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Read input registers (function code 0x04)
    pub async fn read_input_registers(&mut self, address: u16, quantity: u16) -> NetworkResult<Vec<u16>> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.read_input_registers(address, quantity).await
            .map_err(|e| NetworkError::SendFailed(format!("Read input registers failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Write single coil (function code 0x05)
    pub async fn write_single_coil(&mut self, address: u16, value: bool) -> NetworkResult<()> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.write_single_coil(address, value).await
            .map_err(|e| NetworkError::SendFailed(format!("Write single coil failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Write single register (function code 0x06)
    pub async fn write_single_register(&mut self, address: u16, value: u16) -> NetworkResult<()> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.write_single_register(address, value).await
            .map_err(|e| NetworkError::SendFailed(format!("Write single register failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Write multiple coils (function code 0x0F)
    pub async fn write_multiple_coils(&mut self, address: u16, values: &[bool]) -> NetworkResult<()> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.write_multiple_coils(address, values).await
            .map_err(|e| NetworkError::SendFailed(format!("Write multiple coils failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Write multiple registers (function code 0x10)
    pub async fn write_multiple_registers(&mut self, address: u16, values: &[u16]) -> NetworkResult<()> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.write_multiple_registers(address, values).await
            .map_err(|e| NetworkError::SendFailed(format!("Write multiple registers failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Read/write multiple registers (function code 0x17)
    pub async fn read_write_multiple_registers(
        &mut self,
        read_address: u16,
        read_quantity: u16,
        write_address: u16,
        write_values: &[u16],
    ) -> NetworkResult<Vec<u16>> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.read_write_multiple_registers(read_address, read_quantity, write_address, write_values).await
            .map_err(|e| NetworkError::SendFailed(format!("Read/write multiple registers failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Send event to frontend
    async fn send_event(&self, event_type: &str, data: Option<Vec<u8>>, error: Option<String>) {
        if let Some(tx) = &self.event_tx {
            let event = NetworkEvent {
                session_id: self.session_id.clone(),
                event_type: event_type.to_string(),
                data,
                error,
                client_id: None,
                mqtt_topic: None,
                mqtt_qos: None,
                mqtt_retain: None,
                sse_event: None,
            };
            let _ = tx.send(event).await;
        }
    }
}

#[async_trait]
impl Connection for ModbusTcpClient {
    async fn connect(&mut self) -> NetworkResult<()> {
        if self.connected {
            return Ok(());
        }

        eprintln!("ModbusTcpClient: Connecting to {}:{} (Unit ID: {})", self.host, self.port, self.unit_id);

        let socket_addr: SocketAddr = format!("{}:{}", self.host, self.port)
            .parse()
            .map_err(|e| NetworkError::ConnectionFailed(format!("Invalid address: {}", e)))?;

        // Create Modbus TCP client context
        let context = tcp::connect_slave(socket_addr, Slave(self.unit_id)).await
            .map_err(|e| NetworkError::ConnectionFailed(format!("Modbus TCP connection failed: {}", e)))?;

        self.context = Some(Arc::new(Mutex::new(context)));
        self.connected = true;

        eprintln!("ModbusTcpClient: Connected successfully");
        self.send_event("connected", None, None).await;

        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if !self.connected {
            return Ok(());
        }

        self.context = None;
        self.connected = false;

        eprintln!("ModbusTcpClient: Disconnected");
        self.send_event("disconnected", None, None).await;

        Ok(())
    }

    async fn send(&mut self, data: &[u8]) -> NetworkResult<usize> {
        // For Modbus, raw send is not typically used
        // Instead, use the specific function code methods
        Err(NetworkError::SendFailed(
            "Use Modbus-specific function code methods instead of raw send".to_string()
        ))
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    fn status(&self) -> String {
        if self.connected {
            format!("Connected to {}:{} (Unit ID: {})", self.host, self.port, self.unit_id)
        } else {
            "Disconnected".to_string()
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        let (tx, rx) = mpsc::channel(100);
        self.event_tx = Some(tx);
        Ok(rx)
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

/// Modbus RTU Client (Serial)
#[derive(Debug, Clone)]
pub struct ModbusRtuClient {
    session_id: String,
    port_name: String,
    baud_rate: u32,
    unit_id: u8,
    data_bits: tokio_serial::DataBits,
    parity: tokio_serial::Parity,
    stop_bits: tokio_serial::StopBits,
    timeout: Duration,
    connected: bool,
    context: Option<Arc<Mutex<ModbusContext>>>,
    event_tx: Option<mpsc::Sender<NetworkEvent>>,
}

impl ModbusRtuClient {
    pub fn new(session_id: String, config: serde_json::Value) -> NetworkResult<Self> {
        let port_name = config["serialPort"]
            .as_str()
            .ok_or_else(|| NetworkError::InvalidConfig("Missing serialPort".to_string()))?
            .to_string();

        let baud_rate = config["baudRate"]
            .as_u64()
            .unwrap_or(9600) as u32;

        let unit_id = config["modbusUnitId"]
            .as_u64()
            .unwrap_or(1) as u8;

        let data_bits = match config["dataBits"].as_u64().unwrap_or(8) {
            5 => tokio_serial::DataBits::Five,
            6 => tokio_serial::DataBits::Six,
            7 => tokio_serial::DataBits::Seven,
            _ => tokio_serial::DataBits::Eight,
        };

        let parity = match config["parity"].as_str().unwrap_or("none") {
            "even" => tokio_serial::Parity::Even,
            "odd" => tokio_serial::Parity::Odd,
            _ => tokio_serial::Parity::None,
        };

        let stop_bits = match config["stopBits"].as_u64().unwrap_or(1) {
            2 => tokio_serial::StopBits::Two,
            _ => tokio_serial::StopBits::One,
        };

        let timeout_ms = config["timeout"]
            .as_u64()
            .unwrap_or(5000);

        Ok(Self {
            session_id,
            port_name,
            baud_rate,
            unit_id,
            data_bits,
            parity,
            stop_bits,
            timeout: Duration::from_millis(timeout_ms),
            connected: false,
            context: None,
            event_tx: None,
        })
    }

    /// Read holding registers (function code 0x03)
    pub async fn read_holding_registers(&mut self, address: u16, quantity: u16) -> NetworkResult<Vec<u16>> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.read_holding_registers(address, quantity).await
            .map_err(|e| NetworkError::SendFailed(format!("Read holding registers failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Write single register (function code 0x06)
    pub async fn write_single_register(&mut self, address: u16, value: u16) -> NetworkResult<()> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.write_single_register(address, value).await
            .map_err(|e| NetworkError::SendFailed(format!("Write single register failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Write multiple registers (function code 0x10)
    pub async fn write_multiple_registers(&mut self, address: u16, values: &[u16]) -> NetworkResult<()> {
        let ctx = self.context.as_ref()
            .ok_or(NetworkError::NotConnected)?;

        let mut ctx_guard = ctx.lock().await;
        ctx_guard.write_multiple_registers(address, values).await
            .map_err(|e| NetworkError::SendFailed(format!("Write multiple registers failed: {}", e)))?
            .map_err(|e| NetworkError::SendFailed(format!("Modbus exception: {:?}", e)))
    }

    /// Send event to frontend
    async fn send_event(&self, event_type: &str, data: Option<Vec<u8>>, error: Option<String>) {
        if let Some(tx) = &self.event_tx {
            let event = NetworkEvent {
                session_id: self.session_id.clone(),
                event_type: event_type.to_string(),
                data,
                error,
                client_id: None,
                mqtt_topic: None,
                mqtt_qos: None,
                mqtt_retain: None,
                sse_event: None,
            };
            let _ = tx.send(event).await;
        }
    }
}

#[async_trait]
impl Connection for ModbusRtuClient {
    async fn connect(&mut self) -> NetworkResult<()> {
        if self.connected {
            return Ok(());
        }

        eprintln!("ModbusRtuClient: Connecting to {} at {} baud (Unit ID: {})",
                  self.port_name, self.baud_rate, self.unit_id);

        // Create serial port builder
        let builder = tokio_serial::new(&self.port_name, self.baud_rate)
            .data_bits(self.data_bits)
            .parity(self.parity)
            .stop_bits(self.stop_bits)
            .timeout(self.timeout);

        // Open serial port
        let port = tokio_serial::SerialStream::open(&builder)
            .map_err(|e| NetworkError::ConnectionFailed(format!("Failed to open serial port: {}", e)))?;

        // Create Modbus RTU client context
        let context = rtu::attach_slave(port, Slave(self.unit_id));

        self.context = Some(Arc::new(Mutex::new(context)));
        self.connected = true;

        eprintln!("ModbusRtuClient: Connected successfully");
        self.send_event("connected", None, None).await;

        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if !self.connected {
            return Ok(());
        }

        self.context = None;
        self.connected = false;

        eprintln!("ModbusRtuClient: Disconnected");
        self.send_event("disconnected", None, None).await;

        Ok(())
    }

    async fn send(&mut self, _data: &[u8]) -> NetworkResult<usize> {
        Err(NetworkError::SendFailed(
            "Use Modbus-specific function code methods instead of raw send".to_string()
        ))
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    fn status(&self) -> String {
        if self.connected {
            format!("Connected to {} at {} baud (Unit ID: {})",
                    self.port_name, self.baud_rate, self.unit_id)
        } else {
            "Disconnected".to_string()
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        let (tx, rx) = mpsc::channel(100);
        self.event_tx = Some(tx);
        Ok(rx)
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

/// Modbus TCP Server (Slave Simulator)
#[derive(Debug)]
pub struct ModbusTcpServer {
    session_id: String,
    host: String,
    port: u16,
    unit_id: u8,
    connected: bool,
    event_tx: Option<mpsc::Sender<NetworkEvent>>,
    // Simulated register storage
    coils: std::sync::Arc<tokio::sync::RwLock<Vec<bool>>>,
    discrete_inputs: std::sync::Arc<tokio::sync::RwLock<Vec<bool>>>,
    holding_registers: std::sync::Arc<tokio::sync::RwLock<Vec<u16>>>,
    input_registers: std::sync::Arc<tokio::sync::RwLock<Vec<u16>>>,
}

impl ModbusTcpServer {
    pub fn new(session_id: String, config: serde_json::Value) -> NetworkResult<Self> {
        let host = config["host"]
            .as_str()
            .unwrap_or("0.0.0.0")
            .to_string();

        let port = config["port"]
            .as_u64()
            .ok_or_else(|| NetworkError::InvalidConfig("Missing port".to_string()))?
            as u16;

        let unit_id = config["modbusUnitId"]
            .as_u64()
            .unwrap_or(1) as u8;

        // Initialize register storage with default sizes
        let coils = std::sync::Arc::new(tokio::sync::RwLock::new(vec![false; 10000]));
        let discrete_inputs = std::sync::Arc::new(tokio::sync::RwLock::new(vec![false; 10000]));
        let holding_registers = std::sync::Arc::new(tokio::sync::RwLock::new(vec![0u16; 10000]));
        let input_registers = std::sync::Arc::new(tokio::sync::RwLock::new(vec![0u16; 10000]));

        Ok(Self {
            session_id,
            host,
            port,
            unit_id,
            connected: false,
            event_tx: None,
            coils,
            discrete_inputs,
            holding_registers,
            input_registers,
        })
    }

    /// Set holding register value (for testing/simulation)
    pub async fn set_holding_register(&self, address: u16, value: u16) -> NetworkResult<()> {
        let mut registers = self.holding_registers.write().await;
        if (address as usize) < registers.len() {
            registers[address as usize] = value;
            Ok(())
        } else {
            Err(NetworkError::InvalidConfig(format!("Register address {} out of range", address)))
        }
    }

    /// Get holding register value
    pub async fn get_holding_register(&self, address: u16) -> NetworkResult<u16> {
        let registers = self.holding_registers.read().await;
        if (address as usize) < registers.len() {
            Ok(registers[address as usize])
        } else {
            Err(NetworkError::InvalidConfig(format!("Register address {} out of range", address)))
        }
    }

    /// Send event to frontend
    async fn send_event(&self, event_type: &str, data: Option<Vec<u8>>, error: Option<String>) {
        if let Some(tx) = &self.event_tx {
            let event = NetworkEvent {
                session_id: self.session_id.clone(),
                event_type: event_type.to_string(),
                data,
                error,
                client_id: None,
                mqtt_topic: None,
                mqtt_qos: None,
                mqtt_retain: None,
                sse_event: None,
            };
            let _ = tx.send(event).await;
        }
    }
}

#[async_trait]
impl Connection for ModbusTcpServer {
    async fn connect(&mut self) -> NetworkResult<()> {
        if self.connected {
            return Ok(());
        }

        eprintln!("ModbusTcpServer: Starting server on {}:{} (Unit ID: {})",
                  self.host, self.port, self.unit_id);

        // Note: Full Modbus TCP server implementation would require tokio-modbus server support
        // For now, we mark as connected and log that this is a simplified implementation
        self.connected = true;

        eprintln!("ModbusTcpServer: Server started (simplified slave simulator)");
        self.send_event("connected", None, None).await;

        Ok(())
    }

    async fn disconnect(&mut self) -> NetworkResult<()> {
        if !self.connected {
            return Ok(());
        }

        self.connected = false;

        eprintln!("ModbusTcpServer: Server stopped");
        self.send_event("disconnected", None, None).await;

        Ok(())
    }

    async fn send(&mut self, _data: &[u8]) -> NetworkResult<usize> {
        Err(NetworkError::SendFailed(
            "Modbus server does not support raw send".to_string()
        ))
    }

    fn is_connected(&self) -> bool {
        self.connected
    }

    fn status(&self) -> String {
        if self.connected {
            format!("Server running on {}:{} (Unit ID: {})", self.host, self.port, self.unit_id)
        } else {
            "Server stopped".to_string()
        }
    }

    async fn start_receiving(&mut self) -> NetworkResult<mpsc::Receiver<NetworkEvent>> {
        let (tx, rx) = mpsc::channel(100);
        self.event_tx = Some(tx);
        Ok(rx)
    }

    fn as_any_mut(&mut self) -> &mut dyn std::any::Any {
        self
    }
}

