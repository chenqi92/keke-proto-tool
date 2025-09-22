/**
 * Update Notification Component
 * Non-intrusive notification for available updates
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { 
  Download, 
  X, 
  Clock, 
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { versionUpdateService, UpdateInfo } from '@/services/VersionUpdateService';
import { formatVersionForDisplay } from '@/utils/version';

interface UpdateNotificationProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  className,
  position = 'top-right',
  autoHide = false,
  autoHideDelay = 10000,
}) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPostponed, setIsPostponed] = useState(false);

  useEffect(() => {
    const handleUpdateInfo = (info: UpdateInfo) => {
      if (info.hasUpdate && !isDismissed && !isPostponed) {
        setUpdateInfo(info);
        setIsVisible(true);
      }
    };

    versionUpdateService.addUpdateListener(handleUpdateInfo);

    // Check for existing update info
    const currentInfo = versionUpdateService.getCurrentUpdateInfo();
    if (currentInfo?.hasUpdate && !isDismissed && !isPostponed) {
      setUpdateInfo(currentInfo);
      setIsVisible(true);
    }

    return () => {
      versionUpdateService.removeUpdateListener(handleUpdateInfo);
    };
  }, [isDismissed, isPostponed]);

  useEffect(() => {
    if (isVisible && autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHide, autoHideDelay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  const handlePostpone = () => {
    setIsVisible(false);
    setIsPostponed(true);
    
    // Reset postpone after 24 hours
    setTimeout(() => {
      setIsPostponed(false);
    }, 24 * 60 * 60 * 1000);
  };

  const handleDownload = () => {
    if (updateInfo?.releaseInfo) {
      const downloadUrl = versionUpdateService.getDownloadUrl(updateInfo.releaseInfo);
      window.open(downloadUrl, '_blank');
    }
  };

  const getUpdateTypeColor = (updateType: string) => {
    switch (updateType) {
      case 'major':
        return 'text-red-600 dark:text-red-400';
      case 'minor':
        return 'text-blue-600 dark:text-blue-400';
      case 'patch':
        return 'text-green-600 dark:text-green-400';
      case 'prerelease':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getUpdateTypeLabel = (updateType: string) => {
    switch (updateType) {
      case 'major':
        return '重大更新';
      case 'minor':
        return '功能更新';
      case 'patch':
        return '修复更新';
      case 'prerelease':
        return '预发布版本';
      default:
        return '更新';
    }
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (!isVisible || !updateInfo?.hasUpdate) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed z-50 w-80 bg-card border border-border rounded-lg shadow-lg p-4',
        'animate-in slide-in-from-top-2 duration-300',
        positionClasses[position],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">发现新版本</h3>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-accent rounded-md transition-colors"
          aria-label="关闭通知"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Version Info */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">当前版本:</span>
          <span className="font-mono">
            {formatVersionForDisplay(updateInfo.currentVersion)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">最新版本:</span>
          <span className={cn(
            "font-mono font-semibold",
            getUpdateTypeColor(updateInfo.updateType)
          )}>
            {formatVersionForDisplay(updateInfo.latestVersion)}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className={cn(
            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
            updateInfo.updateType === 'major' && "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
            updateInfo.updateType === 'minor' && "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
            updateInfo.updateType === 'patch' && "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
            updateInfo.updateType === 'prerelease' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
          )}>
            {getUpdateTypeLabel(updateInfo.updateType)}
          </span>
        </div>
      </div>

      {/* Release Info */}
      {updateInfo.releaseInfo && (
        <div className="mb-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {versionUpdateService.formatReleaseNotes(updateInfo.releaseInfo.body).slice(0, 100)}
            {updateInfo.releaseInfo.body.length > 100 && '...'}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleDownload}
          className={cn(
            "flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
        >
          <ExternalLink className="w-4 h-4" />
          <span>立即更新</span>
        </button>
        <button
          onClick={handlePostpone}
          className={cn(
            "px-3 py-2 text-sm font-medium rounded-md transition-colors",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
          )}
        >
          <Clock className="w-4 h-4" />
        </button>
      </div>

      {/* Last checked info */}
      <div className="mt-2 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          检查时间: {updateInfo.lastChecked.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default UpdateNotification;
