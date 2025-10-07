// Enhanced ProtoShell Modal with Multi-Session Support
// Provides a fully-functional terminal shell with multiple sessions

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Terminal as TerminalIcon, History, Settings, Minus } from 'lucide-react';
import { cn } from '@/utils';
import { TerminalSession } from './TerminalSession';
import { sessionManager, SessionState } from '@/services/shell/SessionManager';
import { ConfirmationModal } from '@/components/Common/ConfirmationModal';
import { HistoryPanel } from './HistoryPanel';

interface EnhancedProtoShellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
}

export const EnhancedProtoShellModal: React.FC<EnhancedProtoShellModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
}) => {
  const [sessions, setSessions] = useState<SessionState[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Initialize session manager when first opened
  useEffect(() => {
    if (!isInitialized) {
      sessionManager.initialize().then(() => {
        setIsInitialized(true);
        updateSessions();
      });
    }
  }, [isInitialized]);

  // Cleanup when component unmounts (modal is truly closed, not just minimized)
  // This happens when activeModal changes from 'proto-shell' to null
  useEffect(() => {
    return () => {
      console.log('[EnhancedProtoShellModal] Component unmounting, resetting SessionManager');
      sessionManager.reset();
      setIsInitialized(false);
    };
  }, []);

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
      // Create and activate the new session in one call
      await sessionManager.createSession(undefined, true);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleCloseSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (sessions.length === 1) {
      setConfirmDialog({
        isOpen: true,
        title: '无法关闭',
        message: '不能关闭最后一个会话',
        type: 'info',
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: '关闭会话',
      message: '确定要关闭这个会话吗？',
      type: 'warning',
      onConfirm: async () => {
        try {
          await sessionManager.deleteSession(sessionId);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Failed to close session:', error);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleSwitchSession = (sessionId: string) => {
    sessionManager.setActiveSession(sessionId);
  };

  const handleClearHistory = async () => {
    if (!activeSessionId) return;

    setConfirmDialog({
      isOpen: true,
      title: '清除历史记录',
      message: '确定要清除当前会话的历史记录吗？',
      type: 'warning',
      onConfirm: async () => {
        try {
          await sessionManager.clearSessionHistory(activeSessionId);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Failed to clear history:', error);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleClearAllHistory = async () => {
    setConfirmDialog({
      isOpen: true,
      title: '清除所有历史记录',
      message: '确定要清除所有会话的历史记录吗？此操作不可恢复。',
      type: 'warning',
      onConfirm: async () => {
        try {
          await sessionManager.clearAllHistory();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Failed to clear all history:', error);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleCommandSelect = (command: string) => {
    setSelectedCommand(command);
    // Clear the selected command after a short delay to allow TerminalSession to process it
    setTimeout(() => setSelectedCommand(null), 100);
  };

  // Don't unmount when minimized, just hide
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
      !isOpen && "hidden"
    )}>
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
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Minimize to Status Bar"
              >
                <Minus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors"
              title="Close Terminal"
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

        {/* Session Tabs - Compact Design */}
        {isInitialized && (
          <>
            <div className="flex items-center space-x-1 px-2 py-1.5 border-b border-border bg-muted/20 overflow-x-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSwitchSession(session.id)}
                  className={cn(
                    'flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors group text-xs',
                    session.isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  <TerminalIcon className="w-3.5 h-3.5" />
                  <span className="font-medium whitespace-nowrap">{session.name}</span>
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
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors text-xs"
                title="New Session"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="font-medium">New</span>
              </button>
            </div>

            {/* Terminal Content and History Panel */}
            <div className="flex-1 overflow-hidden flex">
              {/* Terminal - Render all sessions but only show active one */}
              <div className={cn(
                "flex-1 overflow-hidden transition-all relative",
                showHistoryPanel ? "w-[calc(100%-320px)]" : "w-full"
              )}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "absolute inset-0",
                      session.id !== activeSessionId && "hidden"
                    )}
                  >
                    <TerminalSession
                      sessionId={session.id}
                      sessionName={session.name}
                      selectedCommand={session.id === activeSessionId ? selectedCommand : null}
                      isVisible={isOpen && session.id === activeSessionId}
                      onClose={() => {
                        if (sessions.length > 1) {
                          handleCloseSession(session.id, {} as React.MouseEvent);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* History Panel */}
              {showHistoryPanel && activeSessionId && (
                <div className="w-80 flex-shrink-0">
                  <HistoryPanel
                    sessionId={activeSessionId}
                    onCommandSelect={handleCommandSelect}
                  />
                </div>
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="确认"
        cancelText="取消"
      />
    </div>
  );
};

