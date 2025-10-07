// AutoComplete Component for Terminal
// Provides command autocomplete suggestions

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/utils';
import { Terminal as TerminalIcon, Clock, Command } from 'lucide-react';

export interface AutoCompleteItem {
  value: string;
  type: 'history' | 'system';
  timestamp?: number;
}

interface AutoCompleteProps {
  suggestions: AutoCompleteItem[];
  selectedIndex: number;
  onSelect: (value: string) => void;
  position: { x: number; y: number };
  visible: boolean;
}

export const AutoComplete: React.FC<AutoCompleteProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  position,
  visible,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && containerRef.current && selectedIndex >= 0) {
      const selectedElement = containerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, visible]);

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed bg-background border border-border rounded-lg shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        minWidth: '200px',
        maxWidth: '400px',
      }}
    >
      {suggestions.map((item, index) => (
        <div
          key={`${item.type}-${item.value}-${index}`}
          className={cn(
            'px-3 py-2 cursor-pointer flex items-center space-x-2 transition-colors',
            index === selectedIndex
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
          onClick={() => onSelect(item.value)}
        >
          {item.type === 'history' ? (
            <Clock className="w-4 h-4 flex-shrink-0" />
          ) : (
            <Command className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1 truncate font-mono text-sm">{item.value}</span>
          {item.type === 'history' && (
            <span className="text-xs opacity-70">历史</span>
          )}
        </div>
      ))}
    </div>
  );
};

