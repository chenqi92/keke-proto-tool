/**
 * Update Modal Component
 * Detailed modal for displaying update information and release notes
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { 
  Download, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Calendar,
  Tag,
  FileText,
  Globe
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { versionUpdateService, UpdateInfo, GitHubRelease } from '@/services/VersionUpdateService';
import { formatVersionForDisplay } from '@/utils/version';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo?: UpdateInfo | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo: propUpdateInfo,
}) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(propUpdateInfo || null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !updateInfo) {
      handleCheckForUpdates();
    }
  }, [isOpen]);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setCheckError(null);
    
    try {
      const info = await versionUpdateService.checkForUpdates();
      setUpdateInfo(info);
    } catch (error) {
      setCheckError(error instanceof Error ? error.message : '检查更新失败');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownload = () => {
    if (updateInfo?.releaseInfo) {
      const downloadUrl = versionUpdateService.getDownloadUrl(updateInfo.releaseInfo);
      window.open(downloadUrl, '_blank');
    }
  };

  const getUpdateTypeInfo = (updateType: string) => {
    switch (updateType) {
      case 'major':
        return {
          label: '重大更新',
          description: '包含重要的新功能和可能的破坏性变更',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
        };
      case 'minor':
        return {
          label: '功能更新',
          description: '新增功能和改进，向后兼容',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        };
      case 'patch':
        return {
          label: '修复更新',
          description: '错误修复和小幅改进',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
        };
      case 'prerelease':
        return {
          label: '预发布版本',
          description: '测试版本，可能包含未完成的功能',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        };
      default:
        return {
          label: '当前版本',
          description: '您使用的是最新版本',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/20',
        };
    }
  };

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderReleaseNotes = (body: string) => {
    // Simple markdown-like formatting for display
    const lines = body.split('\n');
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        return (
          <h3 key={index} className="text-lg font-semibold mt-4 mb-2 first:mt-0">
            {line.replace('## ', '')}
          </h3>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h4 key={index} className="text-base font-semibold mt-3 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={index} className="ml-4 mb-1">
            {line.replace(/^[-*] /, '')}
          </li>
        );
      }
      
      // Empty lines
      if (line.trim() === '') {
        return <br key={index} />;
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="mb-2">
          {line}
        </p>
      );
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="版本更新"
      size="lg"
      fixedHeight={true}
    >
      <div className="p-6 space-y-6">
        {/* Loading State */}
        {isChecking && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">正在检查更新...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {checkError && (
          <div className="flex items-center space-x-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">检查更新失败</p>
              <p className="text-sm text-destructive/80">{checkError}</p>
            </div>
          </div>
        )}

        {/* Update Info */}
        {updateInfo && !isChecking && (
          <>
            {/* Version Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center space-x-2">
                  <Tag className="w-4 h-4" />
                  <span>当前版本</span>
                </h3>
                <p className="text-2xl font-mono">
                  {formatVersionForDisplay(updateInfo.currentVersion)}
                </p>
              </div>
              
              <div className="p-4 bg-primary/10 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>最新版本</span>
                </h3>
                <p className="text-2xl font-mono text-primary">
                  {formatVersionForDisplay(updateInfo.latestVersion)}
                </p>
              </div>
            </div>

            {/* Update Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                {updateInfo.hasUpdate ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-gray-400" />
                )}
                <div>
                  <p className="font-medium">
                    {updateInfo.hasUpdate ? '发现新版本' : '已是最新版本'}
                  </p>
                  {updateInfo.hasUpdate && (
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        getUpdateTypeInfo(updateInfo.updateType).bgColor,
                        getUpdateTypeInfo(updateInfo.updateType).color
                      )}>
                        {getUpdateTypeInfo(updateInfo.updateType).label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {getUpdateTypeInfo(updateInfo.updateType).description}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {updateInfo.hasUpdate && (
                <button
                  onClick={handleDownload}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  )}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>立即更新</span>
                </button>
              )}
            </div>

            {/* Release Information */}
            {updateInfo.releaseInfo && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>更新说明</span>
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatReleaseDate(updateInfo.releaseInfo.published_at)}</span>
                    </div>
                    <a
                      href={updateInfo.releaseInfo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 hover:text-primary transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>查看详情</span>
                    </a>
                  </div>
                </div>
                
                <div className="max-h-64 overflow-y-auto p-4 bg-secondary/30 rounded-lg">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {renderReleaseNotes(updateInfo.releaseInfo.body)}
                  </div>
                </div>
              </div>
            )}

            {/* Last Check Info */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                最后检查时间: {updateInfo.lastChecked.toLocaleString()}
              </p>
            </div>
          </>
        )}

        {/* Manual Check Button */}
        {!isChecking && (
          <div className="flex justify-center pt-4">
            <button
              onClick={handleCheckForUpdates}
              disabled={isChecking}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isChecking && "animate-spin")} />
              <span>重新检查</span>
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UpdateModal;
