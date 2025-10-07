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
    term.onData((data) => {
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
      window.removeEventListener('resize', handleResize);

      // Close PTY session
      if (ptySessionIdRef.current) {
        invoke('close_pty_session', {
          sessionId: ptySessionIdRef.current,
        }).catch(error => {
          console.error('Failed to close PTY:', error);
        });
      }

      // Unlisten events
      if (unlistenDataRef.current) {
        unlistenDataRef.current();
      }
      if (unlistenCloseRef.current) {
        unlistenCloseRef.current();
      }

      term.dispose();
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

      // Write the selected command
      term.write(selectedCommand);
      currentInputRef.current = selectedCommand;

      // Send to PTY
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
    try {
      // Get default shell from backend
      const shell = await invoke<string>('get_default_shell');

      // Determine shell arguments based on platform and shell type
      const isWindows = navigator.platform.toLowerCase().includes('win');
      let args: string[] = [];

      if (!isWindows) {
        // For Unix-like systems, use interactive shell flags
        // -i for interactive, which loads .bashrc/.zshrc
        // Avoid -l (login shell) as it may cause issues in some environments
        if (shell.includes('bash')) {
          args = ['-i'];
        } else if (shell.includes('zsh')) {
          args = ['-i'];
        } else {
          args = ['-i'];
        }
      }

      // Start PTY session
      const ptyId = await invoke<string>('start_pty_session', {
        sessionId,
        command: shell,
        args,
        context: {
          cwd: currentDir === '~' ? null : currentDir,
          env: {},
        },
      });

      ptySessionIdRef.current = ptyId;

      // Listen for PTY data
      const unlistenData = await listen<string>(`pty-session-${ptyId}-data`, (event) => {
        term.write(event.payload);
      });
      unlistenDataRef.current = unlistenData;

      // Listen for PTY close
      const unlistenClose = await listen<number>(`pty-session-${ptyId}-close`, (event) => {
        console.log(`[TerminalSession] PTY session ${ptyId} closed with code: ${event.payload}`);

        // Clear the PTY session ID
        ptySessionIdRef.current = null;

        // Show exit message
        term.writeln(`\r\n\x1b[1;33m[Process exited with code ${event.payload}]\x1b[0m`);
        term.writeln(`\x1b[1;36m[Press Enter to restart shell]\x1b[0m`);

        // Set up restart handler
        let restartDisposable: any = null;
        const restartHandler = (data: string) => {
          // Check if Enter key was pressed
          if (data === '\r' || data === '\n') {
            term.write('\r\n');
            // Remove the restart handler
            if (restartDisposable) {
              restartDisposable.dispose();
            }
            // Restart the shell
            startPtySession(term);
          }
        };

        // Add the restart handler
        restartDisposable = term.onData(restartHandler);
      });
      unlistenCloseRef.current = unlistenClose;

    } catch (error) {
      term.writeln(`\x1b[1;31mFailed to start shell: ${error}\x1b[0m`);
      console.error('Failed to start PTY session:', error);
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

