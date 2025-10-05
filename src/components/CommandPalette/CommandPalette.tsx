// Command Palette Component

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';
import {
  Search,
  X,
  Star,
  Clock,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { commandRegistry } from '@/services/CommandPalette/CommandRegistry';
import { Command, CommandCategory, CommandSearchResult } from '@/services/CommandPalette/types';
import { commandPaletteService } from '@/services/CommandPalette/CommandPaletteService';

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  file: '文件',
  edit: '编辑',
  view: '视图',
  session: '会话',
  tools: '工具',
  window: '窗口',
  help: '帮助',
  navigation: '导航',
  settings: '设置'
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen: controlledIsOpen, onClose: controlledOnClose }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<Command | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Use controlled or internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const onClose = controlledOnClose || (() => setInternalIsOpen(false));

  // Listen to global command palette service
  useEffect(() => {
    const handleOpen = () => setInternalIsOpen(true);
    const handleClose = () => setInternalIsOpen(false);
    const handleToggle = () => setInternalIsOpen(prev => !prev);

    commandPaletteService.on('open', handleOpen);
    commandPaletteService.on('close', handleClose);
    commandPaletteService.on('toggle', handleToggle);

    return () => {
      commandPaletteService.off('open', handleOpen);
      commandPaletteService.off('close', handleClose);
      commandPaletteService.off('toggle', handleToggle);
    };
  }, []);

  // Search and filter commands
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show recent commands when no search query
      const recent = commandRegistry.getRecentCommands(8);
      return recent.map(cmd => ({
        command: cmd,
        score: 0,
        matchedKeywords: []
      }));
    }
    
    return commandRegistry.search(searchQuery);
  }, [searchQuery]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const config = commandRegistry.getConfig();
    if (!config.groupByCategory || searchQuery.trim()) {
      return [{ category: null, commands: searchResults }];
    }

    const groups = new Map<CommandCategory, CommandSearchResult[]>();

    for (const result of searchResults) {
      const category = result.command.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(result);
    }

    return Array.from(groups.entries()).map(([category, commands]) => ({
      category,
      commands
    }));
  }, [searchResults, searchQuery]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showConfirmation) {
        if (e.key === 'Enter') {
          handleConfirmExecution();
        } else if (e.key === 'Escape') {
          setShowConfirmation(false);
          setPendingCommand(null);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleExecuteCommand(searchResults[selectedIndex].command);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchResults, showConfirmation]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleExecuteCommand = async (command: Command) => {
    const config = commandRegistry.getConfig();
    
    // Check if confirmation is needed
    if (config.confirmDangerousCommands && command.dangerLevel !== 'safe') {
      setPendingCommand(command);
      setShowConfirmation(true);
      return;
    }

    await executeCommand(command);
  };

  const handleConfirmExecution = async () => {
    if (pendingCommand) {
      await executeCommand(pendingCommand);
    }
    setShowConfirmation(false);
    setPendingCommand(null);
  };

  const executeCommand = async (command: Command) => {
    try {
      await commandRegistry.execute(command.id);
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center px-4 py-3 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索命令..."
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Command List */}
          <div 
            ref={listRef}
            className="max-h-[400px] overflow-y-auto"
          >
            {searchResults.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>未找到匹配的命令</p>
              </div>
            ) : (
              <>
                {!searchQuery && (
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground flex items-center">
                    <Clock className="w-3 h-3 mr-2" />
                    最近使用
                  </div>
                )}
                
                {groupedCommands.map((group, groupIndex) => (
                  <div key={group.category || 'all'}>
                    {group.category && searchQuery && (
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                        {CATEGORY_LABELS[group.category]}
                      </div>
                    )}
                    
                    {group.commands.map((result, index) => {
                      const globalIndex = searchResults.indexOf(result);
                      const isSelected = globalIndex === selectedIndex;
                      const Icon = result.command.icon;
                      
                      return (
                        <button
                          key={result.command.id}
                          onClick={() => handleExecuteCommand(result.command)}
                          className={cn(
                            "w-full flex items-center px-4 py-3 transition-colors text-left",
                            isSelected 
                              ? "bg-accent" 
                              : "hover:bg-accent/50"
                          )}
                        >
                          {Icon && (
                            <Icon className="w-5 h-5 mr-3 text-muted-foreground flex-shrink-0" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              <span className="font-medium text-foreground">
                                {result.command.title}
                              </span>
                              {result.command.dangerLevel === 'danger' && (
                                <AlertTriangle className="w-3 h-3 ml-2 text-red-500" />
                              )}
                              {result.command.dangerLevel === 'warning' && (
                                <AlertTriangle className="w-3 h-3 ml-2 text-yellow-500" />
                              )}
                            </div>
                            {result.command.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {result.command.description}
                              </p>
                            )}
                          </div>
                          
                          {result.command.shortcut && (
                            <kbd className="ml-3 px-2 py-1 bg-muted border border-border rounded text-xs font-mono text-muted-foreground flex-shrink-0">
                              {result.command.shortcut}
                            </kbd>
                          )}
                          
                          {isSelected && (
                            <ChevronRight className="w-4 h-4 ml-2 text-muted-foreground flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>↑↓ 导航</span>
              <span>Enter 执行</span>
              <span>Esc 关闭</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && pendingCommand && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowConfirmation(false);
              setPendingCommand(null);
            }}
          />
          <div className="relative bg-background border border-border rounded-lg p-6 max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start mb-4">
              <AlertTriangle className={cn(
                "w-6 h-6 mr-3 flex-shrink-0",
                pendingCommand.dangerLevel === 'danger' ? 'text-red-500' : 'text-yellow-500'
              )} />
              <div>
                <h3 className="font-semibold text-lg mb-2">确认执行</h3>
                <p className="text-sm text-muted-foreground">
                  确定要执行命令 "{pendingCommand.title}" 吗？
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setPendingCommand(null);
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmExecution}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors text-white",
                  pendingCommand.dangerLevel === 'danger'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                )}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

