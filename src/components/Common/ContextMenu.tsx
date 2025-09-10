import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils';
import {
  Edit,
  Copy,
  Trash2,
  Plus,
  Settings,
  FileText,
  Download,
  Upload,
  Play,
  Square,
  Eye,
  Link,
  Wifi,
  WifiOff
} from 'lucide-react';

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
  className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  items,
  onClose,
  className
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSubmenuOpen(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    
    if (item.submenu && item.submenu.length > 0) {
      setSubmenuOpen(submenuOpen === item.id ? null : item.id);
      return;
    }

    if (item.action) {
      item.action();
    }
    onClose();
  };

  const renderMenuItem = (item: ContextMenuItem, index: number) => {
    if (item.separator) {
      return <div key={index} className="h-px bg-border my-1" />;
    }

    const Icon = item.icon;
    const hasSubmenu = item.submenu && item.submenu.length > 0;

    return (
      <div key={item.id} className="relative">
        <button
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm rounded-sm transition-colors",
            "hover:bg-accent focus:bg-accent focus:outline-none",
            item.disabled && "opacity-50 cursor-not-allowed",
            item.danger && "text-destructive hover:bg-destructive/10"
          )}
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          onMouseEnter={() => hasSubmenu && setSubmenuOpen(item.id)}
        >
          <div className="flex items-center space-x-2">
            {Icon && <Icon className="w-4 h-4" />}
            <span>{item.label}</span>
          </div>
          <div className="flex items-center space-x-2">
            {item.shortcut && (
              <span className="text-xs text-muted-foreground">{item.shortcut}</span>
            )}
            {hasSubmenu && (
              <span className="text-xs">▶</span>
            )}
          </div>
        </button>

        {/* Submenu */}
        {hasSubmenu && submenuOpen === item.id && (
          <div className="absolute left-full top-0 ml-1 min-w-48 bg-popover border border-border rounded-md shadow-lg z-50">
            <div className="py-1">
              {item.submenu!.map((subItem, subIndex) => renderMenuItem(subItem, subIndex))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Calculate position to prevent menu from going off-screen
  const getMenuPosition = () => {
    const menuWidth = 192; // min-w-48 = 12rem = 192px
    const menuHeight = items.length * 40; // Approximate height per item

    let left = position.x;
    let top = position.y;

    // Adjust horizontal position if menu would go off right edge
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 10;
    }

    // Adjust vertical position if menu would go off bottom edge
    if (top + menuHeight > window.innerHeight) {
      top = window.innerHeight - menuHeight - 10;
    }

    // Ensure menu doesn't go off left or top edges
    left = Math.max(10, left);
    top = Math.max(10, top);

    return { left, top };
  };

  const menuPosition = getMenuPosition();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        ref={menuRef}
        className={cn(
          "fixed min-w-48 bg-popover border border-border rounded-md shadow-lg z-50 animate-fade-in",
          className
        )}
        style={{
          left: menuPosition.left,
          top: menuPosition.top,
        }}
      >
        <div className="py-1">
          {items.map((item, index) => renderMenuItem(item, index))}
        </div>
      </div>
    </>
  );
};

// 预定义的菜单项工厂函数
export const createWorkspaceMenuItems = (callbacks: {
  onNewSession?: () => void;
  onImportConfig?: () => void;
  onExportConfig?: () => void;
  onClearWorkspace?: () => void;
  onSettings?: () => void;
}): ContextMenuItem[] => [
  {
    id: 'new-session',
    label: '新建会话',
    icon: Plus,
    shortcut: 'Ctrl+N',
    action: callbacks.onNewSession
  },
  { id: 'separator-1', separator: true },
  {
    id: 'import-config',
    label: '导入配置',
    icon: Upload,
    action: callbacks.onImportConfig
  },
  {
    id: 'export-config',
    label: '导出配置',
    icon: Download,
    action: callbacks.onExportConfig
  },
  { id: 'separator-2', separator: true },
  {
    id: 'clear-workspace',
    label: '清空工作区',
    icon: Trash2,
    danger: true,
    action: callbacks.onClearWorkspace
  },
  {
    id: 'workspace-settings',
    label: '工作区设置',
    icon: Settings,
    action: callbacks.onSettings
  }
];

export const createProtocolTypeMenuItems = (protocol: string, callbacks: {
  onNewSession?: () => void;
  onBatchOperation?: () => void;
}): ContextMenuItem[] => [
  {
    id: 'new-protocol-session',
    label: `新建${protocol}会话`,
    icon: Plus,
    action: callbacks.onNewSession
  },
  {
    id: 'batch-operation',
    label: '批量操作',
    icon: Settings,
    submenu: [
      {
        id: 'batch-connect',
        label: '批量连接',
        icon: Play,
        action: callbacks.onBatchOperation
      },
      {
        id: 'batch-disconnect',
        label: '批量断开',
        icon: Square,
        action: callbacks.onBatchOperation
      }
    ]
  }
];

export const createSessionMenuItems = (callbacks: {
  onEditConfig?: () => void;
  onDuplicateSession?: () => void;
  onDeleteSession?: () => void;
  onViewLogs?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}, isConnected: boolean = false): ContextMenuItem[] => [
  {
    id: 'edit-config',
    label: '编辑配置',
    icon: Edit,
    action: callbacks.onEditConfig
  },
  {
    id: 'duplicate-session',
    label: '复制会话',
    icon: Copy,
    action: callbacks.onDuplicateSession
  },
  { id: 'separator-1', separator: true },
  isConnected ? {
    id: 'disconnect',
    label: '断开连接',
    icon: WifiOff,
    action: callbacks.onDisconnect
  } : {
    id: 'connect',
    label: '开始连接',
    icon: Wifi,
    action: callbacks.onConnect
  },
  {
    id: 'view-logs',
    label: '查看日志',
    icon: FileText,
    action: callbacks.onViewLogs
  },
  { id: 'separator-2', separator: true },
  {
    id: 'delete-session',
    label: '删除会话',
    icon: Trash2,
    danger: true,
    action: callbacks.onDeleteSession
  }
];

export const createConnectionMenuItems = (callbacks: {
  onDisconnect?: () => void;
  onViewDetails?: () => void;
  onCopyInfo?: () => void;
}): ContextMenuItem[] => [
  {
    id: 'view-details',
    label: '查看连接详情',
    icon: Eye,
    action: callbacks.onViewDetails
  },
  {
    id: 'copy-info',
    label: '复制连接信息',
    icon: Link,
    action: callbacks.onCopyInfo
  },
  { id: 'separator-1', separator: true },
  {
    id: 'disconnect-connection',
    label: '断开连接',
    icon: WifiOff,
    danger: true,
    action: callbacks.onDisconnect
  }
];
