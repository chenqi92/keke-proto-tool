import React from 'react';
import { cn } from '@/utils';
import { CheckCircle, Activity, AlertCircle, XCircle } from 'lucide-react';

export type StatusType = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error';

interface StatusTagProps {
  status: StatusType | string | any; // Allow flexible status input
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
  reconnecting: {
    label: '重连中',
    icon: Activity,
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
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
  // Normalize status to string
  const normalizeStatus = (status: any): StatusType => {
    if (typeof status === 'string') {
      return status as StatusType;
    }

    // Handle Rust enum objects
    if (typeof status === 'object' && status !== null) {
      if (status.connected !== undefined) return 'connected';
      if (status.connecting !== undefined) return 'connecting';
      if (status.disconnected !== undefined) return 'disconnected';
      if (status.error !== undefined) return 'error';
      if (status.reconnecting !== undefined) return 'reconnecting';
      if (status.timedOut !== undefined) return 'error';

      // Handle lowercase variants
      const statusStr = Object.keys(status)[0]?.toLowerCase();
      if (statusStr === 'connected') return 'connected';
      if (statusStr === 'connecting') return 'connecting';
      if (statusStr === 'disconnected') return 'disconnected';
      if (statusStr === 'error') return 'error';
      if (statusStr === 'reconnecting') return 'reconnecting';
      if (statusStr === 'timedout') return 'error';
    }

    return 'disconnected'; // Default fallback
  };

  const normalizedStatus = normalizeStatus(status);
  const config = statusConfig[normalizedStatus];

  if (!config) {
    console.warn('StatusTag: Unknown status:', status);
    return null;
  }

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
            (normalizedStatus === 'connecting' || normalizedStatus === 'reconnecting') && 'animate-pulse'
          )} 
        />
      )}
      {config.label}
    </span>
  );
};
