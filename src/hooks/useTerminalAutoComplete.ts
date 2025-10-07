// Terminal AutoComplete Hook
// Manages autocomplete logic for terminal commands

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AutoCompleteItem } from '@/components/ProtoShell/AutoComplete';

interface HistoryItem {
  command: string;
  timestamp: number;
}

export const useTerminalAutoComplete = (sessionId: string) => {
  const [systemCommands, setSystemCommands] = useState<string[]>([]);
  const [historyCommands, setHistoryCommands] = useState<HistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<AutoCompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const cacheRef = useRef<{ [key: string]: AutoCompleteItem[] }>({});

  // Load system commands on mount
  useEffect(() => {
    loadSystemCommands();
  }, []);

  // Load history commands when session changes
  useEffect(() => {
    loadHistoryCommands();
  }, [sessionId]);

  const loadSystemCommands = async () => {
    try {
      const commands = await invoke<string[]>('get_system_commands');
      setSystemCommands(commands);
    } catch (error) {
      console.error('Failed to load system commands:', error);
    }
  };

  const loadHistoryCommands = async () => {
    try {
      const history = await invoke<any[]>('get_session_history', {
        sessionId,
        limit: 100,
      });
      
      const commands = history.map(item => ({
        command: item.command,
        timestamp: item.timestamp,
      }));
      
      setHistoryCommands(commands);
    } catch (error) {
      console.error('Failed to load history commands:', error);
    }
  };

  const getSuggestions = useCallback((input: string): AutoCompleteItem[] => {
    if (!input || input.trim().length === 0) {
      return [];
    }

    // Check cache first
    if (cacheRef.current[input]) {
      return cacheRef.current[input];
    }

    const trimmedInput = input.trim().toLowerCase();
    const results: AutoCompleteItem[] = [];

    // Get history matches (prioritize recent commands)
    const historyMatches = historyCommands
      .filter(item => item.command.toLowerCase().startsWith(trimmedInput))
      .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
      .slice(0, 5) // Limit to 5 history items
      .map(item => ({
        value: item.command,
        type: 'history' as const,
        timestamp: item.timestamp,
      }));

    // Get system command matches
    const systemMatches = systemCommands
      .filter(cmd => cmd.toLowerCase().startsWith(trimmedInput))
      .slice(0, 10) // Limit to 10 system commands
      .map(cmd => ({
        value: cmd,
        type: 'system' as const,
      }));

    // Combine: history first, then system commands
    results.push(...historyMatches);
    
    // Add system commands that are not already in history
    const historyValues = new Set(historyMatches.map(h => h.value));
    systemMatches.forEach(sys => {
      if (!historyValues.has(sys.value)) {
        results.push(sys);
      }
    });

    // Cache the results
    cacheRef.current[input] = results;

    return results;
  }, [systemCommands, historyCommands]);

  const handleInput = useCallback((input: string) => {
    setCurrentInput(input);
    
    // Only show suggestions for the first word (command name)
    const words = input.split(' ');
    if (words.length > 1) {
      setIsVisible(false);
      setSuggestions([]);
      return;
    }

    const newSuggestions = getSuggestions(input);
    setSuggestions(newSuggestions);
    setSelectedIndex(0);
    setIsVisible(newSuggestions.length > 0);
  }, [getSuggestions]);

  const handleKeyDown = useCallback((key: string): boolean => {
    if (!isVisible || suggestions.length === 0) {
      return false;
    }

    switch (key) {
      case 'ArrowDown':
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return true;

      case 'ArrowUp':
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        return true;

      case 'Tab':
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          return true; // Signal that we want to complete
        }
        return false;

      case 'Escape':
        setIsVisible(false);
        setSuggestions([]);
        return true;

      default:
        return false;
    }
  }, [isVisible, suggestions, selectedIndex]);

  const getSelectedSuggestion = useCallback((): string | null => {
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      return suggestions[selectedIndex].value;
    }
    return null;
  }, [selectedIndex, suggestions]);

  const hide = useCallback(() => {
    setIsVisible(false);
    setSuggestions([]);
    setSelectedIndex(0);
  }, []);

  const refreshHistory = useCallback(() => {
    loadHistoryCommands();
    // Clear cache when history is refreshed
    cacheRef.current = {};
  }, [sessionId]);

  return {
    suggestions,
    selectedIndex,
    isVisible,
    handleInput,
    handleKeyDown,
    getSelectedSuggestion,
    hide,
    refreshHistory,
  };
};

