import { EventEmitter } from '@/utils/EventEmitter';
import { safeTauriInvoke } from '@/utils/tauri';

// 与后端LogEntry结构匹配的接口
export interface BackendLogEntry {
  id: string;
  timestamp: string; // ISO string from backend
  level: 'Info' | 'Warning' | 'Error' | 'Debug';
  source: string;
  message: string;
  session_id?: string;
  session_name?: string;
  details?: any;
  category?: 'Network' | 'Protocol' | 'System' | 'Console' | 'Message';
  direction?: 'In' | 'Out';
  client_id?: string;
  protocol?: string;
  data_size?: number;
  connection_type?: 'Client' | 'Server';
}

// 前端兼容的LogEntry接口
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  sessionId?: string;
  sessionName?: string;
  details?: any;
  category?: 'network' | 'protocol' | 'system' | 'console' | 'message';
  direction?: 'in' | 'out';
  clientId?: string;
  protocol?: string;
  dataSize?: number;
  connectionType?: 'client' | 'server';
}

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

interface BackendLogServiceEvents {
  'log-added': LogEntry;
  'logs-cleared': void;
  'logs-exported': { count: number; format: string; path: string };
}

class BackendLogService extends EventEmitter<BackendLogServiceEvents> {
  private pollingInterval: number = 1000; // 1 second
  private isPolling: boolean = false;
  private lastLogCount: number = 0;

  constructor() {
    super();
    this.startPolling();
  }

  /**
   * 转换后端LogEntry到前端格式
   */
  private convertBackendLogEntry(backendEntry: BackendLogEntry): LogEntry {
    return {
      id: backendEntry.id,
      timestamp: new Date(backendEntry.timestamp),
      level: backendEntry.level.toLowerCase() as LogLevel,
      source: backendEntry.source,
      message: backendEntry.message,
      sessionId: backendEntry.session_id,
      sessionName: backendEntry.session_name,
      details: backendEntry.details,
      category: backendEntry.category?.toLowerCase() as LogEntry['category'],
      direction: backendEntry.direction?.toLowerCase() as LogEntry['direction'],
      clientId: backendEntry.client_id,
      protocol: backendEntry.protocol,
      dataSize: backendEntry.data_size,
      connectionType: backendEntry.connection_type?.toLowerCase() as LogEntry['connectionType'],
    };
  }

  /**
   * 开始轮询检查新日志
   */
  private startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.pollForNewLogs();
  }

  /**
   * 轮询新日志
   */
  private async pollForNewLogs() {
    if (!this.isPolling) return;

    try {
      const stats = await this.getLogStats();
      if (stats.total > this.lastLogCount) {
        // 有新日志，触发事件
        const newLogsCount = stats.total - this.lastLogCount;
        this.lastLogCount = stats.total;
        
        // 获取最新的日志条目
        const recentLogs = await this.getLogs({
          limit: newLogsCount,
          offset: 0,
        });

        // 为每个新日志触发事件
        recentLogs.forEach(log => {
          this.emit('log-added', log);
        });
      }
    } catch (error) {
      console.error('Error polling for new logs:', error);
    }

    // 继续轮询
    setTimeout(() => this.pollForNewLogs(), this.pollingInterval);
  }

  /**
   * 停止轮询
   */
  public stopPolling() {
    this.isPolling = false;
  }

  /**
   * 添加日志条目
   */
  async addLog(
    level: LogLevel,
    source: string,
    message: string,
    sessionId?: string,
    sessionName?: string,
    options?: {
      category?: LogEntry['category'];
      direction?: LogEntry['direction'];
      clientId?: string;
      protocol?: string;
      dataSize?: number;
      connectionType?: LogEntry['connectionType'];
      details?: any;
    }
  ): Promise<void> {
    try {
      await safeTauriInvoke<void>('add_log_entry', {
        level,
        source,
        message,
        sessionId,
        sessionName,
        category: options?.category,
        direction: options?.direction,
        clientId: options?.clientId,
        protocol: options?.protocol,
        dataSize: options?.dataSize,
        connectionType: options?.connectionType,
        details: options?.details,
      });
    } catch (error) {
      console.error('Failed to add log entry:', error);
      throw error;
    }
  }

  /**
   * 获取日志列表
   */
  async getLogs(filters?: {
    sessionId?: string;
    level?: LogLevel;
    category?: LogEntry['category'];
    timeRange?: 'all' | 'today' | '24h' | '7d' | '30d';
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }): Promise<LogEntry[]> {
    try {
      const backendLogs: BackendLogEntry[] | null = await safeTauriInvoke<BackendLogEntry[]>('get_logs', {
        sessionId: filters?.sessionId,
        level: filters?.level,
        category: filters?.category,
        timeRange: filters?.timeRange || 'all',
        searchQuery: filters?.searchQuery,
        limit: filters?.limit || 1000,
        offset: filters?.offset || 0,
      });

      if (!backendLogs) {
        console.warn('Failed to get logs from backend');
        return [];
      }

      return backendLogs.map(log => this.convertBackendLogEntry(log));
    } catch (error) {
      console.error('Failed to get logs:', error);
      throw error;
    }
  }

  /**
   * 导出日志
   */
  async exportLogs(
    filters: {
      sessionId?: string;
      level?: LogLevel;
      category?: LogEntry['category'];
      timeRange?: 'all' | 'today' | '24h' | '7d' | '30d';
      searchQuery?: string;
    },
    format: 'json' | 'csv' | 'md' = 'json',
    outputDir?: string,
    customFilename?: string
  ): Promise<string> {
    try {
      const exportPath: string | null = await safeTauriInvoke<string>('export_logs', {
        sessionId: filters.sessionId,
        level: filters.level,
        category: filters.category,
        timeRange: filters.timeRange || 'all',
        searchQuery: filters.searchQuery,
        format,
        outputDir,
        customFilename,
      });

      if (!exportPath) {
        throw new Error('Failed to export logs: No path returned from backend');
      }

      // 获取导出的日志数量
      const logs = await this.getLogs(filters);
      this.emit('logs-exported', {
        count: logs.length,
        format,
        path: exportPath
      });

      return exportPath;
    } catch (error) {
      console.error('Failed to export logs:', error);
      throw error;
    }
  }

  /**
   * 清理所有日志
   */
  async clearLogs(): Promise<void> {
    try {
      await safeTauriInvoke<void>('clear_logs');
      this.lastLogCount = 0;
      this.emit('logs-cleared', undefined);
    } catch (error) {
      console.error('Failed to clear logs:', error);
      throw error;
    }
  }

  /**
   * 获取日志统计信息
   */
  async getLogStats(): Promise<{ total: number; byLevel: Record<string, number> }> {
    try {
      const stats = await safeTauriInvoke<{ total: number; byLevel: Record<string, number> }>('get_log_stats');
      if (!stats) {
        console.warn('Failed to get log stats from backend');
        return { total: 0, byLevel: {} };
      }
      return stats as { total: number; byLevel: Record<string, number> };
    } catch (error) {
      console.error('Failed to get log stats:', error);
      throw error;
    }
  }

  /**
   * 记录网络事件
   */
  async logNetworkEvent(
    sessionId: string,
    sessionName: string,
    eventType: string,
    details?: {
      clientId?: string;
      protocol?: string;
      dataSize?: number;
      error?: string;
    }
  ): Promise<void> {
    try {
      await safeTauriInvoke<void>('log_network_event', {
        sessionId,
        sessionName,
        eventType,
        clientId: details?.clientId,
        protocol: details?.protocol,
        dataSize: details?.dataSize,
      });
    } catch (error) {
      console.error('Failed to log network event:', error);
      throw error;
    }
  }

  /**
   * 兼容前端LogService的过滤方法
   */
  getFilteredLogs(filters: {
    sessionId?: string;
    level?: LogLevel;
    category?: LogEntry['category'];
    timeRange?: 'all' | 'today' | '24h' | '7d' | '30d';
    searchQuery?: string;
  }): Promise<LogEntry[]> {
    return this.getLogs(filters);
  }

  /**
   * 兼容前端LogService的获取所有日志方法
   */
  async getAllLogs(): Promise<LogEntry[]> {
    return this.getLogs({ limit: 10000 });
  }
}

// 导出单例实例
export const backendLogService = new BackendLogService();
