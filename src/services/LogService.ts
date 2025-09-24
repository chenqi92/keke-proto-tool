import { EventEmitter } from '@/utils/EventEmitter';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  sessionId?: string;
  sessionName?: string;
  details?: any;
  // 扩展字段用于更详细的日志分类
  category?: 'network' | 'protocol' | 'system' | 'console' | 'message';
  direction?: 'in' | 'out';
  clientId?: string;
  protocol?: string;
  dataSize?: number;
  connectionType?: 'client' | 'server';
}

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

interface LogServiceEvents {
  'log-added': LogEntry;
  'logs-cleared': void;
}

class LogService extends EventEmitter<LogServiceEvents> {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private logIdCounter = 1;

  constructor() {
    super();
    this.initializeLogging();
  }

  private initializeLogging() {
    // Override console methods to capture logs
    this.interceptConsole();
    
    // Add some initial logs for testing
    this.addLog('info', 'LogService', 'Log service initialized');
  }

  private interceptConsole() {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    // Intercept console.log
    console.log = (...args: any[]) => {
      originalConsole.log(...args);
      this.addLog('info', 'Console', this.formatConsoleMessage(args));
    };

    // Intercept console.info
    console.info = (...args: any[]) => {
      originalConsole.info(...args);
      this.addLog('info', 'Console', this.formatConsoleMessage(args));
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      originalConsole.warn(...args);
      this.addLog('warning', 'Console', this.formatConsoleMessage(args));
    };

    // Intercept console.error
    console.error = (...args: any[]) => {
      originalConsole.error(...args);
      this.addLog('error', 'Console', this.formatConsoleMessage(args));
    };

    // Intercept console.debug
    console.debug = (...args: any[]) => {
      originalConsole.debug(...args);
      this.addLog('debug', 'Console', this.formatConsoleMessage(args));
    };
  }

  private formatConsoleMessage(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  /**
   * Add a log entry
   */
  addLog(
    level: LogLevel,
    source: string,
    message: string,
    sessionId?: string,
    sessionName?: string,
    details?: any,
    options?: {
      category?: LogEntry['category'];
      direction?: LogEntry['direction'];
      clientId?: string;
      protocol?: string;
      dataSize?: number;
      connectionType?: LogEntry['connectionType'];
    }
  ): void {
    const logEntry: LogEntry = {
      id: `log_${this.logIdCounter++}`,
      timestamp: new Date(),
      level,
      source,
      message,
      sessionId,
      sessionName,
      details,
      ...options
    };

    this.logs.push(logEntry);

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Emit event
    this.emit('log-added', logEntry);
  }

  /**
   * Log network events
   */
  logNetworkEvent(
    sessionId: string,
    sessionName: string,
    event: string,
    details?: any
  ): void {
    let level: LogLevel = 'info';
    let message = '';
    let category: LogEntry['category'] = 'network';
    let direction: LogEntry['direction'] | undefined;

    switch (event) {
      case 'connected':
        message = details?.clientId
          ? `客户端 ${details.clientId} 连接成功`
          : `连接建立成功`;
        level = 'info';
        break;
      case 'disconnected':
        message = details?.clientId
          ? `客户端 ${details.clientId} 断开连接`
          : `连接断开`;
        level = 'warning';
        break;
      case 'message_sent':
        message = details?.clientId
          ? `向客户端 ${details.clientId} 发送消息 (${details.size || 0} bytes)`
          : `发送消息 (${details.size || 0} bytes)`;
        level = 'info';
        category = 'message';
        direction = 'out';
        break;
      case 'message_received':
        message = details?.clientId
          ? `从客户端 ${details.clientId} 接收消息 (${details.size || 0} bytes)`
          : `接收消息 (${details.size || 0} bytes)`;
        level = 'info';
        category = 'message';
        direction = 'in';
        break;
      case 'connection_error':
        message = details?.clientId
          ? `客户端 ${details.clientId} 连接错误: ${details?.error || '未知错误'}`
          : `连接错误: ${details?.error || '未知错误'}`;
        level = 'error';
        break;
      case 'connection_timeout':
        message = `连接超时`;
        level = 'error';
        break;
      default:
        message = `网络事件: ${event}`;
        level = 'debug';
    }

    this.addLog(level, sessionName, message, sessionId, sessionName, details, {
      category,
      direction,
      clientId: details?.clientId,
      protocol: details?.protocol,
      dataSize: details?.size,
      connectionType: details?.connectionType
    });
  }

  /**
   * Log protocol parsing events
   */
  logProtocolEvent(
    sessionId: string,
    sessionName: string,
    success: boolean,
    protocol: string,
    details?: any
  ): void {
    const level: LogLevel = success ? 'info' : 'error';
    const message = success
      ? `协议解析成功 (${protocol})`
      : `协议解析失败 (${protocol}): ${details?.error || '未知错误'}`;

    this.addLog(level, 'Protocol Parser', message, sessionId, sessionName, details, {
      category: 'protocol',
      protocol,
      dataSize: details?.dataSize
    });
  }

  /**
   * Get all logs
   */
  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by criteria
   */
  getFilteredLogs(filters: {
    sessionId?: string;
    level?: LogLevel;
    source?: string;
    category?: LogEntry['category'];
    timeRange?: 'all' | 'today' | '24h' | '7d' | '30d';
    searchQuery?: string;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    // Filter by session
    if (filters.sessionId) {
      filteredLogs = filteredLogs.filter(log => 
        log.sessionId === filters.sessionId ||
        log.sessionName?.toLowerCase().includes(filters.sessionId.toLowerCase())
      );
    }

    // Filter by level
    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    // Filter by source
    if (filters.source) {
      filteredLogs = filteredLogs.filter(log => log.source === filters.source);
    }

    // Filter by category
    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }

    // Filter by time range
    if (filters.timeRange && filters.timeRange !== 'all') {
      const now = new Date();
      filteredLogs = filteredLogs.filter(log => {
        const logTime = log.timestamp;
        switch (filters.timeRange) {
          case 'today':
            return logTime.toDateString() === now.toDateString();
          case '24h':
            return (now.getTime() - logTime.getTime()) <= 24 * 60 * 60 * 1000;
          case '7d':
            return (now.getTime() - logTime.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          case '30d':
            return (now.getTime() - logTime.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query) ||
        (log.sessionName && log.sessionName.toLowerCase().includes(query))
      );
    }

    return filteredLogs;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.emit('logs-cleared');
  }

  /**
   * Get log statistics
   */
  getLogStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    bySources: Record<string, number>;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        info: 0,
        warning: 0,
        error: 0,
        debug: 0
      } as Record<LogLevel, number>,
      bySources: {} as Record<string, number>
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.bySources[log.source] = (stats.bySources[log.source] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const logService = new LogService();
