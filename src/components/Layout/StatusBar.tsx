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
  Upload,
  Info,
  RefreshCw
} from 'lucide-react';
import { useLayoutConfig } from '@/hooks/useResponsive';
import { getVersionDisplayText } from '@/constants/version';
import { versionUpdateService, UpdateInfo } from '@/services/VersionUpdateService';
import { UpdateModal } from '@/components/UpdateModal';

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
  const layoutConfig = useLayoutConfig();
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
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update service listener
  useEffect(() => {
    const handleUpdateInfo = (info: UpdateInfo) => {
      setUpdateInfo(info);
      setStatus(prev => ({ ...prev, hasUpdates: info.hasUpdate }));
    };

    versionUpdateService.addUpdateListener(handleUpdateInfo);

    // Check for existing update info
    const currentInfo = versionUpdateService.getCurrentUpdateInfo();
    if (currentInfo) {
      setUpdateInfo(currentInfo);
      setStatus(prev => ({ ...prev, hasUpdates: currentInfo.hasUpdate }));
    }

    return () => {
      versionUpdateService.removeUpdateListener(handleUpdateInfo);
    };
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
      "h-5 bg-card border-t border-border flex items-center justify-between text-xs text-muted-foreground shrink-0",
      layoutConfig.isMobile ? "px-2" : "px-4",
      className
    )}>
      {/* Left Section */}
      <div className={cn(
        "flex items-center",
        layoutConfig.isMobile ? "space-x-2" : "space-x-4"
      )}>
        {/* Connection Status - 始终显示 */}
        <div className="flex items-center space-x-1">
          <ConnectionIcon className={cn("w-3 h-3", connectionStatus.color)} />
          <span className={layoutConfig.isMobile ? "hidden sm:inline" : ""}>
            {layoutConfig.isMobile ? `${status.connections.active}/${status.connections.total}` : connectionStatus.text}
          </span>
        </div>

        {/* Performance - 桌面和平板显示 */}
        {layoutConfig.statusBar.showEssentialInfo && (
          <div className="flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span>CPU: {status.performance.cpu}%</span>
            {!layoutConfig.isMobile && <span>内存: {status.performance.memory}%</span>}
          </div>
        )}

        {/* Throughput - 仅桌面显示 */}
        {layoutConfig.statusBar.showAllInfo && (
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
        )}

        {/* Parsing Status - 仅桌面显示 */}
        {layoutConfig.statusBar.showAllInfo && (
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
        )}
      </div>

      {/* Right Section */}
      <div className={cn(
        "flex items-center",
        layoutConfig.isMobile ? "space-x-2" : "space-x-4"
      )}>
        {/* Recording Status - 始终显示（如果正在录制） */}
        {status.recording && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {!layoutConfig.isMobile && <span>录制中</span>}
          </div>
        )}

        {/* Storage - 桌面和平板显示 */}
        {layoutConfig.statusBar.showEssentialInfo && (
          <div className="flex items-center space-x-1">
            <HardDrive className="w-3 h-3" />
            <span>
              {layoutConfig.isMobile
                ? status.storage.used
                : `存储: ${status.storage.used} / ${status.storage.available}`
              }
            </span>
          </div>
        )}

        {/* Updates - 仅桌面显示 */}
        {status.hasUpdates && layoutConfig.statusBar.showAllInfo && (
          <button
            onClick={() => setShowUpdateModal(true)}
            className="flex items-center space-x-1 hover:text-primary transition-colors group"
            title={updateInfo ? `发现新版本 ${updateInfo.latestVersion.raw}` : '有更新可用'}
          >
            <Download className="w-3 h-3 text-primary group-hover:animate-bounce" />
            <span className="text-primary font-medium">有更新</span>
            {updateInfo && (
              <span className="text-xs text-muted-foreground">
                v{updateInfo.latestVersion.major}.{updateInfo.latestVersion.minor}.{updateInfo.latestVersion.patch}
              </span>
            )}
          </button>
        )}

        {/* Ready Status - 始终显示 */}
        <div className="flex items-center space-x-1 text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>就绪</span>
        </div>

        {/* Version Info - 始终显示 */}
        <div className="flex items-center space-x-1 text-xs">
          <Info className="w-3 h-3" />
          <span>{getVersionDisplayText()}</span>
        </div>

        {/* Current Time - 始终显示 */}
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{currentTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            ...(layoutConfig.statusBar.showAllInfo && { second: '2-digit' })
          })}</span>
        </div>
      </div>

      {/* Update Modal */}
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        updateInfo={updateInfo}
      />
    </div>
  );
};
