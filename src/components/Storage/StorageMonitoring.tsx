import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import {
  Activity,
  Database,
  Server,
  HardDrive,
  Cloud,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';

interface ConnectionMetrics {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  responseTime: number;
  throughput: number;
  errorRate: number;
  totalQueries: number;
  activeConnections: number;
  lastActivity: Date;
  uptime: number;
}

interface SystemMetrics {
  totalConnections: number;
  activeConnections: number;
  totalQueries: number;
  avgResponseTime: number;
  totalErrors: number;
  dataStored: number;
  storageUsed: number;
  memoryUsage: number;
}

export const StorageMonitoring: React.FC = () => {
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics[]>([
    {
      id: 'conn_1',
      name: 'Production MySQL',
      type: 'mysql8',
      status: 'connected',
      responseTime: 45,
      throughput: 1250,
      errorRate: 0.02,
      totalQueries: 15420,
      activeConnections: 8,
      lastActivity: new Date(Date.now() - 30000),
      uptime: 99.8
    },
    {
      id: 'conn_2',
      name: 'Metrics InfluxDB',
      type: 'influxdb',
      status: 'connected',
      responseTime: 23,
      throughput: 890,
      errorRate: 0.01,
      totalQueries: 8930,
      activeConnections: 3,
      lastActivity: new Date(Date.now() - 5000),
      uptime: 99.9
    },
    {
      id: 'conn_3',
      name: 'Cache Redis',
      type: 'redis',
      status: 'error',
      responseTime: 0,
      throughput: 0,
      errorRate: 1.0,
      totalQueries: 0,
      activeConnections: 0,
      lastActivity: new Date(Date.now() - 300000),
      uptime: 0
    }
  ]);

  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalConnections: 3,
    activeConnections: 2,
    totalQueries: 24350,
    avgResponseTime: 34,
    totalErrors: 12,
    dataStored: 2.4, // GB
    storageUsed: 68.5, // %
    memoryUsage: 45.2 // %
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionMetrics(prev => prev.map(conn => ({
        ...conn,
        responseTime: conn.status === 'connected' ? Math.max(10, conn.responseTime + (Math.random() - 0.5) * 10) : 0,
        throughput: conn.status === 'connected' ? Math.max(0, conn.throughput + (Math.random() - 0.5) * 100) : 0,
        totalQueries: conn.status === 'connected' ? conn.totalQueries + Math.floor(Math.random() * 10) : conn.totalQueries,
        lastActivity: conn.status === 'connected' ? new Date() : conn.lastActivity
      })));

      setSystemMetrics(prev => ({
        ...prev,
        totalQueries: prev.totalQueries + Math.floor(Math.random() * 20),
        avgResponseTime: Math.max(10, prev.avgResponseTime + (Math.random() - 0.5) * 5),
        memoryUsage: Math.max(20, Math.min(80, prev.memoryUsage + (Math.random() - 0.5) * 2))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">存储监控</h2>
              <p className="text-sm text-muted-foreground">监控数据库连接状态和性能指标</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="1h">最近 1 小时</option>
              <option value="6h">最近 6 小时</option>
              <option value="24h">最近 24 小时</option>
              <option value="7d">最近 7 天</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">活跃连接</span>
              <Wifi className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold">{systemMetrics.activeConnections}</div>
            <div className="text-xs text-muted-foreground">
              共 {systemMetrics.totalConnections} 个连接
            </div>
          </div>

          <div className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">总查询数</span>
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{systemMetrics.totalQueries.toLocaleString()}</div>
            <div className="text-xs text-green-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% 较昨日
            </div>
          </div>

          <div className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">平均响应时间</span>
              <Zap className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold">{systemMetrics.avgResponseTime.toFixed(0)}ms</div>
            <div className="text-xs text-green-600 flex items-center">
              <TrendingDown className="w-3 h-3 mr-1" />
              -5ms 较昨日
            </div>
          </div>

          <div className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">存储使用率</span>
              <HardDrive className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold">{systemMetrics.storageUsed.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              {systemMetrics.dataStored.toFixed(1)} GB 已使用
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">连接状态</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {connectionMetrics.map((conn) => (
              <div key={conn.id} className="bg-background border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{conn.name}</span>
                  </div>
                  <div className={cn("flex items-center space-x-1 px-2 py-1 rounded-full text-xs", getStatusColor(conn.status))}>
                    {getStatusIcon(conn.status)}
                    <span>{conn.status === 'connected' ? '已连接' : conn.status === 'error' ? '错误' : '断开'}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">响应时间:</span>
                    <span className="font-medium">{conn.responseTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">吞吐量:</span>
                    <span className="font-medium">{conn.throughput.toFixed(0)} ops/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">错误率:</span>
                    <span className={cn("font-medium", conn.errorRate > 0.1 ? "text-red-600" : "text-green-600")}>
                      {(conn.errorRate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">活跃连接:</span>
                    <span className="font-medium">{conn.activeConnections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">最后活动:</span>
                    <span className="font-medium">{formatDuration(Date.now() - conn.lastActivity.getTime())} 前</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">可用性:</span>
                    <span className={cn("font-medium", conn.uptime > 99 ? "text-green-600" : "text-yellow-600")}>
                      {conn.uptime.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Charts Placeholder */}
        <div>
          <h3 className="text-lg font-semibold mb-4">性能趋势</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-background border border-border rounded-lg p-6">
              <h4 className="font-medium mb-4">响应时间趋势</h4>
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>图表组件开发中...</p>
                </div>
              </div>
            </div>
            <div className="bg-background border border-border rounded-lg p-6">
              <h4 className="font-medium mb-4">吞吐量分布</h4>
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>图表组件开发中...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
