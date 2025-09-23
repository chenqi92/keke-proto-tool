import React, { useState } from 'react';
import { cn } from '@/utils';
import {
  Database,
  Server,
  HardDrive,
  Cloud,
  Activity,
  MoreHorizontal,
  TestTube,
  Edit,
  Trash2,
  Power,
  PowerOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  BarChart3
} from 'lucide-react';
import { DatabaseConnection, DATABASE_CONFIGS } from '@/types/storage';

interface DatabaseConnectionCardProps {
  connection: DatabaseConnection;
  onConnect?: (id: string) => Promise<void>;
  onDisconnect?: (id: string) => Promise<void>;
  onTest?: (id: string) => Promise<void>;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewMetrics?: (id: string) => void;
  isConnecting?: boolean;
  isTesting?: boolean;
  className?: string;
  viewMode?: 'grid' | 'list';
}

const getIconComponent = (iconName: string) => {
  const icons = {
    Database,
    Server,
    HardDrive,
    Cloud,
    Activity
  };
  return icons[iconName as keyof typeof icons] || Database;
};

export const DatabaseConnectionCard: React.FC<DatabaseConnectionCardProps> = ({
  connection,
  onConnect,
  onDisconnect,
  onTest,
  onEdit,
  onDelete,
  onViewMetrics,
  isConnecting = false,
  isTesting = false,
  className,
  viewMode = 'grid'
}) => {
  const [showActions, setShowActions] = useState(false);
  
  const config = DATABASE_CONFIGS[connection.type];
  const IconComponent = getIconComponent(config.icon);

  const getStatusIcon = () => {
    if (isConnecting) {
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    }
    
    switch (connection.status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (isConnecting) return '连接中...';
    
    switch (connection.status) {
      case 'connected':
        return '已连接';
      case 'error':
        return '连接错误';
      case 'connecting':
        return '连接中...';
      default:
        return '未连接';
    }
  };

  const getStatusColor = () => {
    if (isConnecting) return 'text-blue-600';
    
    switch (connection.status) {
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'connecting':
        return 'text-blue-600';
      default:
        return 'text-gray-500';
    }
  };

  const handleConnect = async () => {
    if (connection.status === 'connected') {
      await onDisconnect?.(connection.id);
    } else {
      await onConnect?.(connection.id);
    }
  };

  const formatLastConnected = () => {
    if (!connection.lastConnected) return '从未连接';
    
    const now = new Date();
    const diff = now.getTime() - connection.lastConnected.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  // Render different layouts based on view mode
  if (viewMode === 'list') {
    return (
      <div className={cn(
        "bg-card border border-border rounded-lg p-3 hover:shadow-md transition-all duration-200",
        className
      )}>
        <div className="flex items-center justify-between">
          {/* Left: Icon and Info */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={cn("p-1.5 rounded-md flex-shrink-0", config.bgColor)}>
              <IconComponent className={cn("w-4 h-4", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{connection.name}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {config.name} • {connection.host}:{connection.port}
              </p>
            </div>
          </div>

          {/* Center: Status */}
          <div className="flex items-center space-x-2 px-3">
            {getStatusIcon()}
            <span className={cn("text-xs font-medium", getStatusColor())}>
              {getStatusText()}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            {/* Connection Toggle */}
            {(onConnect || onDisconnect) && (
              <button
                onClick={handleConnect}
                disabled={isConnecting || connection.status === 'connecting'}
                className={cn(
                  "flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors disabled:opacity-50",
                  connection.status === 'connected'
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                )}
              >
                {connection.status === 'connected' ? (
                  <>
                    <PowerOff className="w-3 h-3" />
                    <span>断开</span>
                  </>
                ) : (
                  <>
                    <Power className="w-3 h-3" />
                    <span>连接</span>
                  </>
                )}
              </button>
            )}

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 hover:bg-accent rounded-md transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showActions && (
                <div className="absolute right-0 top-8 z-10 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[120px]">
                  {onTest && (
                    <button
                      onClick={() => {
                        onTest(connection.id);
                        setShowActions(false);
                      }}
                      disabled={isTesting}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      <span>测试连接</span>
                    </button>
                  )}

                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit(connection.id);
                        setShowActions(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>编辑</span>
                    </button>
                  )}

                  {onViewMetrics && (
                    <button
                      onClick={() => {
                        onViewMetrics(connection.id);
                        setShowActions(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>查看指标</span>
                    </button>
                  )}

                  <div className="border-t border-border my-1" />

                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(connection.id);
                        setShowActions(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>删除</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Click outside to close actions menu */}
        {showActions && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setShowActions(false)}
          />
        )}
      </div>
    );
  }

  // Grid view (compact)
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-3 hover:shadow-md transition-all duration-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start space-x-2 flex-1 min-w-0">
          <div className={cn("p-1.5 rounded-md flex-shrink-0", config.bgColor)}>
            <IconComponent className={cn("w-4 h-4", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{connection.name}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {config.name} • {connection.host}:{connection.port}
            </p>
            {connection.database && (
              <p className="text-xs text-muted-foreground truncate">
                数据库: {connection.database}
              </p>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>

          {showActions && (
            <div className="absolute right-0 top-6 z-10 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[100px]">
              {onTest && (
                <button
                  onClick={() => {
                    onTest(connection.id);
                    setShowActions(false);
                  }}
                  disabled={isTesting}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 text-xs hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {isTesting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <TestTube className="w-3 h-3" />
                  )}
                  <span>测试</span>
                </button>
              )}

              {onEdit && (
                <button
                  onClick={() => {
                    onEdit(connection.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  <span>编辑</span>
                </button>
              )}

              {onViewMetrics && (
                <button
                  onClick={() => {
                    onViewMetrics(connection.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>指标</span>
                </button>
              )}

              <div className="border-t border-border my-1" />

              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(connection.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>删除</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status and Connection Toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          {getStatusIcon()}
          <span className={cn("text-xs font-medium", getStatusColor())}>
            {getStatusText()}
          </span>
        </div>

        {/* Connection Toggle */}
        {(onConnect || onDisconnect) && (
          <button
            onClick={handleConnect}
            disabled={isConnecting || connection.status === 'connecting'}
            className={cn(
              "flex items-center space-x-1 px-1.5 py-0.5 text-xs rounded transition-colors disabled:opacity-50",
              connection.status === 'connected'
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            )}
          >
            {connection.status === 'connected' ? (
              <>
                <PowerOff className="w-3 h-3" />
                <span>断开</span>
              </>
            ) : (
              <>
                <Power className="w-3 h-3" />
                <span>连接</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Last Connected */}
      <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-2">
        <Clock className="w-3 h-3" />
        <span>{formatLastConnected()}</span>
      </div>

      {/* Connection Details - Compact */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div className="flex justify-between">
          <span>类型: {config.name}</span>
          <span>SSL: {connection.ssl ? '启用' : '禁用'}</span>
        </div>
        {connection.username && (
          <div>用户: {connection.username}</div>
        )}
      </div>

      {/* Click outside to close actions menu */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
};
