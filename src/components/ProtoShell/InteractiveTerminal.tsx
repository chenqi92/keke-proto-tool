// Interactive Terminal Component
// Provides a terminal interface for interactive commands

import React, { useEffect, useRef, useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/utils';
import { interactiveSessionManager, InteractiveSession } from '@/services/shell/InteractiveSession';

interface InteractiveTerminalProps {
  sessionId: string;
  onClose: () => void;
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({
  sessionId,
  onClose,
}) => {
  const [session, setSession] = useState<InteractiveSession | undefined>();
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Get session info
    const sessionInfo = interactiveSessionManager.getSession(sessionId);
    setSession(sessionInfo);
    
    // Focus input
    inputRef.current?.focus();
  }, [sessionId]);
  
  useEffect(() => {
    // Auto-scroll to bottom
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);
  
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (!input.trim()) return;
      
      // Add input to output
      setOutput((prev) => [...prev, `> ${input}`]);
      
      try {
        // Send to session
        await interactiveSessionManager.writeToSession(sessionId, input + '\n');
        setInput('');
      } catch (error) {
        setOutput((prev) => [
          ...prev,
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        ]);
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      // Ctrl+C - send interrupt signal
      e.preventDefault();
      try {
        await interactiveSessionManager.writeToSession(sessionId, '\x03');
      } catch (error) {
        console.error('Failed to send interrupt:', error);
      }
    }
  };
  
  const handleClose = async () => {
    try {
      await interactiveSessionManager.killSession(sessionId);
    } catch (error) {
      console.error('Failed to kill session:', error);
    }
    onClose();
  };
  
  return (
    <div
      className={cn(
        'fixed bg-background border border-border rounded-lg shadow-2xl flex flex-col',
        isMaximized
          ? 'inset-4'
          : 'bottom-4 right-4 w-[600px] h-[400px]'
      )}
      style={{ zIndex: 9999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="font-mono text-sm">
            {session?.command} {session?.args.join(' ')}
          </span>
          {session?.pid && (
            <span className="text-xs text-muted-foreground">
              (PID: {session.pid})
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 hover:bg-muted rounded"
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-black/5 dark:bg-black/20"
      >
        {output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>
      
      {/* Input */}
      <div className="flex items-center px-4 py-2 border-t border-border bg-muted/30">
        <span className="text-primary font-bold mr-2">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none font-mono text-sm"
          placeholder="Type command and press Enter..."
        />
      </div>
      
      {/* Status bar */}
      <div className="px-4 py-1 border-t border-border bg-muted/50 text-xs text-muted-foreground flex items-center justify-between">
        <span>
          State: <span className={cn(
            'font-semibold',
            session?.state === 'running' && 'text-green-500',
            session?.state === 'error' && 'text-red-500',
            session?.state === 'stopped' && 'text-gray-500'
          )}>
            {session?.state || 'unknown'}
          </span>
        </span>
        <span>
          Press Ctrl+C to interrupt, Ctrl+D to exit
        </span>
      </div>
    </div>
  );
};

/**
 * Interactive Terminal Manager Component
 * Manages multiple interactive terminal windows
 */
export const InteractiveTerminalManager: React.FC = () => {
  const [terminals, setTerminals] = useState<string[]>([]);
  
  useEffect(() => {
    // Listen for new sessions
    const checkSessions = setInterval(() => {
      const activeSessions = interactiveSessionManager.getActiveSessions();
      const sessionIds = activeSessions.map((s) => s.id);
      
      // Add new sessions
      for (const id of sessionIds) {
        if (!terminals.includes(id)) {
          setTerminals((prev) => [...prev, id]);
        }
      }
      
      // Remove closed sessions
      setTerminals((prev) =>
        prev.filter((id) => sessionIds.includes(id))
      );
    }, 1000);
    
    return () => clearInterval(checkSessions);
  }, [terminals]);
  
  const handleCloseTerminal = (sessionId: string) => {
    setTerminals((prev) => prev.filter((id) => id !== sessionId));
    interactiveSessionManager.cleanupSession(sessionId);
  };
  
  return (
    <>
      {terminals.map((sessionId) => (
        <InteractiveTerminal
          key={sessionId}
          sessionId={sessionId}
          onClose={() => handleCloseTerminal(sessionId)}
        />
      ))}
    </>
  );
};

