import React, { useEffect, useRef } from 'react';
import { cn } from '@/utils';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  itemType?: string;
  isLoading?: boolean;
  className?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  itemType = '项目',
  isLoading = false,
  className
}) => {
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Focus the delete button when modal opens
      setTimeout(() => {
        deleteButtonRef.current?.focus();
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
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">{title}</h2>
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
              {message}
            </p>
            
            {itemName && (
              <div className="bg-muted/50 rounded-md p-3 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {itemType}名称
                  </span>
                </div>
                <p className="font-medium text-sm mt-1 break-all">
                  {itemName}
                </p>
              </div>
            )}
            
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-xs text-destructive font-medium">
                ⚠️ 此操作无法撤销
              </p>
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
            ref={deleteButtonRef}
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              "focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isLoading && "cursor-wait"
            )}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>删除中...</span>
              </div>
            ) : (
              '确认删除'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Convenience function for session deletion
export const useSessionDeleteModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [sessionData, setSessionData] = React.useState<{
    id: string;
    name: string;
    onConfirm: () => void;
  } | null>(null);

  const openModal = (id: string, name: string, onConfirm: () => void) => {
    setSessionData({ id, name, onConfirm });
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSessionData(null);
  };

  const handleConfirm = () => {
    if (sessionData) {
      sessionData.onConfirm();
      closeModal();
    }
  };

  const Modal = () => (
    <DeleteConfirmationModal
      isOpen={isOpen}
      onClose={closeModal}
      onConfirm={handleConfirm}
      title="删除会话"
      message="您确定要删除这个会话吗？删除后，所有相关的连接、消息历史和配置都将被永久删除。"
      itemName={sessionData?.name}
      itemType="会话"
    />
  );

  return {
    openModal,
    closeModal,
    Modal
  };
};

// Convenience function for workspace clearing
export const useWorkspaceClearModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [onConfirm, setOnConfirm] = React.useState<(() => void) | null>(null);

  const openModal = (confirmCallback: () => void) => {
    setOnConfirm(() => confirmCallback);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setOnConfirm(null);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
      closeModal();
    }
  };

  const Modal = () => (
    <DeleteConfirmationModal
      isOpen={isOpen}
      onClose={closeModal}
      onConfirm={handleConfirm}
      title="清空工作区"
      message="您确定要清空整个工作区吗？这将删除所有会话、连接和相关数据。"
      itemType="工作区"
    />
  );

  return {
    openModal,
    closeModal,
    Modal
  };
};
