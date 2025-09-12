//! Data flow state machine for frame synchronization
//! 
//! This module manages the state machine for handling data streams,
//! including partial frames, frame boundaries, and error recovery.

use crate::types::{NetworkResult, NetworkError};

/// State machine for data flow processing
#[derive(Debug, Clone)]
pub struct DataFlowStateMachine {
    /// Current state
    current_state: FlowState,
    
    /// State history for debugging
    state_history: Vec<FlowState>,
    
    /// Error recovery configuration
    recovery_config: RecoveryConfig,
}

/// Data flow states
#[derive(Debug, Clone, PartialEq)]
pub enum FlowState {
    /// Initial state - waiting for data
    Idle,
    
    /// Synchronizing with frame boundaries
    Synchronizing,
    
    /// Processing a complete frame
    ProcessingFrame,
    
    /// Handling partial frame (need more data)
    PartialFrame,
    
    /// Error state - attempting recovery
    Error { error_type: ErrorType },
    
    /// Recovery state
    Recovering,
}

/// Types of errors that can occur
#[derive(Debug, Clone, PartialEq)]
pub enum ErrorType {
    /// Frame synchronization lost
    SyncLost,
    
    /// Invalid frame format
    InvalidFormat,
    
    /// Timeout waiting for data
    Timeout,
    
    /// Buffer overflow
    BufferOverflow,
    
    /// Checksum/CRC error
    IntegrityError,
}

/// Error recovery configuration
#[derive(Debug, Clone)]
pub struct RecoveryConfig {
    /// Maximum number of recovery attempts
    pub max_recovery_attempts: usize,
    
    /// Timeout for recovery operations (milliseconds)
    pub recovery_timeout_ms: u64,
    
    /// Whether to attempt automatic resynchronization
    pub auto_resync: bool,
    
    /// Buffer size limit for partial frames
    pub max_buffer_size: usize,
}

impl Default for RecoveryConfig {
    fn default() -> Self {
        Self {
            max_recovery_attempts: 3,
            recovery_timeout_ms: 5000,
            auto_resync: true,
            max_buffer_size: 65536, // 64KB
        }
    }
}

/// State transition result
#[derive(Debug)]
pub enum StateTransition {
    /// State changed successfully
    Changed(FlowState),
    
    /// State remained the same
    NoChange,
    
    /// Transition failed with error
    Failed(String),
}

impl DataFlowStateMachine {
    /// Create a new state machine
    pub fn new() -> Self {
        Self {
            current_state: FlowState::Idle,
            state_history: vec![FlowState::Idle],
            recovery_config: RecoveryConfig::default(),
        }
    }
    
    /// Create state machine with custom recovery config
    pub fn with_recovery_config(config: RecoveryConfig) -> Self {
        Self {
            current_state: FlowState::Idle,
            state_history: vec![FlowState::Idle],
            recovery_config: config,
        }
    }
    
    /// Get current state
    pub fn current_state(&self) -> &FlowState {
        &self.current_state
    }
    
    /// Transition to a new state
    pub fn transition_to(&mut self, new_state: FlowState) -> StateTransition {
        if self.is_valid_transition(&self.current_state, &new_state) {
            self.state_history.push(new_state.clone());
            self.current_state = new_state.clone();
            StateTransition::Changed(new_state)
        } else {
            StateTransition::Failed(format!(
                "Invalid transition from {:?} to {:?}",
                self.current_state, new_state
            ))
        }
    }
    
    /// Handle data input and determine next state
    pub fn handle_data_input(&mut self, data_available: bool, frame_complete: bool) -> NetworkResult<()> {
        let next_state = match &self.current_state {
            FlowState::Idle => {
                if data_available {
                    FlowState::Synchronizing
                } else {
                    FlowState::Idle
                }
            }
            FlowState::Synchronizing => {
                if frame_complete {
                    FlowState::ProcessingFrame
                } else if data_available {
                    FlowState::PartialFrame
                } else {
                    FlowState::Error { error_type: ErrorType::SyncLost }
                }
            }
            FlowState::ProcessingFrame => {
                FlowState::Idle // Ready for next frame
            }
            FlowState::PartialFrame => {
                if frame_complete {
                    FlowState::ProcessingFrame
                } else if data_available {
                    FlowState::PartialFrame // Continue waiting
                } else {
                    FlowState::Error { error_type: ErrorType::Timeout }
                }
            }
            FlowState::Error { error_type } => {
                if self.recovery_config.auto_resync {
                    FlowState::Recovering
                } else {
                    return Err(NetworkError::ParseError(format!(
                        "Unrecoverable error: {:?}",
                        error_type
                    )));
                }
            }
            FlowState::Recovering => {
                if data_available {
                    FlowState::Synchronizing
                } else {
                    FlowState::Recovering
                }
            }
        };
        
        match self.transition_to(next_state) {
            StateTransition::Changed(_) | StateTransition::NoChange => Ok(()),
            StateTransition::Failed(msg) => Err(NetworkError::ParseError(msg)),
        }
    }
    
    /// Handle error condition
    pub fn handle_error(&mut self, error_type: ErrorType) -> NetworkResult<()> {
        let error_state = FlowState::Error { error_type };
        match self.transition_to(error_state) {
            StateTransition::Changed(_) => Ok(()),
            StateTransition::Failed(msg) => Err(NetworkError::ParseError(msg)),
            StateTransition::NoChange => Ok(()), // Already in error state
        }
    }
    
    /// Attempt recovery from error state
    pub fn attempt_recovery(&mut self) -> NetworkResult<bool> {
        match &self.current_state {
            FlowState::Error { .. } => {
                match self.transition_to(FlowState::Recovering) {
                    StateTransition::Changed(_) => Ok(true),
                    _ => Ok(false),
                }
            }
            FlowState::Recovering => {
                // Try to return to synchronizing state
                match self.transition_to(FlowState::Synchronizing) {
                    StateTransition::Changed(_) => Ok(true),
                    _ => Ok(false),
                }
            }
            _ => Ok(false), // Not in error state
        }
    }
    
    /// Reset state machine to initial state
    pub fn reset(&mut self) {
        self.current_state = FlowState::Idle;
        self.state_history.clear();
        self.state_history.push(FlowState::Idle);
    }
    
    /// Check if a state transition is valid
    fn is_valid_transition(&self, from: &FlowState, to: &FlowState) -> bool {
        use FlowState::*;
        
        match (from, to) {
            // From Idle
            (Idle, Synchronizing) => true,
            (Idle, Idle) => true,
            
            // From Synchronizing
            (Synchronizing, ProcessingFrame) => true,
            (Synchronizing, PartialFrame) => true,
            (Synchronizing, Error { .. }) => true,
            
            // From ProcessingFrame
            (ProcessingFrame, Idle) => true,
            (ProcessingFrame, Synchronizing) => true,
            (ProcessingFrame, Error { .. }) => true,
            
            // From PartialFrame
            (PartialFrame, ProcessingFrame) => true,
            (PartialFrame, PartialFrame) => true,
            (PartialFrame, Error { .. }) => true,
            
            // From Error
            (Error { .. }, Recovering) => true,
            (Error { .. }, Idle) => true, // Direct reset
            
            // From Recovering
            (Recovering, Synchronizing) => true,
            (Recovering, Recovering) => true,
            (Recovering, Idle) => true,
            
            // Invalid transitions
            _ => false,
        }
    }
    
    /// Get state history
    pub fn state_history(&self) -> &[FlowState] {
        &self.state_history
    }
    
    /// Check if currently in error state
    pub fn is_in_error_state(&self) -> bool {
        matches!(self.current_state, FlowState::Error { .. })
    }
    
    /// Check if currently recovering
    pub fn is_recovering(&self) -> bool {
        matches!(self.current_state, FlowState::Recovering)
    }
    
    /// Get recovery configuration
    pub fn recovery_config(&self) -> &RecoveryConfig {
        &self.recovery_config
    }
    
    /// Update recovery configuration
    pub fn set_recovery_config(&mut self, config: RecoveryConfig) {
        self.recovery_config = config;
    }
}

impl Default for DataFlowStateMachine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_state_machine_creation() {
        let sm = DataFlowStateMachine::new();
        assert_eq!(sm.current_state(), &FlowState::Idle);
        assert!(!sm.is_in_error_state());
        assert!(!sm.is_recovering());
    }
    
    #[test]
    fn test_valid_transitions() {
        let mut sm = DataFlowStateMachine::new();
        
        // Idle -> Synchronizing
        let result = sm.transition_to(FlowState::Synchronizing);
        assert!(matches!(result, StateTransition::Changed(_)));
        assert_eq!(sm.current_state(), &FlowState::Synchronizing);
        
        // Synchronizing -> ProcessingFrame
        let result = sm.transition_to(FlowState::ProcessingFrame);
        assert!(matches!(result, StateTransition::Changed(_)));
        assert_eq!(sm.current_state(), &FlowState::ProcessingFrame);
        
        // ProcessingFrame -> Idle
        let result = sm.transition_to(FlowState::Idle);
        assert!(matches!(result, StateTransition::Changed(_)));
        assert_eq!(sm.current_state(), &FlowState::Idle);
    }
    
    #[test]
    fn test_invalid_transition() {
        let mut sm = DataFlowStateMachine::new();
        
        // Idle -> ProcessingFrame (invalid)
        let result = sm.transition_to(FlowState::ProcessingFrame);
        assert!(matches!(result, StateTransition::Failed(_)));
        assert_eq!(sm.current_state(), &FlowState::Idle); // Should remain unchanged
    }
    
    #[test]
    fn test_error_handling() {
        let mut sm = DataFlowStateMachine::new();
        
        // Transition to synchronizing first
        sm.transition_to(FlowState::Synchronizing);
        
        // Handle error
        let result = sm.handle_error(ErrorType::SyncLost);
        assert!(result.is_ok());
        assert!(sm.is_in_error_state());
        
        // Attempt recovery
        let recovery_result = sm.attempt_recovery();
        assert!(recovery_result.is_ok());
        assert_eq!(recovery_result.unwrap(), true);
        assert!(sm.is_recovering());
    }
    
    #[test]
    fn test_data_input_handling() {
        let mut sm = DataFlowStateMachine::new();
        
        // Handle data input from idle state
        let result = sm.handle_data_input(true, false);
        assert!(result.is_ok());
        assert_eq!(sm.current_state(), &FlowState::Synchronizing);
        
        // Handle complete frame
        let result = sm.handle_data_input(true, true);
        assert!(result.is_ok());
        assert_eq!(sm.current_state(), &FlowState::ProcessingFrame);
        
        // Return to idle after processing
        let result = sm.handle_data_input(false, false);
        assert!(result.is_ok());
        assert_eq!(sm.current_state(), &FlowState::Idle);
    }
    
    #[test]
    fn test_state_history() {
        let mut sm = DataFlowStateMachine::new();
        
        sm.transition_to(FlowState::Synchronizing);
        sm.transition_to(FlowState::ProcessingFrame);
        sm.transition_to(FlowState::Idle);
        
        let history = sm.state_history();
        assert_eq!(history.len(), 4); // Initial + 3 transitions
        assert_eq!(history[0], FlowState::Idle);
        assert_eq!(history[1], FlowState::Synchronizing);
        assert_eq!(history[2], FlowState::ProcessingFrame);
        assert_eq!(history[3], FlowState::Idle);
    }
    
    #[test]
    fn test_reset() {
        let mut sm = DataFlowStateMachine::new();
        
        // Make some transitions
        sm.transition_to(FlowState::Synchronizing);
        sm.transition_to(FlowState::ProcessingFrame);
        
        // Reset
        sm.reset();
        
        assert_eq!(sm.current_state(), &FlowState::Idle);
        assert_eq!(sm.state_history().len(), 1);
        assert_eq!(sm.state_history()[0], FlowState::Idle);
    }
}
