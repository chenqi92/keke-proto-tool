import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils';
import { Download, FileText, X } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'json' | 'csv') => void;
  title?: string;
  isLoading?: boolean;
  className?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  title = '导出日志',
  isLoading = false,
  className
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv'>('json');
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Focus the export button when modal opens
      setTimeout(() => {
        exportButtonRef.current?.focus();
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

  const handleExport = () => {
    onExport(selectedFormat);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isLoading) {
      handleExport();
    }
  };

  const formatOptions = [
    {
      value: 'json' as const,
      label: 'JSON 格式',
      description: '结构化数据，适合程序处理',
      icon: <FileText className="w-4 h-4" />
    },
    {
      value: 'csv' as const,
      label: 'CSV 格式',
      description: '表格数据，适合 Excel 查看',
      icon: <FileText className="w-4 h-4" />
    }
  ];

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
            <Download className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400">{title}</h2>
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
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              请选择导出格式：
            </p>
            
            <div className="space-y-2">
              {formatOptions.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors",
                    selectedFormat === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={selectedFormat === option.value}
                    onChange={(e) => setSelectedFormat(e.target.value as 'json' | 'csv')}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {option.icon}
                      <span className="font-medium text-sm">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
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
            取消
          </button>
          <button
            ref={exportButtonRef}
            onClick={handleExport}
            disabled={isLoading}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "bg-blue-500 text-white hover:bg-blue-600",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isLoading && "cursor-wait"
            )}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>导出中...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>导出</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
