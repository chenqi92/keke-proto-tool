// History Search Panel Component (Ctrl+R)
// Fuzzy search through command history with preview

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/utils';

interface HistoryItem {
  command: string;
  timestamp: Date;
  cwd?: string;
}

interface HistorySearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: string) => void;
  history: HistoryItem[];
}

export const HistorySearchPanel: React.FC<HistorySearchPanelProps> = ({
  isOpen,
  onClose,
  onSelect,
  history,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filter history based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show recent history when no search query
      setFilteredHistory(history.slice(-20).reverse());
    } else {
      // Fuzzy search
      const query = searchQuery.toLowerCase();
      const matches = history.filter(item =>
        fuzzyMatch(item.command.toLowerCase(), query)
      );
      
      // Sort by relevance (exact matches first, then by recency)
      const sorted = matches.sort((a, b) => {
        const aExact = a.command.toLowerCase().includes(query);
        const bExact = b.command.toLowerCase().includes(query);
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Sort by timestamp (most recent first)
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
      
      setFilteredHistory(sorted.slice(0, 50)); // Limit to 50 results
    }
    setSelectedIndex(0);
  }, [searchQuery, history]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredHistory[selectedIndex]) {
        onSelect(filteredHistory[selectedIndex].command);
        onClose();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        Math.min(prev + 1, filteredHistory.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const handleSelect = (command: string) => {
    onSelect(command);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] z-[60]">
        <div className="bg-background border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Search Command History</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search... (fuzzy search supported)"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold">Shortcuts:</span> ↑↓ navigate • Enter select • Esc close
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No matching commands found</p>
                {searchQuery && (
                  <p className="text-xs mt-1">Try a different search term</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelect(item.command)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-accent transition-colors",
                      index === selectedIndex && "bg-accent"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm break-all">
                          {highlightMatch(item.command, searchQuery)}
                        </div>
                        {item.cwd && (
                          <div className="text-xs text-muted-foreground mt-1">
                            in {item.cwd}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {filteredHistory.length > 0 && (
              <span>
                {filteredHistory.length} {filteredHistory.length === 1 ? 'result' : 'results'}
                {searchQuery && ' found'}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Simple fuzzy matching algorithm
 */
function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  
  let textIndex = 0;
  let queryIndex = 0;
  
  while (textIndex < text.length && queryIndex < query.length) {
    if (text[textIndex] === query[queryIndex]) {
      queryIndex++;
    }
    textIndex++;
  }
  
  return queryIndex === query.length;
}

/**
 * Highlight matching characters in the command
 */
function highlightMatch(command: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return <span>{command}</span>;
  }

  const lowerCommand = command.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Simple substring highlighting
  const index = lowerCommand.indexOf(lowerQuery);
  
  if (index === -1) {
    // Fuzzy match highlighting (more complex)
    return <span>{command}</span>;
  }
  
  return (
    <>
      <span>{command.slice(0, index)}</span>
      <span className="bg-yellow-500/30 text-yellow-600 dark:text-yellow-400">
        {command.slice(index, index + query.length)}
      </span>
      <span>{command.slice(index + query.length)}</span>
    </>
  );
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'just now';
  }
}

