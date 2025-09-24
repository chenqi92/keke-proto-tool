//! LRU cache system for compiled parsing rules
//! 
//! This module provides caching for compiled rules to improve performance
//! by avoiding recompilation of frequently used rules.

use crate::parser::compiler::CompiledRule;
use lru::LruCache;

use std::num::NonZeroUsize;
use std::sync::{Arc, RwLock};

/// Cache key for compiled rules
#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub struct CacheKey {
    /// Rule file path or identifier
    pub rule_id: String,
    
    /// Rule version/hash for invalidation
    pub version: String,
    
    /// Compilation options that affect the result
    pub options: String,
}

impl CacheKey {
    /// Create a new cache key
    pub fn new(rule_id: String, version: String, options: String) -> Self {
        Self {
            rule_id,
            version,
            options,
        }
    }
    
    /// Create a cache key from rule content hash
    pub fn from_content_hash(rule_id: String, content_hash: String) -> Self {
        Self {
            rule_id,
            version: content_hash,
            options: "default".to_string(),
        }
    }
}

/// Cache statistics
#[derive(Debug, Clone, Default)]
pub struct CacheStats {
    /// Total cache hits
    pub hits: u64,
    
    /// Total cache misses
    pub misses: u64,
    
    /// Number of cache evictions
    pub evictions: u64,
    
    /// Current cache size
    pub current_size: usize,
    
    /// Maximum cache size
    pub max_size: usize,
}

impl CacheStats {
    /// Calculate hit rate
    pub fn hit_rate(&self) -> f64 {
        let total = self.hits + self.misses;
        if total == 0 {
            0.0
        } else {
            self.hits as f64 / total as f64
        }
    }
    
    /// Calculate miss rate
    pub fn miss_rate(&self) -> f64 {
        1.0 - self.hit_rate()
    }
}

/// Thread-safe LRU cache for compiled rules
pub struct RuleCache {
    /// Internal LRU cache
    cache: Arc<RwLock<LruCache<CacheKey, Arc<CompiledRule>>>>,
    
    /// Cache statistics
    stats: Arc<RwLock<CacheStats>>,
    
    /// Maximum cache size
    max_size: usize,
}

impl RuleCache {
    /// Create a new rule cache with specified capacity
    pub fn new(capacity: usize) -> Self {
        let cache = LruCache::new(NonZeroUsize::new(capacity).unwrap());
        
        Self {
            cache: Arc::new(RwLock::new(cache)),
            stats: Arc::new(RwLock::new(CacheStats {
                max_size: capacity,
                ..Default::default()
            })),
            max_size: capacity,
        }
    }
    
    /// Get a compiled rule from cache
    pub fn get(&self, key: &CacheKey) -> Option<Arc<CompiledRule>> {
        let mut cache = self.cache.write().unwrap();
        let mut stats = self.stats.write().unwrap();
        
        match cache.get(key) {
            Some(rule) => {
                stats.hits += 1;
                Some(rule.clone())
            }
            None => {
                stats.misses += 1;
                None
            }
        }
    }
    
    /// Put a compiled rule into cache
    pub fn put(&self, key: CacheKey, rule: CompiledRule) {
        let mut cache = self.cache.write().unwrap();
        let mut stats = self.stats.write().unwrap();
        
        // Check if this will cause an eviction
        if cache.len() >= self.max_size && !cache.contains(&key) {
            stats.evictions += 1;
        }
        
        cache.put(key, Arc::new(rule));
        stats.current_size = cache.len();
    }
    
    /// Remove a specific rule from cache
    pub fn remove(&self, key: &CacheKey) -> Option<Arc<CompiledRule>> {
        let mut cache = self.cache.write().unwrap();
        let mut stats = self.stats.write().unwrap();
        
        let result = cache.pop(key);
        stats.current_size = cache.len();
        result
    }
    
    /// Clear all cached rules
    pub fn clear(&self) {
        let mut cache = self.cache.write().unwrap();
        let mut stats = self.stats.write().unwrap();
        
        cache.clear();
        stats.current_size = 0;
        stats.evictions += cache.len() as u64;
    }
    
    /// Get cache statistics
    pub fn stats(&self) -> CacheStats {
        let stats = self.stats.read().unwrap();
        stats.clone()
    }
    
    /// Check if cache contains a key
    pub fn contains(&self, key: &CacheKey) -> bool {
        let cache = self.cache.read().unwrap();
        cache.contains(key)
    }
    
    /// Get current cache size
    pub fn len(&self) -> usize {
        let cache = self.cache.read().unwrap();
        cache.len()
    }
    
    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        let cache = self.cache.read().unwrap();
        cache.is_empty()
    }
    
    /// Get cache capacity
    pub fn capacity(&self) -> usize {
        self.max_size
    }
    
    /// Resize the cache
    pub fn resize(&mut self, new_capacity: usize) {
        let mut cache = self.cache.write().unwrap();
        let mut stats = self.stats.write().unwrap();
        
        cache.resize(NonZeroUsize::new(new_capacity).unwrap());
        self.max_size = new_capacity;
        stats.max_size = new_capacity;
        stats.current_size = cache.len();
    }
    
    /// Get all cache keys
    pub fn keys(&self) -> Vec<CacheKey> {
        let cache = self.cache.read().unwrap();
        cache.iter().map(|(k, _)| k.clone()).collect()
    }
    
    /// Invalidate cache entries matching a pattern
    pub fn invalidate_pattern(&self, rule_id_pattern: &str) {
        let mut cache = self.cache.write().unwrap();
        let mut stats = self.stats.write().unwrap();
        
        let keys_to_remove: Vec<CacheKey> = cache
            .iter()
            .filter(|(key, _)| key.rule_id.contains(rule_id_pattern))
            .map(|(key, _)| key.clone())
            .collect();
        
        for key in keys_to_remove {
            cache.pop(&key);
        }
        
        stats.current_size = cache.len();
    }
}

impl Default for RuleCache {
    fn default() -> Self {
        Self::new(100) // Default capacity of 100 rules
    }
}

use std::sync::OnceLock;

/// Global rule cache instance
static GLOBAL_CACHE: OnceLock<RuleCache> = OnceLock::new();

/// Get the global rule cache
pub fn get_global_cache() -> &'static RuleCache {
    GLOBAL_CACHE.get_or_init(|| {
        RuleCache::new(1000) // Global cache with 1000 entries
    })
}

/// Initialize the global cache with custom capacity
/// Note: This function is deprecated since OnceLock doesn't support custom initialization after first access
pub fn initialize_global_cache(_capacity: usize) {
    // With OnceLock, the cache is initialized on first access with a fixed capacity
    // This function is kept for API compatibility but doesn't do anything
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use super::*;
    use crate::parser::schema::*;
    use crate::parser::compiler::*;
    
    fn create_test_rule() -> CompiledRule {
        let rule = ProtocolRule {
            meta: ProtocolMeta {
                name: "Test".to_string(),
                version: "1.0".to_string(),
                author: "Test".to_string(),
                description: "Test rule".to_string(),
                supported_formats: vec![],
                category: "test".to_string(),
                tags: vec![],
            },
            framing: FramingRule {
                start_delimiter: Some("##".to_string()),
                end_delimiter: Some("\r\n".to_string()),
                length_field: None,
                fixed_size: None,
                escape_rules: vec![],
                frame_validation: FrameValidation::default(),
            },
            fields: vec![],
            validation: ValidationRules::default(),
            conditions: vec![],
            functions: HashMap::new(),
        };
        
        CompiledRule {
            rule,
            execution_plan: ExecutionPlan {
                steps: vec![],
                dependencies: HashMap::new(),
                optimizations: OptimizationFlags::default(),
            },
            metadata: CompilerMetadata {
                compiled_at: chrono::Utc::now(),
                compiler_version: "1.0.0".to_string(),
                optimization_level: OptimizationLevel::Basic,
                warnings: vec![],
            },
        }
    }
    
    #[test]
    fn test_cache_creation() {
        let cache = RuleCache::new(10);
        assert_eq!(cache.capacity(), 10);
        assert_eq!(cache.len(), 0);
        assert!(cache.is_empty());
    }
    
    #[test]
    fn test_cache_put_get() {
        let cache = RuleCache::new(10);
        let key = CacheKey::new("test".to_string(), "1.0".to_string(), "default".to_string());
        let rule = create_test_rule();
        
        // Put rule in cache
        cache.put(key.clone(), rule);
        assert_eq!(cache.len(), 1);
        assert!(!cache.is_empty());
        
        // Get rule from cache
        let cached_rule = cache.get(&key);
        assert!(cached_rule.is_some());
        
        // Check stats
        let stats = cache.stats();
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 0);
        assert_eq!(stats.hit_rate(), 1.0);
    }
    
    #[test]
    fn test_cache_miss() {
        let cache = RuleCache::new(10);
        let key = CacheKey::new("nonexistent".to_string(), "1.0".to_string(), "default".to_string());
        
        let result = cache.get(&key);
        assert!(result.is_none());
        
        let stats = cache.stats();
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.hit_rate(), 0.0);
    }
    
    #[test]
    fn test_cache_eviction() {
        let cache = RuleCache::new(2); // Small cache for testing eviction
        
        // Fill cache beyond capacity
        for i in 0..3 {
            let key = CacheKey::new(format!("test{}", i), "1.0".to_string(), "default".to_string());
            let rule = create_test_rule();
            cache.put(key, rule);
        }
        
        assert_eq!(cache.len(), 2); // Should not exceed capacity
        
        let stats = cache.stats();
        assert_eq!(stats.evictions, 1); // One eviction should have occurred
    }
    
    #[test]
    fn test_cache_clear() {
        let cache = RuleCache::new(10);
        
        // Add some rules
        for i in 0..5 {
            let key = CacheKey::new(format!("test{}", i), "1.0".to_string(), "default".to_string());
            let rule = create_test_rule();
            cache.put(key, rule);
        }
        
        assert_eq!(cache.len(), 5);
        
        cache.clear();
        assert_eq!(cache.len(), 0);
        assert!(cache.is_empty());
    }
}
