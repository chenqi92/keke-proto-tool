// Terminal Session Component
// Provides a full-featured terminal using xterm.js

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AutoComplete } from './AutoComplete';
import { useTerminalAutoComplete } from '@/hooks/useTerminalAutoComplete';

interface TerminalSessionProps {
  sessionId: string;
  sessionName: string;
  selectedCommand?: string | null;
  onClose?: () => void;
  onTitleChange?: (title: string) => void;
}

export const TerminalSession: React.FC<TerminalSessionProps> = ({
  sessionId,
  sessionName,
  selectedCommand,
  onClose,
  onTitleChange,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [currentDir, setCurrentDir] = useState('~');
  const [isReady, setIsReady] = useState(false);
  const ptySessionIdRef = useRef<string | null>(null);
  const unlistenDataRef = useRef<(() => void) | null>(null);
  const unlistenCloseRef = useRef<(() => void) | null>(null);
  const currentInputRef = useRef<string>('');
  const [autoCompletePosition, setAutoCompletePosition] = useState({ x: 0, y: 0 });
  const dataHandlerRef = useRef<any>(null);
  const isRestartingRef = useRef(false);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isAtPromptRef = useRef(true); // Track if we're at a shell prompt (not in interactive mode)

  // AutoComplete hook
  const {
    suggestions,
    selectedIndex,
    isVisible: autoCompleteVisible,
    handleInput: handleAutoCompleteInput,
    handleKeyDown: handleAutoCompleteKeyDown,
    getSelectedSuggestion,
    hide: hideAutoComplete,
    refreshHistory,
  } = useTerminalAutoComplete(sessionId);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Reset initialization flag when component mounts
    // This handles both initial mount and StrictMode remount
    isMountedRef.current = true;

    // Prevent double initialization in React StrictMode
    if (isInitializedRef.current && xtermRef.current) {
      console.log('[TerminalSession] Already initialized and terminal exists, skipping...');
      return;
    }

    isInitializedRef.current = true;

    console.log('[TerminalSession] Initializing terminal for session:', sessionId);

    // Create terminal instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      allowProposedApi: true,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Open terminal and wait for it to be ready
    term.open(terminalRef.current);

    // Use setTimeout to ensure DOM is ready before fitting
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (error) {
        console.error('Failed to fit terminal:', error);
      }
    }, 0);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message - removed to avoid duplicate output
    // The shell will display its own prompt

    setIsReady(true);

    // Start PTY session
    startPtySession(term);

    // Handle terminal input with autocomplete support
    dataHandlerRef.current = term.onData((data) => {
      const code = data.charCodeAt(0);

      // Handle Ctrl+Space (code 0) for autocomplete
      if (code === 0 || (code === 32 && data.length === 1 && data.charCodeAt(0) === 0)) {
        // Trigger autocomplete
        handleAutoCompleteInput(currentInputRef.current);
        updateAutoCompletePosition(term);
        return;
      }

      // Handle autocomplete navigation
      if (autoCompleteVisible) {
        if (data === '\x1b[A') { // Up arrow
          if (handleAutoCompleteKeyDown('ArrowUp')) {
            return;
          }
        } else if (data === '\x1b[B') { // Down arrow
          if (handleAutoCompleteKeyDown('ArrowDown')) {
            return;
          }
        } else if (data === '\t') { // Tab
          const suggestion = getSelectedSuggestion();
          if (suggestion) {
            // Clear current input and write suggestion
            const clearLength = currentInputRef.current.length;
            for (let i = 0; i < clearLength; i++) {
              term.write('\b \b');
            }
            term.write(suggestion);
            currentInputRef.current = suggestion;

            // Send to PTY
            if (ptySessionIdRef.current) {
              invoke('write_pty_session', {
                sessionId: ptySessionIdRef.current,
                data: suggestion,
              }).catch(error => {
                console.error('Failed to write to PTY:', error);
              });
            }

            hideAutoComplete();
            return;
          }
        } else if (data === '\x1b') { // Escape
          hideAutoComplete();
          return;
        }
      }

      // Track current input for autocomplete
      if (code === 13) { // Enter
        const command = currentInputRef.current.trim();

        // Save command to history ONLY if:
        // 1. Command is not empty
        // 2. We're at a shell prompt (not in interactive mode like password input)
        // 3. Command doesn't look like a password (no spaces, reasonable length)
        if (command && ptySessionIdRef.current && isAtPromptRef.current) {
          // Additional filter: skip if command looks suspicious
          // (e.g., very long single word without spaces might be a password)
          const isSuspicious = command.length > 50 && !command.includes(' ');

          if (!isSuspicious) {
            console.log('[TerminalSession] Saving command to history:', command);
            // Parse command and args
            const parts = command.split(' ');
            const cmdName = parts[0] || command;
            const cmdArgs = parts.slice(1);

            invoke('add_shell_history', {
              item: {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                session_id: sessionId,
                command: cmdName,  // Just the command name for grouping
                args: JSON.stringify(cmdArgs),  // Arguments as JSON array
                timestamp: Date.now(),
                cwd: currentDir,
                exit_code: 0, // We don't know the exit code yet
                execution_time: 0, // We don't track execution time in real-time
                output: null,
                error: null,
              },
            }).catch(error => {
              console.error('[TerminalSession] Failed to save command to history:', error);
            });
          } else {
            console.log('[TerminalSession] Skipping suspicious input (might be password)');
          }
        } else if (!isAtPromptRef.current) {
          console.log('[TerminalSession] Skipping input - not at shell prompt (interactive mode)');
        }

        currentInputRef.current = '';
        hideAutoComplete();
        // Refresh history after command execution
        setTimeout(() => refreshHistory(), 100);
      } else if (code === 127) { // Backspace
        if (currentInputRef.current.length > 0) {
          currentInputRef.current = currentInputRef.current.slice(0, -1);
        }
        hideAutoComplete();
      } else if (code >= 32 && code <= 126) { // Printable characters
        currentInputRef.current += data;
        // Auto-trigger suggestions as user types
        if (currentInputRef.current.length > 0 && !currentInputRef.current.includes(' ')) {
          handleAutoCompleteInput(currentInputRef.current);
          updateAutoCompletePosition(term);
        }
      } else if (code === 3) { // Ctrl+C
        currentInputRef.current = '';
        hideAutoComplete();
      }

      // Send to PTY
      if (ptySessionIdRef.current) {
        invoke('write_pty_session', {
          sessionId: ptySessionIdRef.current,
          data,
        }).catch(error => {
          console.error('Failed to write to PTY:', error);
        });
      }
    });

    // Handle window resize
    const handleResize = () => {
      try {
        fitAddon.fit();
        // Also resize PTY
        if (ptySessionIdRef.current && term.rows && term.cols) {
          invoke('resize_pty_session', {
            sessionId: ptySessionIdRef.current,
            rows: term.rows,
            cols: term.cols,
          }).catch(error => {
            console.error('Failed to resize PTY:', error);
          });
        }
      } catch (error) {
        console.error('Failed to fit terminal on resize:', error);
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      console.log('[TerminalSession] Cleanup called for session:', sessionId);

      // Mark as unmounted
      isMountedRef.current = false;

      window.removeEventListener('resize', handleResize);

      // Only cleanup if this is a real unmount (not StrictMode double-mount)
      // We use a timeout to check if the component remounts immediately
      setTimeout(() => {
        if (!isMountedRef.current) {
          console.log('[TerminalSession] Real unmount detected, cleaning up resources');

          // Close PTY session
          if (ptySessionIdRef.current) {
            console.log('[TerminalSession] Closing PTY session:', ptySessionIdRef.current);
            invoke('close_pty_session', {
              sessionId: ptySessionIdRef.current,
            }).catch(error => {
              console.error('Failed to close PTY:', error);
            });
          }

          // Unlisten events
          if (unlistenDataRef.current) {
            console.log('[TerminalSession] Removing data listener');
            unlistenDataRef.current();
            unlistenDataRef.current = null;
          }
          if (unlistenCloseRef.current) {
            console.log('[TerminalSession] Removing close listener');
            unlistenCloseRef.current();
            unlistenCloseRef.current = null;
          }

          // Dispose data handler
          if (dataHandlerRef.current) {
            console.log('[TerminalSession] Disposing data handler');
            dataHandlerRef.current.dispose();
            dataHandlerRef.current = null;
          }

          // Dispose terminal
          if (xtermRef.current) {
            console.log('[TerminalSession] Disposing terminal');
            xtermRef.current.dispose();
            xtermRef.current = null;
          }

          // Reset initialization flag for next mount
          isInitializedRef.current = false;
        } else {
          console.log('[TerminalSession] StrictMode remount detected, keeping all resources alive');
        }
      }, 0);
    };
  }, [sessionId, sessionName]);

  // Handle selected command from history panel
  useEffect(() => {
    if (selectedCommand && xtermRef.current && ptySessionIdRef.current) {
      const term = xtermRef.current;

      // Clear current input
      const clearLength = currentInputRef.current.length;
      for (let i = 0; i < clearLength; i++) {
        term.write('\b \b');
      }

      // Update current input ref
      currentInputRef.current = selectedCommand;

      // Send to PTY (PTY will echo it back to the terminal)
      // Don't write to terminal directly to avoid duplication
      invoke('write_pty_session', {
        sessionId: ptySessionIdRef.current,
        data: selectedCommand,
      }).catch(error => {
        console.error('Failed to write selected command to PTY:', error);
      });

      // Hide autocomplete if visible
      hideAutoComplete();
    }
  }, [selectedCommand]);

  const updateAutoCompletePosition = (term: Terminal) => {
    if (!terminalRef.current) return;

    const rect = terminalRef.current.getBoundingClientRect();
    const cursorY = term.buffer.active.cursorY;
    const cursorX = term.buffer.active.cursorX;

    // Calculate position based on cursor position
    // Each character is approximately 9px wide, each line is approximately 17px high
    const charWidth = 9;
    const lineHeight = 17;

    setAutoCompletePosition({
      x: rect.left + (cursorX * charWidth),
      y: rect.top + ((cursorY + 1) * lineHeight), // +1 to show below cursor
    });
  };

  const handleAutoCompleteSelect = (value: string) => {
    const term = xtermRef.current;
    if (!term || !ptySessionIdRef.current) return;

    // Clear current input
    const clearLength = currentInputRef.current.length;
    for (let i = 0; i < clearLength; i++) {
      term.write('\b \b');
    }

    // Write selected value
    term.write(value);
    currentInputRef.current = value;

    // Send to PTY
    invoke('write_pty_session', {
      sessionId: ptySessionIdRef.current,
      data: value,
    }).catch(error => {
      console.error('Failed to write to PTY:', error);
    });

    hideAutoComplete();
  };

  const startPtySession = async (term: Terminal) => {
    // Prevent multiple simultaneous starts
    if (isRestartingRef.current) {
      console.log('[TerminalSession] Already restarting, skipping...');
      return;
    }

    isRestartingRef.current = true;

    try {
      // Get default shell from backend
      const shell = await invoke<string>('get_default_shell');

      // For PTY sessions, we don't need to specify -i or -l flags
      // The PTY itself provides an interactive environment
      const args: string[] = [];

      console.log(`[TerminalSession] Starting PTY with shell: ${shell}`);

      // Get current environment variables to pass to shell
      // This ensures the shell has all necessary context
      const env: Record<string, string> = {};

      // These are critical for shell operation
      if (typeof window !== 'undefined') {
        // We can't access process.env in browser, but we can set some defaults
        env.LANG = 'en_US.UTF-8';
        env.LC_ALL = 'en_US.UTF-8';
      }

      // IMPORTANT: Set up event listeners BEFORE starting PTY
      // This ensures we don't miss any initial output
      console.log(`[TerminalSession] Pre-registering event listeners for session: ${sessionId}`);

      // We need to generate a predictable PTY ID or use the session ID
      // For now, we'll set up listeners after getting the PTY ID, but immediately

      // Start PTY session
      const ptyId = await invoke<string>('start_pty_session', {
        sessionId,
        command: shell,
        args,
        context: {
          cwd: currentDir === '~' ? null : currentDir,
          env,
        },
      });

      console.log(`[TerminalSession] PTY session started with ID: ${ptyId}`);

      ptySessionIdRef.current = ptyId;

      console.log(`[TerminalSession] Setting up event listeners for PTY: ${ptyId}`);

      // Listen for PTY data
      const dataEventName = `pty-session-${ptyId}-data`;
      console.log(`[TerminalSession] Registering listener for event: ${dataEventName}`);

      const unlistenData = await listen<string>(dataEventName, (event) => {
        console.log(`[TerminalSession] ✓ Received data from PTY ${ptyId}, length: ${event.payload.length}, preview:`, event.payload.substring(0, 50));
        try {
          term.write(event.payload);

          // Detect if we're at a shell prompt
          // Common prompt patterns: "$ ", "% ", "> ", "# "
          // Also check for bracketed paste mode end: [?2004h
          const data = event.payload;
          if (data.includes('[?2004h')) {
            // Bracketed paste mode enabled - we're at a prompt
            isAtPromptRef.current = true;
          } else if (data.includes('[?2004l')) {
            // Bracketed paste mode disabled - command is executing
            isAtPromptRef.current = false;
          }

          console.log(`[TerminalSession] ✓ Data written to terminal successfully`);
        } catch (error) {
          console.error(`[TerminalSession] ✗ Failed to write to terminal:`, error);
        }
      });
      unlistenDataRef.current = unlistenData;
      console.log(`[TerminalSession] ✓ Data listener registered successfully for: ${dataEventName}`);

      // Verify the listener is working by checking if it's defined
      console.log(`[TerminalSession] Listener function type:`, typeof unlistenData);

      // Listen for PTY close
      const closeEventName = `pty-session-${ptyId}-close`;
      console.log(`[TerminalSession] Registering listener for event: ${closeEventName}`);

      const unlistenClose = await listen<number>(closeEventName, (event) => {
        console.log(`[TerminalSession] PTY session ${ptyId} closed with code: ${event.payload}`);

        // Clean up event listeners for this PTY session
        if (unlistenDataRef.current) {
          unlistenDataRef.current();
          unlistenDataRef.current = null;
        }
        if (unlistenCloseRef.current) {
          unlistenCloseRef.current();
          unlistenCloseRef.current = null;
        }

        // Clear the PTY session ID
        ptySessionIdRef.current = null;
        isRestartingRef.current = false;

        // Show exit message
        term.writeln(`\r\n\x1b[1;33m[Shell exited with code ${event.payload}]\x1b[0m`);
        term.writeln(`\x1b[1;36m[Press Enter to restart, or close this tab]\x1b[0m`);

        // Remove the normal data handler
        if (dataHandlerRef.current) {
          dataHandlerRef.current.dispose();
          dataHandlerRef.current = null;
        }

        // Set up restart handler
        const restartHandler = (data: string) => {
          // Check if Enter key was pressed
          if (data === '\r' || data === '\n') {
            console.log('[TerminalSession] Restart requested by user');
            term.write('\r\n');
            term.writeln('\x1b[1;32m[Restarting shell...]\x1b[0m');

            // Remove the restart handler
            if (dataHandlerRef.current) {
              dataHandlerRef.current.dispose();
              dataHandlerRef.current = null;
            }

            // Small delay to ensure cleanup is complete
            setTimeout(() => {
              console.log('[TerminalSession] Calling startPtySession to restart');
              startPtySession(term).catch(error => {
                console.error('[TerminalSession] Failed to restart shell:', error);
                term.writeln(`\r\n\x1b[1;31m[Failed to restart: ${error}]\x1b[0m`);
              });
            }, 100);
          }
        };

        // Add the restart handler
        dataHandlerRef.current = term.onData(restartHandler);
        console.log('[TerminalSession] Restart handler installed');
      });
      unlistenCloseRef.current = unlistenClose;

      isRestartingRef.current = false;

      // Note: We don't send an initial newline anymore
      // The shell automatically displays its prompt when it starts
      // Sending a newline would cause a duplicate prompt

    } catch (error) {
      term.writeln(`\x1b[1;31mFailed to start shell: ${error}\x1b[0m`);
      console.error('Failed to start PTY session:', error);
      isRestartingRef.current = false;
    }
  };



  return (
    <div className="w-full h-full bg-[#1e1e1e] relative">
      <div ref={terminalRef} className="w-full h-full" />

      {/* AutoComplete Popup */}
      <AutoComplete
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        onSelect={handleAutoCompleteSelect}
        position={autoCompletePosition}
        visible={autoCompleteVisible}
      />
    </div>
  );
};

