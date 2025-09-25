/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format bytes per second to human readable string
 */
export function formatBytesPerSecond(bytesPerSecond: number, decimals: number = 1): string {
  return `${formatBytes(bytesPerSecond, decimals)}/s`;
}

/**
 * Format connection count
 */
export function formatConnectionCount(active: number, total: number): string {
  return `${active}/${total} 连接`;
}

/**
 * Format parsing success rate
 */
export function formatParsingRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/**
 * Format error count
 */
export function formatErrorCount(count: number): string {
  if (count === 0) return '无错误';
  return `${count} 错误`;
}

/**
 * Format time duration
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}天 ${hours % 24}小时`;
  } else if (hours > 0) {
    return `${hours}小时 ${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟 ${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * Format timestamp to readable string
 */
export function formatTimestamp(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, total: number, decimals: number = 1): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format storage size
 */
export function formatStorageSize(bytes: number): string {
  return formatBytes(bytes, 2);
}

/**
 * Format network latency
 */
export function formatLatency(milliseconds: number): string {
  if (milliseconds < 1) {
    return `${(milliseconds * 1000).toFixed(0)}μs`;
  } else if (milliseconds < 1000) {
    return `${milliseconds.toFixed(1)}ms`;
  } else {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }
}

/**
 * Format protocol name for display
 */
export function formatProtocolName(protocol: string): string {
  const protocolNames: Record<string, string> = {
    'tcp': 'TCP',
    'udp': 'UDP',
    'websocket': 'WebSocket',
    'mqtt': 'MQTT',
    'sse': 'SSE',
    'http': 'HTTP',
    'https': 'HTTPS',
  };

  return protocolNames[protocol.toLowerCase()] || protocol.toUpperCase();
}

/**
 * Format connection status for display
 */
export function formatConnectionStatus(status: string): string {
  const statusNames: Record<string, string> = {
    'connected': '已连接',
    'connecting': '连接中',
    'disconnected': '已断开',
    'error': '错误',
    'listening': '监听中',
  };

  return statusNames[status] || status;
}

/**
 * Format data size with appropriate unit
 */
export function formatDataSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} 字节`;
  }
  return formatBytes(bytes);
}

/**
 * Format session uptime
 */
export function formatUptime(startTime: Date): string {
  const now = new Date();
  const uptime = now.getTime() - startTime.getTime();
  return formatDuration(uptime);
}

/**
 * Format message count
 */
export function formatMessageCount(count: number): string {
  if (count === 0) return '无消息';
  if (count === 1) return '1 条消息';
  return `${formatNumber(count)} 条消息`;
}

/**
 * Format throughput rate with color coding
 */
export function formatThroughputWithColor(bytesPerSecond: number): {
  text: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
} {
  const text = formatBytesPerSecond(bytesPerSecond);
  
  let color: 'green' | 'yellow' | 'red' | 'gray' = 'gray';
  
  if (bytesPerSecond === 0) {
    color = 'gray';
  } else if (bytesPerSecond < 1024) { // < 1 KB/s
    color = 'green';
  } else if (bytesPerSecond < 1024 * 1024) { // < 1 MB/s
    color = 'yellow';
  } else {
    color = 'red';
  }

  return { text, color };
}

/**
 * Format parsing rate with color coding
 */
export function formatParsingRateWithColor(rate: number): {
  text: string;
  color: 'green' | 'yellow' | 'red';
} {
  const text = formatParsingRate(rate);
  
  let color: 'green' | 'yellow' | 'red' = 'green';
  
  if (rate >= 95) {
    color = 'green';
  } else if (rate >= 80) {
    color = 'yellow';
  } else {
    color = 'red';
  }

  return { text, color };
}
