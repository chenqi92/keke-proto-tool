// History Panel Component
// Displays command statistics grouped by command, ordered by execution count

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/utils';
import {
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Play,
  TrendingUp,
  Hash,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface CommandStats {
  command: string;
  count: number;
  last_used: number;
  success_count: number;
  failure_count: number;
  last_args: string; // JSON array
}

interface HistoryPanelProps {
  sessionId: string;
  onCommandSelect: (command: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  sessionId,
  onCommandSelect,
}) => {
  const [commandStats, setCommandStats] = useState<CommandStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    command: string;
  } | null>(null);

  // Load command statistics
  const loadCommandStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const stats = await invoke<CommandStats[]>('get_command_stats', {
        sessionId,
        limit: 100, // Show top 100 commands
      });

      setCommandStats(stats);
    } catch (error) {
      console.error('Failed to load command stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    loadCommandStats();
  }, [loadCommandStats]);

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, command: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      command,
    });
  };

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setContextMenu(null);
  };

  const handleExecuteCommand = (command: string) => {
    onCommandSelect(command);
    setContextMenu(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const formatTime = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: zhCN,
      });
    } catch {
      return '未知时间';
    }
  };

  const getSuccessRate = (stats: CommandStats) => {
    const total = stats.count;
    if (total === 0) return 0;
    return Math.round((stats.success_count / total) * 100);
  };

  // Build full command from command name and args
  const getFullCommand = (stats: CommandStats) => {
    try {
      const args = JSON.parse(stats.last_args || '[]');
      if (Array.isArray(args) && args.length > 0) {
        return `${stats.command} ${args.join(' ')}`;
      }
      return stats.command;
    } catch {
      return stats.command;
    }
  };

  return (
    <div className="w-full h-full bg-background border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">命令统计</h3>
        </div>
        <div className="text-xs text-muted-foreground">
          按执行次数排序
        </div>
      </div>

      {/* Command Stats List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Loading skeleton
          <div className="p-3 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : commandStats.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
            <Clock className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm text-center">还没有执行过任何命令</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {commandStats.map((stats, index) => {
              const successRate = getSuccessRate(stats);
              const fullCommand = getFullCommand(stats);
              return (
                <div
                  key={`${stats.command}-${index}`}
                  onClick={() => onCommandSelect(fullCommand)}
                  onContextMenu={(e) => handleContextMenu(e, fullCommand)}
                  className="px-2 py-1.5 rounded hover:bg-muted/70 cursor-pointer transition-colors group flex items-center justify-between"
                  title={fullCommand}
                >
                  {/* Command Name - show full command with args */}
                  <div className="font-mono text-sm truncate flex-1 mr-2">
                    {fullCommand}
                  </div>

                  {/* Compact Stats on the Right */}
                  <div className="flex items-center space-x-2 text-xs flex-shrink-0">
                    {/* Execution Count */}
                    <div className="flex items-center space-x-0.5 text-primary font-medium">
                      <Hash className="w-3 h-3" />
                      <span>{stats.count}</span>
                    </div>

                    {/* Success/Failure */}
                    <div className="flex items-center space-x-1">
                      <div className="flex items-center space-x-0.5 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>{stats.success_count}</span>
                      </div>
                      <div className="flex items-center space-x-0.5 text-red-600">
                        <XCircle className="w-3 h-3" />
                        <span>{stats.failure_count}</span>
                      </div>
                    </div>

                    {/* Success Rate Badge */}
                    <div className={cn(
                      "px-1.5 py-0.5 rounded text-xs font-medium min-w-[45px] text-center",
                      successRate >= 80 ? "bg-green-500/10 text-green-600" :
                      successRate >= 50 ? "bg-yellow-500/10 text-yellow-600" :
                      "bg-red-500/10 text-red-600"
                    )}>
                      {successRate}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-background border border-border rounded-md shadow-xl overflow-hidden z-50"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            onClick={() => handleCopyCommand(contextMenu.command)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center space-x-2"
          >
            <Copy className="w-4 h-4" />
            <span>复制命令</span>
          </button>
          <button
            onClick={() => handleExecuteCommand(contextMenu.command)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>重新执行</span>
          </button>
        </div>
      )}
    </div>
  );
};

