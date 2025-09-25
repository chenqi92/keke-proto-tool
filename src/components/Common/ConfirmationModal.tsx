import React, { useEffect, useRef } from 'react';
import { cn } from '@/utils';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  className?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = '确认',
  cancelText = '取消',
  isLoading = false,
  className
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Focus the confirm button when modal opens
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Handle escape key
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !isLoading) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'info':
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500';
      case 'success':
        return 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500';
      case 'info':
      default:
        return 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500';
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isLoading) {
      handleConfirm();
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
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 p-4 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              getConfirmButtonStyle(),
              isLoading && "cursor-wait"
            )}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>处理中...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
