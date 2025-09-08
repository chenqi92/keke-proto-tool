import React, { useState } from 'react';
import { cn } from '@/utils';
import { 
  Plus, 
  FileText, 
  Network, 
  Wrench, 
  Clock, 
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

interface RecentProject {
  id: string;
  name: string;
  type: 'session' | 'workspace' | 'log';
  lastAccessed: Date;
  status: 'active' | 'inactive';
}

export const WorkbenchPage: React.FC = () => {
  const [recentProjects] = useState<RecentProject[]>([
    {
      id: '1',
      name: 'TCP 调试会话',
      type: 'session',
      lastAccessed: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      status: 'active'
    },
    {
      id: '2',
      name: '协议解析工作区',
      type: 'workspace',
      lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      status: 'inactive'
    },
    {
      id: '3',
      name: '网络日志分析',
      type: 'log',
      lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      status: 'inactive'
    }
  ]);

  const quickActions: QuickAction[] = [
    {
      id: 'new-session',
      title: '新建会话',
      description: '创建 TCP/UDP 连接会话',
      icon: Network,
      action: () => console.log('New session')
    },
    {
      id: 'import-log',
      title: '导入日志',
      description: '导入现有日志文件进行分析',
      icon: FileText,
      action: () => console.log('Import log')
    },
    {
      id: 'open-toolbox',
      title: '打开工具箱',
      description: '使用内置工具进行数据处理',
      icon: Wrench,
      action: () => console.log('Open toolbox')
    },
    {
      id: 'view-history',
      title: '查看历史',
      description: '浏览历史会话和日志',
      icon: Clock,
      action: () => console.log('View history')
    }
  ];

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'session':
        return Network;
      case 'workspace':
        return Activity;
      case 'log':
        return FileText;
      default:
        return FileText;
    }
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'session':
        return '会话';
      case 'workspace':
        return '工作区';
      case 'log':
        return '日志';
      default:
        return '未知';
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} 分钟前`;
    } else if (hours < 24) {
      return `${hours} 小时前`;
    } else {
      return `${days} 天前`;
    }
  };

  return (
    <div className="h-full p-6 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          欢迎使用 ProtoTool
        </h1>
        <p className="text-muted-foreground">
          跨平台网络报文工作站 - 集连接调试、协议解析、规则扩展于一体
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            快速开始
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="p-6 border border-border rounded-lg hover:bg-accent hover:border-accent-foreground transition-colors text-left group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            最近项目
          </h2>
          <div className="space-y-3">
            {recentProjects.map((project) => {
              const Icon = getProjectIcon(project.type);
              return (
                <button
                  key={project.id}
                  className="w-full p-4 border border-border rounded-lg hover:bg-accent transition-colors text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-muted rounded-lg group-hover:bg-muted/80 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground truncate">
                          {project.name}
                        </h3>
                        {project.status === 'active' && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {getProjectTypeLabel(project.type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          •
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(project.lastAccessed)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            
            {recentProjects.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无最近项目</p>
                <p className="text-sm mt-1">开始创建您的第一个会话</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          统计概览
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总会话数</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Network className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">处理报文</p>
                <p className="text-2xl font-bold">1.2K</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">解析成功率</p>
                <p className="text-2xl font-bold">99.8%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">存储使用</p>
                <p className="text-2xl font-bold">2.3GB</p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
