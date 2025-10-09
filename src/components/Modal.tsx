import React, { useEffect } from 'react';
import { cn } from '@/utils';
import { X, Minus } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  fixedHeight?: boolean;
  onMinimize?: () => void; // 新增：最小化回调
  showMinimizeButton?: boolean; // 新增：是否显示最小化按钮
  fullscreen?: boolean; // 新增：全屏模式,占据从工具栏到状态栏的整个区域
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]'
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  className,
  fixedHeight = false,
  onMinimize,
  showMinimizeButton = false,
  fullscreen = false
}) => {
  // Handle ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Don't return null when closed - just hide it to preserve component state
  // This is crucial for minimization feature to work properly

  // 全屏模式：占据从系统菜单栏（拖拽区域）到状态栏的整个区域，覆盖工具栏
  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{
          display: isOpen ? 'flex' : 'none',
          top: 0, // 从顶部开始，WindowDragRegion的z-index较低会被覆盖但仍可拖拽
          bottom: 0 // 延伸到底部，StatusBar会通过更高的z-index显示在上面
        }}
      >
        {/* Modal */}
        <div
          className={cn(
            "relative bg-card w-full h-full flex flex-col",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="flex items-center space-x-1">
              {/* Minimize Button */}
              {showMinimizeButton && onMinimize && (
                <button
                  onClick={onMinimize}
                  className="p-1 hover:bg-accent rounded-md transition-colors"
                  aria-label="最小化"
                  title="最小化到状态栏"
                >
                  <Minus className="w-5 h-5" />
                </button>
              )}
              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1 hover:bg-accent rounded-md transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // 普通模式：居中弹框
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ display: isOpen ? 'flex' : 'none' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative bg-card border border-border rounded-lg shadow-lg w-full flex flex-col",
          fixedHeight ? "h-[80vh] min-h-[600px]" : "max-h-[90vh]",
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center space-x-1">
            {/* Minimize Button */}
            {showMinimizeButton && onMinimize && (
              <button
                onClick={onMinimize}
                className="p-1 hover:bg-accent rounded-md transition-colors"
                aria-label="最小化"
                title="最小化到状态栏"
              >
                <Minus className="w-5 h-5" />
              </button>
            )}
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded-md transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
