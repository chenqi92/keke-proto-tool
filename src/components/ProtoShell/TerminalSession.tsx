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
  const ptySessionIdRef = useRef<string | null>(null);
  const unlistenDataRef = useRef<(() => void) | null>(null);
  const unlistenCloseRef = useRef<(() => void) | null>(null);

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
    term.writeln('Starting interactive shell...');
    term.writeln('');

    setIsReady(true);

    // Start PTY session
    startPtySession(term);

    // Handle terminal input - send directly to PTY
    term.onData((data) => {
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

  const startPtySession = async (term: Terminal) => {
    try {
      // Determine shell command based on OS
      const shell = navigator.platform.toLowerCase().includes('win') ? 'cmd.exe' : 'bash';
      const args: string[] = [];

      // Start PTY session
      const ptyId = await invoke<string>('start_pty_session', {
        sessionId: sessionId,
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
        term.writeln(`\r\n\x1b[1;33mSession closed with code: ${event.payload}\x1b[0m`);
        onClose?.();
      });
      unlistenCloseRef.current = unlistenClose;

    } catch (error) {
      term.writeln(`\x1b[1;31mFailed to start shell: ${error}\x1b[0m`);
      console.error('Failed to start PTY session:', error);
    }
  };



  return (
    <div className="w-full h-full bg-[#1e1e1e]">
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
};

