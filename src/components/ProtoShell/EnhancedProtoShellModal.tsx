// Enhanced ProtoShell Modal with Multi-Session Support
// Provides a fully-functional terminal shell with multiple sessions

import React, { useState, useEffect } from 'react';
import { X, Plus, Terminal as TerminalIcon, Trash2, History, Settings } from 'lucide-react';
import { cn } from '@/utils';
import { TerminalSession } from './TerminalSession';
import { sessionManager, SessionState } from '@/services/shell/SessionManager';

interface EnhancedProtoShellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnhancedProtoShellModal: React.FC<EnhancedProtoShellModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [sessions, setSessions] = useState<SessionState[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize session manager
  useEffect(() => {
    if (isOpen && !isInitialized) {
      sessionManager.initialize().then(() => {
        setIsInitialized(true);
        updateSessions();
      });
    }
  }, [isOpen, isInitialized]);

  // Subscribe to session changes
  useEffect(() => {
    const unsubscribe = sessionManager.subscribe(() => {
      updateSessions();
    });

    return unsubscribe;
  }, []);

  const updateSessions = () => {
    const allSessions = sessionManager.getAllSessions();
    setSessions(allSessions);
    
    const activeSession = sessionManager.getActiveSession();
    if (activeSession) {
      setActiveSessionId(activeSession.id);
    }
  };

  const handleCreateSession = async () => {
    try {
      const sessionId = await sessionManager.createSession();
      sessionManager.setActiveSession(sessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleCloseSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (sessions.length === 1) {
      alert('Cannot close the last session');
      return;
    }

    try {
      await sessionManager.deleteSession(sessionId);
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  };

  const handleSwitchSession = (sessionId: string) => {
    sessionManager.setActiveSession(sessionId);
  };

  const handleClearHistory = async () => {
    if (!activeSessionId) return;

    const confirmed = confirm('Are you sure you want to clear the history for this session?');
    if (!confirmed) return;

    try {
      await sessionManager.clearSessionHistory(activeSessionId);
      alert('History cleared successfully');
    } catch (error) {
      console.error('Failed to clear history:', error);
      alert('Failed to clear history');
    }
  };

  const handleClearAllHistory = async () => {
    const confirmed = confirm('Are you sure you want to clear ALL history from ALL sessions?');
    if (!confirmed) return;

    try {
      await sessionManager.clearAllHistory();
      alert('All history cleared successfully');
    } catch (error) {
      console.error('Failed to clear all history:', error);
      alert('Failed to clear all history');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[95vw] h-[90vh] bg-background border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-3">
            <TerminalIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">ProtoShell - Enhanced Terminal</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Toggle History Panel"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearHistory}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Clear Session History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {!isInitialized && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Initializing terminal...</p>
            </div>
          </div>
        )}

        {/* Session Tabs */}
        {isInitialized && (
          <>
            <div className="flex items-center space-x-1 px-2 py-2 border-b border-border bg-muted/20 overflow-x-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSwitchSession(session.id)}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group',
                    session.isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  <TerminalIcon className="w-4 h-4" />
                  <span className="text-sm font-medium whitespace-nowrap">{session.name}</span>
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => handleCloseSession(session.id, e)}
                      className={cn(
                        'p-1 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100',
                        session.isActive && 'opacity-100'
                      )}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={handleCreateSession}
                className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                title="New Session"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">New</span>
              </button>
            </div>

            {/* Terminal Content */}
            <div className="flex-1 overflow-hidden">
              {activeSessionId && (
                <TerminalSession
                  key={activeSessionId}
                  sessionId={activeSessionId}
                  sessionName={sessions.find(s => s.id === activeSessionId)?.name || 'Terminal'}
                  onClose={() => {
                    if (sessions.length > 1) {
                      handleCloseSession(activeSessionId, {} as React.MouseEvent);
                    }
                  }}
                />
              )}
            </div>
          </>
        )}

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Sessions: {sessions.length}</span>
            {activeSessionId && (
              <span>Active: {sessions.find(s => s.id === activeSessionId)?.name}</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearAllHistory}
              className="hover:text-destructive transition-colors"
              title="Clear All History"
            >
              Clear All History
            </button>
          </div>
        </div>
      </div>

      {/* History Panel (if needed) */}
      {showHistoryPanel && (
        <div className="fixed right-4 top-20 w-96 h-[70vh] bg-background border border-border rounded-lg shadow-xl p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Command History</h3>
            <button
              onClick={() => setShowHistoryPanel(false)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-muted-foreground">
            History panel - Coming soon
          </div>
        </div>
      )}
    </div>
  );
};

