import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils';
import { Download, FileText, X, FolderOpen, File } from 'lucide-react';
import { showSaveDialog, showDirectoryDialog, isTauriEnvironment } from '../../utils/tauri';

export interface ExportOptions {
  format: 'json' | 'csv' | 'md';
  customPath?: string;
  customFilename?: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
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
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv' | 'md'>('json');
  const [customPath, setCustomPath] = useState<string>('');
  const [customFilename, setCustomFilename] = useState<string>('');
  const [useCustomLocation, setUseCustomLocation] = useState<boolean>(false);
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

  const handleSelectPath = async () => {
    try {
      const selected = await showDirectoryDialog({
        title: '选择导出文件夹',
        defaultPath: undefined
      });

      if (selected) {
        setCustomPath(selected);
        // 如果还没有设置文件名，设置默认文件名
        if (!customFilename) {
          const defaultFilename = `logs_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.${selectedFormat}`;
          setCustomFilename(defaultFilename);
        }
        setUseCustomLocation(true);
      } else if (!isTauriEnvironment()) {
        // Fallback: 在非Tauri环境中使用浏览器文件输入
        console.warn('Tauri API not available, using browser fallback');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = `.${selectedFormat}`;
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            setCustomFilename(file.name);
            setUseCustomLocation(true);
          }
        };
        input.click();
      }

    } catch (error) {
      console.error('Failed to select export path:', error);
    }
  };

  const handleExport = () => {
    const options: ExportOptions = {
      format: selectedFormat,
      customPath: useCustomLocation ? customPath : undefined,
      customFilename: useCustomLocation ? customFilename : undefined
    };
    onExport(options);
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
    },
    {
      value: 'md' as const,
      label: 'Markdown 格式',
      description: '文档格式，适合阅读和分享',
      icon: <File className="w-4 h-4" />
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
                    onChange={(e) => setSelectedFormat(e.target.value as 'json' | 'csv' | 'md')}
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

            {/* Custom Location Section */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useCustomLocation"
                  checked={useCustomLocation}
                  onChange={(e) => setUseCustomLocation(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="useCustomLocation" className="text-sm font-medium">
                  自定义导出位置
                </label>
              </div>

              {useCustomLocation && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      导出路径
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={customPath}
                        onChange={(e) => setCustomPath(e.target.value)}
                        placeholder="选择导出文件夹..."
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={handleSelectPath}
                        className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 border border-border rounded-md transition-colors"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      文件名
                    </label>
                    <input
                      type="text"
                      value={customFilename}
                      onChange={(e) => setCustomFilename(e.target.value)}
                      placeholder={`logs_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.${selectedFormat}`}
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              )}
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
