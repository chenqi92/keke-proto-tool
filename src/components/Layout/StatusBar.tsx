import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  HardDrive, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Download,
  Upload
} from 'lucide-react';

interface StatusBarProps {
  className?: string;
}

interface StatusInfo {
  connections: {
    active: number;
    total: number;
  };
  performance: {
    cpu: number;
    memory: number;
    throughput: {
      rx: number;
      tx: number;
    };
  };
  parsing: {
    success: number;
    error: number;
    rate: number;
  };
  storage: {
    used: string;
    available: string;
  };
  recording: boolean;
  hasUpdates: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ className }) => {
  const [status, setStatus] = useState<StatusInfo>({
    connections: { active: 2, total: 5 },
    performance: { 
      cpu: 15, 
      memory: 45, 
      throughput: { rx: 1024, tx: 512 } 
    },
    parsing: { success: 1250, error: 3, rate: 99.8 },
    storage: { used: '2.3 GB', available: '15.7 GB' },
    recording: false,
    hasUpdates: false
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatThroughput = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const getConnectionStatus = () => {
    if (status.connections.active === 0) {
      return { icon: WifiOff, color: 'text-muted-foreground', text: '未连接' };
    }
    return { 
      icon: Wifi, 
      color: 'text-green-500', 
      text: `${status.connections.active}/${status.connections.total} 连接` 
    };
  };

  const connectionStatus = getConnectionStatus();
  const ConnectionIcon = connectionStatus.icon;

  return (
    <div className={cn(
      "h-6 bg-card border-t border-border flex items-center justify-between px-4 text-xs text-muted-foreground",
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          <ConnectionIcon className={cn("w-3 h-3", connectionStatus.color)} />
          <span>{connectionStatus.text}</span>
        </div>

        {/* Performance */}
        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3" />
          <span>CPU: {status.performance.cpu}%</span>
          <span>内存: {status.performance.memory}%</span>
        </div>

        {/* Throughput */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Download className="w-3 h-3 text-blue-500" />
            <span>{formatThroughput(status.performance.throughput.rx)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Upload className="w-3 h-3 text-green-500" />
            <span>{formatThroughput(status.performance.throughput.tx)}</span>
          </div>
        </div>

        {/* Parsing Status */}
        <div className="flex items-center space-x-1">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span>解析成功率: {status.parsing.rate}%</span>
          {status.parsing.error > 0 && (
            <>
              <AlertCircle className="w-3 h-3 text-yellow-500" />
              <span>{status.parsing.error} 错误</span>
            </>
          )}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Recording Status */}
        {status.recording && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>录制中</span>
          </div>
        )}

        {/* Storage */}
        <div className="flex items-center space-x-1">
          <HardDrive className="w-3 h-3" />
          <span>存储: {status.storage.used} / {status.storage.available}</span>
        </div>

        {/* Updates */}
        {status.hasUpdates && (
          <button className="flex items-center space-x-1 hover:text-foreground transition-colors">
            <Download className="w-3 h-3" />
            <span>有更新</span>
          </button>
        )}

        {/* Current Time */}
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{currentTime.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
