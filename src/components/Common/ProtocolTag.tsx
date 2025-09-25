import React from 'react';
import { cn } from '@/utils';
import { Link, Zap, ArrowLeftRight, Rss, Activity } from 'lucide-react';

export type ProtocolType = 'TCP' | 'UDP' | 'WebSocket' | 'MQTT' | 'SSE';

interface ProtocolTagProps {
  protocol: ProtocolType | string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const protocolConfig = {
  TCP: {
    label: 'TCP',
    icon: Link,
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  },
  UDP: {
    label: 'UDP',
    icon: Zap,
    className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  },
  WebSocket: {
    label: 'WS',
    icon: ArrowLeftRight,
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  },
  MQTT: {
    label: 'MQTT',
    icon: Rss,
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
  },
  SSE: {
    label: 'SSE',
    icon: Activity,
    className: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800',
  },
};

export const ProtocolTag: React.FC<ProtocolTagProps> = ({
  protocol,
  className,
  showIcon = true,
  size = 'sm'
}) => {
  // Handle different protocol name variations
  const normalizeProtocol = (proto: string): ProtocolType | null => {
    const upper = proto.toUpperCase();
    // Handle common variations
    if (upper === 'WEBSOCKET' || upper === 'WS') return 'WebSocket';
    if (upper === 'TCP') return 'TCP';
    if (upper === 'UDP') return 'UDP';
    if (upper === 'MQTT') return 'MQTT';
    if (upper === 'SSE' || upper === 'SERVER-SENT EVENTS') return 'SSE';
    return null;
  };

  const normalizedProtocol = normalizeProtocol(protocol);
  const config = normalizedProtocol ? protocolConfig[normalizedProtocol] : null;

  if (!config) {
    console.warn('ProtocolTag: Unknown protocol:', protocol);
    // Fallback for unknown protocols
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-full border font-medium transition-colors',
          size === 'sm' ? 'text-xs' : 'text-sm',
          'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
          className
        )}
      >
        {showIcon && <Link className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
        {protocol}
      </span>
    );
  }

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full border font-medium transition-colors whitespace-nowrap',
        size === 'sm' ? 'text-xs' : 'text-sm',
        config.className,
        className
      )}
    >
      {showIcon && (
        <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      )}
      {config.label}
    </span>
  );
};
