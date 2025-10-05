// ProtoShell Modal Component
// Interactive shell for protocol debugging and testing

import React, { useState, useRef, useEffect } from 'react';
import { X, Terminal, Send, Trash2, Copy, List, Play, Square, Folder, Clock, CheckCircle, XCircle, Maximize2, FileText, FolderOpen, Command, Palette } from 'lucide-react';
import { cn } from '@/utils';
import { shellService } from '@/services/shell/ShellService';
import { ShellJob } from '@/types/shell';
import { ToastContainer } from './Toast';
import { SyntaxHighlight, GhostSuggestion, InlineDiagnostic } from './SyntaxHighlight';
import { HistorySearchPanel } from './HistorySearchPanel';
import { OutputPager } from './OutputPager';
import { ThemeSelector } from './ThemeSelector';
import { ShellThemeProvider } from './ThemeConfig';
import { generateId } from '@/utils';

interface ProtoShellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandHistoryItem {
  command: string;
  output: string;
  timestamp: Date;
  type: 'success' | 'error' | 'info';
  jobId?: string;
}

export const ProtoShellModal: React.FC<ProtoShellModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showJobs, setShowJobs] = useState(false);
  const [jobs, setJobs] = useState<ShellJob[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [currentDir, setCurrentDir] = useState('~');
  const [lastExitCode, setLastExitCode] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [ghostSuggestion, setGhostSuggestion] = useState('');
  const [showHistorySearch, setShowHistorySearch] = useState(false);
  const [showOutputPager, setShowOutputPager] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [pagerContent, setPagerContent] = useState('');
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
  }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Initialize shell service
  useEffect(() => {
    shellService.initialize();
    const context = shellService.getContext();
    setCurrentDir(context.cwd);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Show welcome toast on first open
  useEffect(() => {
    if (isOpen && history.length === 0) {
      addToast('info', 'Welcome to ProtoShell! Type "help" to get started.', 5000);
    }
  }, [isOpen]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Helper function to add toast
  const addToast = (type: 'success' | 'error' | 'info' | 'warning', message: string, duration = 3000) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, type, message, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Get icon for command type
  const getCommandIcon = (command: string) => {
    if (command.startsWith('proto ')) {
      return <Terminal className="w-4 h-4 text-blue-500" />;
    } else if (['cd', 'pwd', 'ls', 'mkdir', 'rm', 'mv', 'cp'].includes(command)) {
      return <FolderOpen className="w-4 h-4 text-yellow-500" />;
    } else if (['echo', 'cat', 'grep', 'sed', 'awk'].includes(command)) {
      return <FileText className="w-4 h-4 text-green-500" />;
    } else {
      return <Command className="w-4 h-4 text-primary" />;
    }
  };

  // Update jobs periodically
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const currentJobs = shellService.getAllJobs();
      setJobs(currentJobs);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    // Add to command history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Handle clear command specially
    if (cmd.toLowerCase() === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    // Execute command
    try {
      const result = await shellService.execute(cmd);

      // Update exit code
      setLastExitCode(result.exitCode);

      // Update current directory if cd command
      if (cmd.startsWith('cd ') || cmd === 'cd') {
        const context = shellService.getContext();
        setCurrentDir(context.cwd);
      }

      // Determine output type
      let type: 'success' | 'error' | 'info' = result.success ? 'success' : 'error';

      // Special handling for info commands
      if (result.success && (cmd.startsWith('help') || cmd.startsWith('proto status') || cmd.startsWith('jobs'))) {
        type = 'info';
      }

      setHistory(prev => [...prev, {
        command: cmd,
        output: result.output || result.error || '',
        timestamp: new Date(),
        type,
        jobId: result.jobId,
      }]);

      // Show toast for background jobs
      if (result.jobId) {
        addToast('info', `Job started: ${cmd.replace(' &', '')}`, 2000);
      }
    } catch (error) {
      setLastExitCode(1);
      addToast('error', `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 3000);
      setHistory(prev => [...prev, {
        command: cmd,
        output: '',
        timestamp: new Date(),
        type: 'error',
      }]);
    }

    setInput('');
  };

  // Update suggestions and ghost suggestion when input changes
  useEffect(() => {
    if (input.trim()) {
      const sug = shellService.getCommandSuggestions(input.trim());
      setSuggestions(sug);
      setSelectedSuggestion(0);

      // Find ghost suggestion from history
      const historyMatch = commandHistory.find(cmd =>
        cmd.startsWith(input) && cmd !== input
      );
      setGhostSuggestion(historyMatch || '');
    } else {
      setSuggestions([]);
      setGhostSuggestion('');
    }
  }, [input, commandHistory]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+C - Cancel current input
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      setInput('');
      setSuggestions([]);
      setHistoryIndex(-1);
      return;
    }

    // Ctrl+L - Clear screen
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setHistory([]);
      return;
    }

    // Ctrl+U - Clear input line
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      setInput('');
      return;
    }

    // Ctrl+R - Open history search
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      setShowHistorySearch(true);
      return;
    }

    // Ctrl+A - Move to beginning of line
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      if (inputRef.current) {
        inputRef.current.setSelectionRange(0, 0);
      }
      return;
    }

    // Ctrl+E - Move to end of line
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      if (inputRef.current) {
        const len = input.length;
        inputRef.current.setSelectionRange(len, len);
      }
      return;
    }

    // Right arrow at end of line - Accept ghost suggestion
    if (e.key === 'ArrowRight' && ghostSuggestion && inputRef.current) {
      const cursorPos = inputRef.current.selectionStart || 0;
      if (cursorPos === input.length) {
        e.preventDefault();
        setInput(ghostSuggestion);
        setGhostSuggestion('');
        return;
      }
    }

    // Handle suggestions navigation
    if (suggestions.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        setInput(suggestions[selectedSuggestion]);
        setSuggestions([]);
        return;
      } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault();
        setSelectedSuggestion((prev) => (prev + 1) % suggestions.length);
        return;
      } else if (e.key === 'ArrowUp' && suggestions.length > 0) {
        e.preventDefault();
        setSelectedSuggestion((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
    }

    if (e.key === 'Enter') {
      handleCommand(input);
      setSuggestions([]);
    } else if (e.key === 'ArrowUp' && suggestions.length === 0) {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown' && suggestions.length === 0) {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
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

  const handleViewInPager = () => {
    const text = history.map(item =>
      `> ${item.command}\n${item.output}`
    ).join('\n\n');
    setPagerContent(text);
    setShowOutputPager(true);
  };

  const handleCancelJob = (jobId: string) => {
    shellService.cancelJob(jobId);
    setJobs(shellService.getAllJobs());
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const duration = end.getTime() - startTime.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (!isOpen) return null;

  return (
    <ShellThemeProvider>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* History Search Panel */}
      <HistorySearchPanel
        isOpen={showHistorySearch}
        onClose={() => setShowHistorySearch(false)}
        onSelect={(cmd) => {
          setInput(cmd);
          setShowHistorySearch(false);
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }}
        history={history.map(h => ({
          command: h.command,
          timestamp: h.timestamp,
          cwd: currentDir,
        }))}
      />

      {/* Output Pager */}
      <OutputPager
        isOpen={showOutputPager}
        onClose={() => setShowOutputPager(false)}
        content={pagerContent}
        title="Command Output"
      />

      {/* Theme Selector */}
      <ThemeSelector
        isOpen={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
      />

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
              {jobs.filter(j => j.status === 'running').length > 0 && (
                <span className="px-2 py-1 text-xs bg-green-500/20 text-green-500 rounded-full">
                  {jobs.filter(j => j.status === 'running').length} running
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowJobs(!showJobs)}
                className={cn(
                  "p-2 hover:bg-accent rounded-lg transition-colors",
                  showJobs && "bg-accent"
                )}
                title="Show jobs"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={handleViewInPager}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="View in pager (full screen)"
                disabled={history.length === 0}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowThemeSelector(true)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="Theme settings"
              >
                <Palette className="w-4 h-4" />
              </button>
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

          {/* Status Bar */}
          <div className="border-b border-border bg-muted/20 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              {/* Current Directory */}
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Folder className="w-3 h-3" />
                <span className="font-mono">{currentDir}</span>
              </div>

              {/* Exit Code */}
              <div className="flex items-center space-x-1">
                {lastExitCode === 0 ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-green-500">0</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span className="text-red-500">{lastExitCode}</span>
                  </>
                )}
              </div>

              {/* Running Jobs Count */}
              {jobs.filter(j => j.status === 'running').length > 0 && (
                <div className="flex items-center space-x-1 text-blue-500">
                  <Play className="w-3 h-3" />
                  <span>{jobs.filter(j => j.status === 'running').length} jobs</span>
                </div>
              )}
            </div>

            {/* Right Side - Time */}
            <div className="flex items-center space-x-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Output Area */}
            <div
              ref={outputRef}
              className={cn(
                "flex-1 overflow-y-auto p-6 font-mono text-sm bg-black/5 dark:bg-black/20",
                showJobs && "border-r border-border"
              )}
            >
              {history.length === 0 ? (
                <div className="text-muted-foreground">
                  <p>Welcome to ProtoShell - Interactive Protocol Debugging Shell</p>
                  <p className="mt-2">Type 'help' to see available commands.</p>
                  <p className="mt-4">Features:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Built-in commands: echo, cd, pwd, jobs, fg, bg, kill, alias, export</li>
                    <li>ProtoTool integration: proto connect, proto send, proto status, proto sessions</li>
                    <li>Background jobs: Add '&' to run commands in background</li>
                    <li>Command history: Use ↑↓ to navigate</li>
                  </ul>
                </div>
              ) : (
                history.map((item, index) => (
                  <div key={index} className="mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground text-xs">
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="font-bold text-primary">{'>'}</span>
                      <SyntaxHighlight input={item.command} />
                      {item.jobId && (
                        <span className="text-xs text-muted-foreground">
                          [job: {item.jobId.slice(0, 8)}]
                        </span>
                      )}
                    </div>
                    {item.output && (
                      <div className={cn(
                        "mt-1 pl-4 whitespace-pre-wrap text-sm",
                        item.type === 'error' && "text-red-500",
                        item.type === 'success' && "text-green-500",
                        item.type === 'info' && "text-foreground"
                      )}>
                        {item.output}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Jobs Panel */}
            {showJobs && (
              <div className="w-80 overflow-y-auto p-4 bg-muted/20">
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <List className="w-4 h-4 mr-2" />
                  Background Jobs
                </h3>
                {jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No jobs</p>
                ) : (
                  <div className="space-y-2">
                    {jobs.map(job => (
                      <div
                        key={job.id}
                        className="p-3 bg-background border border-border rounded-lg text-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {job.id.slice(0, 8)}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 text-xs rounded-full",
                            job.status === 'running' && "bg-green-500/20 text-green-500",
                            job.status === 'completed' && "bg-blue-500/20 text-blue-500",
                            job.status === 'failed' && "bg-red-500/20 text-red-500",
                            job.status === 'cancelled' && "bg-gray-500/20 text-gray-500"
                          )}>
                            {job.status}
                          </span>
                        </div>
                        <div className="font-mono text-xs mb-2">
                          {job.command} {job.args.join(' ')}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDuration(job.startTime, job.endTime)}</span>
                          {job.status === 'running' && (
                            <button
                              onClick={() => handleCancelJob(job.id)}
                              className="p-1 hover:bg-accent rounded transition-colors"
                              title="Cancel job"
                            >
                              <Square className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {job.exitCode !== undefined && (
                          <div className="mt-2 text-xs">
                            Exit code: {job.exitCode}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-muted/30 p-4">
            {/* Enhanced Suggestions Panel */}
            {suggestions.length > 0 && (
              <div className="mb-2 p-3 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Suggestions (Tab to complete, ↑↓ to navigate)</span>
                  <span>{suggestions.length} found</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {suggestions.slice(0, 10).map((suggestion, index) => {
                    const icon = getCommandIcon(suggestion);
                    return (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          setSuggestions([]);
                        }}
                        className={cn(
                          "flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors text-left",
                          index === selectedSuggestion
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-accent"
                        )}
                      >
                        {icon}
                        <span className="font-mono">{suggestion}</span>
                      </button>
                    );
                  })}
                </div>
                {suggestions.length > 10 && (
                  <div className="mt-2 text-xs text-muted-foreground text-center">
                    ... and {suggestions.length - 10} more
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-3">
              <span className="text-primary font-mono font-bold">{'>'}</span>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter command..."
                  className="w-full bg-transparent outline-none font-mono text-sm relative z-10"
                  style={{ caretColor: 'auto' }}
                />
                {/* Ghost Suggestion */}
                {ghostSuggestion && (
                  <div className="absolute inset-0 pointer-events-none font-mono text-sm flex items-center">
                    <span className="invisible">{input}</span>
                    <GhostSuggestion suggestion={ghostSuggestion} currentInput={input} />
                  </div>
                )}
              </div>
              <button
                onClick={() => handleCommand(input)}
                disabled={!input.trim()}
                className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Inline Diagnostics */}
            <InlineDiagnostic input={input} />
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold">Shortcuts:</span> Ctrl+R search • Ctrl+C cancel • Ctrl+L clear • Ctrl+U clear line • Ctrl+A/E line start/end • Tab complete • ↑↓ history
            </div>
          </div>
        </div>
      </div>
    </ShellThemeProvider>
  );
};

