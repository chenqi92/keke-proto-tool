import React, { useEffect } from 'react';
import { cn } from '@/utils';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  buttonText?: string;
  className?: string;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = '确定',
  className
}) => {
  // Handle escape key and auto-focus
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Handle escape key
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getButtonStyle = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500';
      case 'error':
        return 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500';
      case 'warning':
        return 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500';
      case 'info':
      default:
        return 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500';
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={cn(
          "relative bg-card border border-border rounded-lg shadow-lg w-full max-w-md",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <h2 className={cn("text-lg font-semibold", getTitleColor())}>{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-md transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {message}
          </p>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            autoFocus
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              getButtonStyle()
            )}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};
