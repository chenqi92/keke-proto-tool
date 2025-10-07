// Terminal Session Component
// Provides a full-featured terminal using xterm.js

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface TerminalSessionProps {
  sessionId: string;
  sessionName: string;
  onClose?: () => void;
  onTitleChange?: (title: string) => void;
}

export const TerminalSession: React.FC<TerminalSessionProps> = ({
  sessionId,
  sessionName,
  onClose,
  onTitleChange,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [currentDir, setCurrentDir] = useState('~');
  const [isReady, setIsReady] = useState(false);
  const inputBufferRef = useRef<string>('');
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

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

    // Welcome message
    term.writeln(`\x1b[1;32mProtoShell Terminal - ${sessionName}\x1b[0m`);
    term.writeln('Type commands and press Enter to execute.');
    term.writeln('');
    writePrompt(term);

    setIsReady(true);

    // Handle terminal input
    term.onData((data) => {
      handleTerminalInput(data, term);
    });

    // Handle window resize
    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch (error) {
        console.error('Failed to fit terminal on resize:', error);
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [sessionId, sessionName]);

  const writePrompt = (term: Terminal) => {
    term.write(`\r\n\x1b[1;36m${currentDir}\x1b[0m \x1b[1;32m❯\x1b[0m `);
  };

  const handleTerminalInput = (data: string, term: Terminal) => {
    const code = data.charCodeAt(0);

    // Handle special keys
    if (code === 13) {
      // Enter key
      const command = inputBufferRef.current.trim();
      term.write('\r\n');
      
      if (command) {
        // Add to history
        commandHistoryRef.current.push(command);
        historyIndexRef.current = -1;
        
        // Execute command
        executeCommand(command, term);
      } else {
        writePrompt(term);
      }
      
      inputBufferRef.current = '';
    } else if (code === 127) {
      // Backspace
      if (inputBufferRef.current.length > 0) {
        inputBufferRef.current = inputBufferRef.current.slice(0, -1);
        term.write('\b \b');
      }
    } else if (code === 3) {
      // Ctrl+C
      term.write('^C');
      inputBufferRef.current = '';
      writePrompt(term);
    } else if (code === 12) {
      // Ctrl+L - Clear screen
      term.clear();
      writePrompt(term);
    } else if (code === 27) {
      // Escape sequences (arrow keys, etc.)
      if (data === '\x1b[A') {
        // Up arrow - previous command
        if (commandHistoryRef.current.length > 0) {
          if (historyIndexRef.current === -1) {
            historyIndexRef.current = commandHistoryRef.current.length - 1;
          } else if (historyIndexRef.current > 0) {
            historyIndexRef.current--;
          }
          
          // Clear current line
          term.write('\r\x1b[K');
          writePrompt(term);
          
          // Write history command
          const cmd = commandHistoryRef.current[historyIndexRef.current];
          term.write(cmd);
          inputBufferRef.current = cmd;
        }
      } else if (data === '\x1b[B') {
        // Down arrow - next command
        if (historyIndexRef.current !== -1) {
          historyIndexRef.current++;
          
          // Clear current line
          term.write('\r\x1b[K');
          writePrompt(term);
          
          if (historyIndexRef.current < commandHistoryRef.current.length) {
            const cmd = commandHistoryRef.current[historyIndexRef.current];
            term.write(cmd);
            inputBufferRef.current = cmd;
          } else {
            historyIndexRef.current = -1;
            inputBufferRef.current = '';
          }
        }
      }
    } else if (code >= 32 && code <= 126) {
      // Printable characters
      inputBufferRef.current += data;
      term.write(data);
    }
  };

  const executeCommand = async (command: string, term: Terminal) => {
    try {
      // Handle built-in commands
      if (command === 'clear') {
        term.clear();
        writePrompt(term);
        return;
      }

      if (command === 'exit') {
        term.writeln('\x1b[1;33mClosing session...\x1b[0m');
        onClose?.();
        return;
      }

      // Save to database
      await saveCommandToHistory(command);

      // Execute command via backend
      const result = await invoke<{
        success: boolean;
        output: string;
        error?: string;
        exitCode: number;
        executionTime: number;
      }>('execute_system_command', {
        context: {
          cwd: currentDir === '~' ? null : currentDir,
          env: {},
        },
        command,
        args: [],
      });

      // Display output
      if (result.output) {
        term.writeln(result.output);
      }

      if (result.error) {
        term.writeln(`\x1b[1;31m${result.error}\x1b[0m`);
      }

      // Update current directory if cd command
      if (command.startsWith('cd ')) {
        const newDir = command.substring(3).trim();
        if (newDir) {
          setCurrentDir(newDir);
        }
      }

      writePrompt(term);
    } catch (error) {
      term.writeln(`\x1b[1;31mError: ${error}\x1b[0m`);
      writePrompt(term);
    }
  };

  const saveCommandToHistory = async (command: string) => {
    try {
      const timestamp = Date.now();
      await invoke('add_shell_history', {
        item: {
          id: `${sessionId}-${timestamp}`,
          session_id: sessionId,
          command,
          args: JSON.stringify([]),
          timestamp,
          cwd: currentDir,
          exit_code: 0,
          execution_time: 0,
          output: null,
          error: null,
        },
      });
    } catch (error) {
      console.error('Failed to save command to history:', error);
    }
  };

  return (
    <div className="w-full h-full bg-[#1e1e1e]">
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
};

