// Output Pager Component (like 'less')
// For viewing long output with scrolling, searching, and copying

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Copy, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import { cn } from '@/utils';

interface OutputPagerProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
}

export const OutputPager: React.FC<OutputPagerProps> = ({
  isOpen,
  onClose,
  content,
  title = 'Output Viewer',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const lines = content.split('\n');

  // Focus search input when search is opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Calculate matches when search query changes
  useEffect(() => {
    if (searchQuery) {
      const matches = lines.filter(line =>
        line.toLowerCase().includes(searchQuery.toLowerCase())
      ).length;
      setTotalMatches(matches);
      setCurrentMatch(matches > 0 ? 1 : 0);
    } else {
      setTotalMatches(0);
      setCurrentMatch(0);
    }
  }, [searchQuery, content]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Escape - Close pager or search
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
        } else {
          onClose();
        }
      }
      // / - Open search
      else if (e.key === '/' && !showSearch) {
        e.preventDefault();
        setShowSearch(true);
      }
      // n - Next match
      else if (e.key === 'n' && searchQuery && totalMatches > 0) {
        e.preventDefault();
        setCurrentMatch(prev => (prev % totalMatches) + 1);
        scrollToMatch('next');
      }
      // N - Previous match
      else if (e.key === 'N' && searchQuery && totalMatches > 0) {
        e.preventDefault();
        setCurrentMatch(prev => (prev - 2 + totalMatches) % totalMatches + 1);
        scrollToMatch('prev');
      }
      // g - Go to top
      else if (e.key === 'g' && !showSearch) {
        e.preventDefault();
        scrollToTop();
      }
      // G - Go to bottom
      else if (e.key === 'G' && !showSearch) {
        e.preventDefault();
        scrollToBottom();
      }
      // Space - Page down
      else if (e.key === ' ' && !showSearch) {
        e.preventDefault();
        pageDown();
      }
      // b - Page up
      else if (e.key === 'b' && !showSearch) {
        e.preventDefault();
        pageUp();
      }
      // j - Line down
      else if (e.key === 'j' && !showSearch) {
        e.preventDefault();
        lineDown();
      }
      // k - Line up
      else if (e.key === 'k' && !showSearch) {
        e.preventDefault();
        lineUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showSearch, searchQuery, totalMatches, currentMatch]);

  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
      setScrollPosition(0);
    }
  };

  const scrollToBottom = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
      setScrollPosition(100);
    }
  };

  const pageDown = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop += contentRef.current.clientHeight * 0.9;
      updateScrollPosition();
    }
  };

  const pageUp = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop -= contentRef.current.clientHeight * 0.9;
      updateScrollPosition();
    }
  };

  const lineDown = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop += 20;
      updateScrollPosition();
    }
  };

  const lineUp = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop -= 20;
      updateScrollPosition();
    }
  };

  const updateScrollPosition = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const position = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollPosition(Math.min(100, Math.max(0, position)));
    }
  };

  const scrollToMatch = (direction: 'next' | 'prev') => {
    // Simple implementation - scroll to next/prev occurrence
    // In a real implementation, you'd track match positions
    if (contentRef.current) {
      const searchText = searchQuery.toLowerCase();
      const contentText = content.toLowerCase();
      const currentPos = contentRef.current.scrollTop;
      
      // Find next/prev match position
      // This is a simplified version
      if (direction === 'next') {
        pageDown();
      } else {
        pageUp();
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const highlightSearchMatches = (line: string): React.ReactNode => {
    if (!searchQuery) return line;

    const query = searchQuery.toLowerCase();
    const lowerLine = line.toLowerCase();
    const index = lowerLine.indexOf(query);

    if (index === -1) return line;

    return (
      <>
        {line.slice(0, index)}
        <span className="bg-yellow-500/30 text-yellow-600 dark:text-yellow-400">
          {line.slice(index, index + searchQuery.length)}
        </span>
        {line.slice(index + searchQuery.length)}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
        onClick={onClose}
      />

      {/* Pager */}
      <div className="fixed inset-4 md:inset-8 z-[70]">
        <div className="bg-background border border-border rounded-lg shadow-2xl h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-semibold">{title}</h3>
              <span className="text-xs text-muted-foreground">
                {lines.length} lines
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  showSearch ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Search (press /)"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="Copy all"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="px-4 py-2 border-b border-border bg-muted/20">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in output..."
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                {totalMatches > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {currentMatch}/{totalMatches}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div
            ref={contentRef}
            onScroll={updateScrollPosition}
            className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-black/5 dark:bg-black/20"
          >
            {lines.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap break-all">
                {highlightSearchMatches(line)}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>
                <span className="font-semibold">Keys:</span> / search • n/N next/prev • g/G top/bottom • Space/b page • j/k line • Esc close
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span>{Math.round(scrollPosition)}%</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

