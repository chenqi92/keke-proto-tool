import React from 'react';
import { cn } from '@/utils';
import { CheckCircle, Activity, AlertCircle, XCircle } from 'lucide-react';

export type StatusType = 'connected' | 'connecting' | 'disconnected' | 'error';

interface StatusTagProps {
  status: StatusType;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig = {
  connected: {
    label: '已连接',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  connecting: {
    label: '连接中',
    icon: Activity,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
  },
  disconnected: {
    label: '已断开',
    icon: AlertCircle,
    className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
  },
  error: {
    label: '错误',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  },
};

export const StatusTag: React.FC<StatusTagProps> = ({
  status,
  className,
  showIcon = true,
  size = 'sm'
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full border font-medium transition-colors',
        size === 'sm' ? 'text-xs' : 'text-sm',
        config.className,
        className
      )}
    >
      {showIcon && (
        <Icon 
          className={cn(
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
            status === 'connecting' && 'animate-pulse'
          )} 
        />
      )}
      {config.label}
    </span>
  );
};
