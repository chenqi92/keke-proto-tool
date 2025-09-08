import React from 'react';
import { cn } from '@/utils';
import { 
  Monitor, 
  Network, 
  Wrench, 
  FileText, 
  Play, 
  Puzzle, 
  Settings,
  Home
} from 'lucide-react';

interface ActivityBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

interface ActivityItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const activityItems: ActivityItem[] = [
  { id: 'workbench', label: '工作台', icon: Home },
  { id: 'sessions', label: '会话', icon: Network, badge: 3 },
  { id: 'toolbox', label: '工具箱', icon: Wrench },
  { id: 'logs', label: '日志', icon: FileText },
  { id: 'playback', label: '回放', icon: Play },
  { id: 'plugins', label: '插件', icon: Puzzle, badge: 2 },
  { id: 'settings', label: '设置', icon: Settings },
];

export const ActivityBar: React.FC<ActivityBarProps> = ({ 
  activeView, 
  onViewChange 
}) => {
  return (
    <div className="w-12 bg-card border-r border-border flex flex-col items-center py-2">
      {/* Logo */}
      <div className="mb-4 p-2">
        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
          <Monitor className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>

      {/* Activity Items */}
      <div className="flex-1 flex flex-col space-y-1">
        {activityItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "relative w-10 h-10 rounded-md flex items-center justify-center transition-colors group",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              
              {/* Badge */}
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full" />
              )}

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto space-y-1">
        {/* User Profile */}
        <button
          className="w-10 h-10 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors group"
          title="用户配置"
        >
          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
            <span className="text-xs font-medium">U</span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            用户配置
          </div>
        </button>
      </div>
    </div>
  );
};
