/**
 * Menu Update Notification Component
 * Provides user feedback for menu-triggered update checks
 */

import React, { useEffect } from 'react';
import { cn } from '@/utils';
import { 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  X,
  ExternalLink,
  Clock
} from 'lucide-react';
import { formatVersionForDisplay } from '@/utils/version';
import { UpdateInfo } from '@/services/VersionUpdateService';

interface MenuUpdateNotificationProps {
  isVisible: boolean;
  isChecking: boolean;
  updateInfo: UpdateInfo | null;
  error: string | null;
  onClose: () => void;
  onOpenModal: () => void;
  onUpdateNow?: () => void;
}

export const MenuUpdateNotification: React.FC<MenuUpdateNotificationProps> = ({
  isVisible,
  isChecking,
  updateInfo,
  error,
  onClose,
  onOpenModal,
  onUpdateNow,
}) => {
  // Auto-hide after 10 seconds if no update available and no error
  useEffect(() => {
    if (isVisible && !isChecking && !error && updateInfo && !updateInfo.hasUpdate) {
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isChecking, error, updateInfo, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">软件更新</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-md transition-colors"
            aria-label="关闭通知"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Checking State */}
          {isChecking && (
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">正在检查更新...</p>
                <p className="text-xs text-muted-foreground">请稍候，正在从服务器获取最新版本信息</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isChecking && (
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">检查更新失败</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs text-primary hover:underline"
                  >
                    重试
                  </button>
                  <button
                    onClick={onClose}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Update Available */}
          {updateInfo && updateInfo.hasUpdate && !isChecking && !error && (
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Download className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-600">发现新版本</p>
                  <p className="text-xs text-muted-foreground">
                    {formatVersionForDisplay(updateInfo.currentVersion)} → {formatVersionForDisplay(updateInfo.latestVersion)}
                  </p>
                  {updateInfo.releaseInfo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {updateInfo.releaseInfo.name || `版本 ${updateInfo.latestVersion}`}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={onOpenModal}
                  className={cn(
                    "flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>查看详情</span>
                </button>
                {onUpdateNow && (
                  <button
                    onClick={onUpdateNow}
                    className={cn(
                      "flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      "bg-green-600 text-white hover:bg-green-700"
                    )}
                  >
                    <Download className="w-3 h-3" />
                    <span>立即更新</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  稍后提醒
                </button>
              </div>
            </div>
          )}

          {/* No Update Available */}
          {updateInfo && !updateInfo.hasUpdate && !isChecking && !error && (
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-600">已是最新版本</p>
                <p className="text-xs text-muted-foreground">
                  当前版本 {formatVersionForDisplay(updateInfo.currentVersion)} 是最新版本
                </p>
                {updateInfo.lastChecked && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      检查时间: {updateInfo.lastChecked.toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
