import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { X, Keyboard, Search } from 'lucide-react';
import { keyboardShortcutManager } from '@/services/KeyboardShortcutManager';

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  category: string;
  title: string;
  shortcuts: Array<{
    id: string;
    key: string;
    description: string;
  }>;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ isOpen, onClose }) => {
  const [shortcuts, setShortcuts] = useState<ShortcutGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredShortcuts, setFilteredShortcuts] = useState<ShortcutGroup[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadShortcuts();
    }
  }, [isOpen]);

  useEffect(() => {
    filterShortcuts();
  }, [shortcuts, searchQuery]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const loadShortcuts = () => {
    const allShortcuts = keyboardShortcutManager.getShortcuts();
    
    const categoryMap: Record<string, string> = {
      tool: '工具操作',
      navigation: '导航',
      action: '操作',
      view: '视图'
    };

    const groupedShortcuts = allShortcuts.reduce((groups, shortcut) => {
      const category = shortcut.category;
      if (!groups[category]) {
        groups[category] = {
          category,
          title: categoryMap[category] || category,
          shortcuts: []
        };
      }
      
      groups[category].shortcuts.push({
        id: shortcut.id,
        key: shortcut.key,
        description: shortcut.description
      });
      
      return groups;
    }, {} as Record<string, ShortcutGroup>);

    // Sort shortcuts within each group
    Object.values(groupedShortcuts).forEach(group => {
      group.shortcuts.sort((a, b) => a.description.localeCompare(b.description));
    });

    const sortedGroups = Object.values(groupedShortcuts).sort((a, b) => {
      const order = ['tool', 'navigation', 'action', 'view'];
      return order.indexOf(a.category) - order.indexOf(b.category);
    });

    setShortcuts(sortedGroups);
  };

  const filterShortcuts = () => {
    if (!searchQuery.trim()) {
      setFilteredShortcuts(shortcuts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = shortcuts.map(group => ({
      ...group,
      shortcuts: group.shortcuts.filter(shortcut =>
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.key.toLowerCase().includes(query)
      )
    })).filter(group => group.shortcuts.length > 0);

    setFilteredShortcuts(filtered);
  };

  const formatKey = (key: string): React.ReactNode => {
    const parts = key.split('+');
    return (
      <span className="inline-flex items-center space-x-1">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-muted-foreground">+</span>}
            <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded">
              {part}
            </kbd>
          </React.Fragment>
        ))}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[80vh] mx-4 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <Keyboard className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">键盘快捷键</h2>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索快捷键..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[60vh]">
          {filteredShortcuts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Keyboard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>没有找到匹配的快捷键</p>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {filteredShortcuts.map(group => (
                <div key={group.category}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {group.title}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.shortcuts.map(shortcut => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="ml-4">
                          {formatKey(shortcut.key)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>按 Escape 关闭此窗口</span>
            <span>共 {filteredShortcuts.reduce((sum, group) => sum + group.shortcuts.length, 0)} 个快捷键</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for managing shortcut help
export const useShortcutHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShowShortcuts = () => {
      setIsOpen(true);
    };

    document.addEventListener('show-shortcuts-help', handleShowShortcuts);
    return () => document.removeEventListener('show-shortcuts-help', handleShowShortcuts);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false)
  };
};
