// ProtoShell Modal Component
// Interactive shell for protocol debugging and testing

import React, { useState, useRef, useEffect } from 'react';
import { X, Terminal, Send, Trash2, Copy, Download } from 'lucide-react';
import { cn } from '@/utils';

interface ProtoShellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandHistoryItem {
  command: string;
  output: string;
  timestamp: Date;
  type: 'success' | 'error' | 'info';
}

export const ProtoShellModal: React.FC<ProtoShellModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const handleCommand = (cmd: string) => {
    if (!cmd.trim()) return;

    // Add to command history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Process command
    let output = '';
    let type: 'success' | 'error' | 'info' = 'info';

    try {
      // TODO: Implement actual command processing
      if (cmd.toLowerCase() === 'help') {
        output = `Available commands:
  help     - Show this help message
  clear    - Clear the console
  version  - Show ProtoTool version
  connect  - Connect to a session
  send     - Send data to active session
  receive  - Show received data
  status   - Show connection status
  
More commands coming soon...`;
        type = 'info';
      } else if (cmd.toLowerCase() === 'clear') {
        setHistory([]);
        return;
      } else if (cmd.toLowerCase() === 'version') {
        output = 'ProtoTool v0.0.13';
        type = 'success';
      } else {
        output = `Command not recognized: ${cmd}\nType 'help' for available commands.`;
        type = 'error';
      }
    } catch (error) {
      output = `Error: ${error}`;
      type = 'error';
    }

    setHistory(prev => [...prev, {
      command: cmd,
      output,
      timestamp: new Date(),
      type
    }]);

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const handleClear = () => {
    setHistory([]);
  };

  const handleCopyOutput = () => {
    const text = history.map(item => 
      `> ${item.command}\n${item.output}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex items-center justify-center">
        <div className="bg-background border border-border rounded-xl shadow-2xl w-full h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center space-x-3">
              <Terminal className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">ProtoShell</h2>
              <span className="text-xs text-muted-foreground">Interactive Protocol Shell</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyOutput}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="Copy output"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={handleClear}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="Clear console"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Output Area */}
          <div 
            ref={outputRef}
            className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-black/5 dark:bg-black/20"
          >
            {history.length === 0 ? (
              <div className="text-muted-foreground">
                <p>Welcome to ProtoShell - Interactive Protocol Debugging Shell</p>
                <p className="mt-2">Type 'help' to see available commands.</p>
              </div>
            ) : (
              history.map((item, index) => (
                <div key={index} className="mb-4">
                  <div className="flex items-center space-x-2 text-primary">
                    <span className="text-muted-foreground">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="font-bold">{'>'}</span>
                    <span>{item.command}</span>
                  </div>
                  <div className={cn(
                    "mt-1 pl-4 whitespace-pre-wrap",
                    item.type === 'error' && "text-red-500",
                    item.type === 'success' && "text-green-500",
                    item.type === 'info' && "text-foreground"
                  )}>
                    {item.output}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-muted/30 p-4">
            <div className="flex items-center space-x-3">
              <span className="text-primary font-mono font-bold">{'>'}</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command..."
                className="flex-1 bg-transparent outline-none font-mono text-sm"
              />
              <button
                onClick={() => handleCommand(input)}
                disabled={!input.trim()}
                className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Press Enter to execute • ↑↓ to navigate history • Type 'help' for commands
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

