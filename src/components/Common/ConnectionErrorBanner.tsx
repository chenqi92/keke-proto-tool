import React, { useState } from 'react';
import { cn } from '@/utils';
import { AlertCircle, X, RefreshCw, Copy, Check } from 'lucide-react';

interface ConnectionErrorBannerProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  retryLabel?: string;
  showCopy?: boolean;
}

export const ConnectionErrorBanner: React.FC<ConnectionErrorBannerProps> = ({
  error,
  onRetry,
  onDismiss,
  className,
  retryLabel = '重试',
  showCopy = true
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(error);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error message:', err);
    }
  };

  if (!error) return null;

  return (
    <div className={cn(
      "bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4",
      className
    )}>
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-destructive mb-1">
            连接失败
          </h4>
          <p className="text-sm text-destructive/80 break-words">
            {error}
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {showCopy && (
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors"
              title="复制错误信息"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-destructive/60" />
              )}
            </button>
          )}
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center space-x-1 px-2 py-1 bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs rounded-md transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{retryLabel}</span>
            </button>
          )}
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors"
              title="关闭"
            >
              <X className="w-4 h-4 text-destructive/60" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
