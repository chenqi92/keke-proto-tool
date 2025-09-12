//! Range validation for field values

use crate::parser::result::FieldValue;
use crate::types::NetworkResult;

/// Range validator
pub struct RangeValidator;

impl RangeValidator {
    /// Validate value range
    pub fn validate_range(_value: &FieldValue, _min: Option<f64>, _max: Option<f64>) -> NetworkResult<bool> {
        // TODO: Implement range validation
        Ok(true)
    }
}
