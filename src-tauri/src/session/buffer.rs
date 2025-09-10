use std::collections::VecDeque;
use std::sync::{Arc, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

/// Message direction for tracking
#[derive(Debug, Clone, PartialEq)]
pub enum MessageDirection {
    Incoming,
    Outgoing,
}

/// A buffered message with metadata
#[derive(Debug, Clone)]
pub struct BufferedMessage {
    pub data: Vec<u8>,
    pub direction: MessageDirection,
    pub timestamp: u64, // Unix timestamp in milliseconds
    pub size: usize,
}

impl BufferedMessage {
    pub fn new(data: Vec<u8>, direction: MessageDirection) -> Self {
        let size = data.len();
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        Self {
            data,
            direction,
            timestamp,
            size,
        }
    }
}

/// Ring buffer for session data with memory management
#[derive(Debug)]
pub struct SessionBuffer {
    messages: Arc<RwLock<VecDeque<BufferedMessage>>>,
    max_messages: usize,
    max_memory_bytes: usize,
    current_memory_usage: Arc<RwLock<usize>>,
    
    // Statistics
    total_bytes_sent: Arc<RwLock<u64>>,
    total_bytes_received: Arc<RwLock<u64>>,
    total_messages_sent: Arc<RwLock<u64>>,
    total_messages_received: Arc<RwLock<u64>>,
}

impl SessionBuffer {
    pub fn new() -> Self {
        Self::with_limits(10000, 100 * 1024 * 1024) // 10k messages, 100MB max
    }

    pub fn with_limits(max_messages: usize, max_memory_bytes: usize) -> Self {
        Self {
            messages: Arc::new(RwLock::new(VecDeque::new())),
            max_messages,
            max_memory_bytes,
            current_memory_usage: Arc::new(RwLock::new(0)),
            total_bytes_sent: Arc::new(RwLock::new(0)),
            total_bytes_received: Arc::new(RwLock::new(0)),
            total_messages_sent: Arc::new(RwLock::new(0)),
            total_messages_received: Arc::new(RwLock::new(0)),
        }
    }

    /// Add an incoming message to the buffer
    pub fn add_incoming(&self, data: Vec<u8>) {
        let message = BufferedMessage::new(data, MessageDirection::Incoming);
        let message_size = message.size as u64;
        self.add_message(message);

        // Update statistics
        *self.total_messages_received.write().unwrap() += 1;
        *self.total_bytes_received.write().unwrap() += message_size;
    }

    /// Add an outgoing message to the buffer
    pub fn add_outgoing(&self, data: Vec<u8>) {
        let message = BufferedMessage::new(data, MessageDirection::Outgoing);
        let message_size = message.size as u64;
        self.add_message(message);

        // Update statistics
        *self.total_messages_sent.write().unwrap() += 1;
        *self.total_bytes_sent.write().unwrap() += message_size;
    }

    /// Add a message to the buffer with memory management
    fn add_message(&self, message: BufferedMessage) {
        let mut messages = self.messages.write().unwrap();
        let mut memory_usage = self.current_memory_usage.write().unwrap();

        // Add the new message
        *memory_usage += message.size;
        messages.push_back(message);

        // Enforce limits
        while messages.len() > self.max_messages || *memory_usage > self.max_memory_bytes {
            if let Some(removed) = messages.pop_front() {
                *memory_usage -= removed.size;
            } else {
                break;
            }
        }
    }

    /// Get recent messages (up to limit)
    pub fn get_recent_messages(&self, limit: usize) -> Vec<BufferedMessage> {
        let messages = self.messages.read().unwrap();
        messages
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect()
    }

    /// Get all messages
    pub fn get_all_messages(&self) -> Vec<BufferedMessage> {
        let messages = self.messages.read().unwrap();
        messages.iter().cloned().collect()
    }

    /// Clear all messages
    pub fn clear(&self) {
        let mut messages = self.messages.write().unwrap();
        let mut memory_usage = self.current_memory_usage.write().unwrap();
        
        messages.clear();
        *memory_usage = 0;
    }

    /// Get buffer statistics
    pub fn bytes_sent(&self) -> u64 {
        *self.total_bytes_sent.read().unwrap()
    }

    pub fn bytes_received(&self) -> u64 {
        *self.total_bytes_received.read().unwrap()
    }

    pub fn messages_sent(&self) -> u64 {
        *self.total_messages_sent.read().unwrap()
    }

    pub fn messages_received(&self) -> u64 {
        *self.total_messages_received.read().unwrap()
    }

    pub fn current_memory_usage(&self) -> usize {
        *self.current_memory_usage.read().unwrap()
    }

    pub fn message_count(&self) -> usize {
        self.messages.read().unwrap().len()
    }
}

impl Default for SessionBuffer {
    fn default() -> Self {
        Self::new()
    }
}
