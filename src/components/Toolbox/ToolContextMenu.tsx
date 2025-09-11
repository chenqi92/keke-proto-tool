import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils';
import {
  Wrench,
  ChevronRight
} from 'lucide-react';
import { BaseTool, ContextMenuItem } from '@/types/toolbox';
import { toolboxService } from '@/services/ToolboxService';
import { toolRegistry } from '@/services/ToolRegistry';

interface ToolContextMenuProps {
  data: Uint8Array;
  sessionId?: string;
  position: { x: number; y: number };
  onClose: () => void;
  onToolExecute?: (toolId: string, input: any) => void;
}

export const ToolContextMenu: React.FC<ToolContextMenuProps> = ({
  data,
  sessionId,
  position,
  onClose,
  onToolExecute
}) => {
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);
  const [submenuItems, setSubmenuItems] = useState<Map<string, ContextMenuItem[]>>(new Map());
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load context menu items
  useEffect(() => {
    const loadMenuItems = async () => {
      const toolIds = toolboxService.getContextMenuTools(data, sessionId);
      const items: ContextMenuItem[] = [];
      const submenus = new Map<string, ContextMenuItem[]>();

      // Group tools by category
      const toolsByCategory = new Map<string, BaseTool[]>();
      
      for (const toolId of toolIds) {
        const registration = toolRegistry.getById(toolId);
        if (registration) {
          const category = registration.tool.category;
          if (!toolsByCategory.has(category)) {
            toolsByCategory.set(category, []);
          }
          toolsByCategory.get(category)!.push(registration.tool);
        }
      }

      // Create menu structure
      if (toolsByCategory.size === 1) {
        // If only one category, show tools directly
        const [category, tools] = Array.from(toolsByCategory.entries())[0];
        tools.forEach(tool => {
          items.push({
            id: tool.id,
            label: tool.name,
            icon: tool.icon,
            handler: async () => {
              await handleToolExecute(tool.id);
              onClose();
            }
          });
        });
      } else {
        // Multiple categories, create submenus
        toolsByCategory.forEach((tools, category) => {
          const categoryItems: ContextMenuItem[] = tools.map(tool => ({
            id: tool.id,
            label: tool.name,
            icon: tool.icon,
            handler: async () => {
              await handleToolExecute(tool.id);
              onClose();
            }
          }));

          items.push({
            id: `category-${category}`,
            label: category,
            icon: Wrench,
            handler: async () => {
              // This will be handled by submenu logic
            }
          });

          submenus.set(`category-${category}`, categoryItems);
        });
      }

      // Add separator and common actions
      if (items.length > 0) {
        items.push({
          id: 'separator-1',
          label: '',
          separator: true,
          handler: async () => {}
        });
      }

      // Add data analysis actions
      items.push(
        {
          id: 'analyze-data',
          label: '分析数据',
          icon: Wrench,
          handler: async () => {
            console.log('Analyze data:', data);
            onClose();
          }
        },
        {
          id: 'copy-data',
          label: '复制数据',
          handler: async () => {
            const text = new TextDecoder().decode(data);
            await navigator.clipboard.writeText(text);
            onClose();
          }
        }
      );

      setMenuItems(items);
      setSubmenuItems(submenus);
    };

    loadMenuItems();
  }, [data, sessionId]);

  // Handle clicks outside menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleToolExecute = async (toolId: string) => {
    try {
      const result = await toolboxService.executeTool(toolId, { data }, sessionId);
      onToolExecute?.(toolId, result);
    } catch (error) {
      console.error('Context menu tool execution failed:', error);
    }
  };

  const handleItemClick = async (item: ContextMenuItem) => {
    if (item.separator) return;

    // Check if this item has a submenu
    if (submenuItems.has(item.id)) {
      setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
      return;
    }

    // Execute the item handler
    await item.handler(data);
  };

  const renderMenuItem = (item: ContextMenuItem) => {
    if (item.separator) {
      return (
        <div key={item.id} className="my-1">
          <div className="h-px bg-border" />
        </div>
      );
    }

    const Icon = item.icon;
    const hasSubmenu = submenuItems.has(item.id);
    const isActive = activeSubmenu === item.id;

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item)}
        disabled={item.disabled}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-left hover:bg-accent transition-colors",
          item.disabled && "opacity-50 cursor-not-allowed",
          isActive && "bg-accent"
        )}
      >
        <div className="flex items-center space-x-3">
          {Icon && <Icon className="w-4 h-4" />}
          <span className="text-sm">{item.label}</span>
        </div>
        
        {hasSubmenu && <ChevronRight className="w-4 h-4" />}
      </button>
    );
  };

  const renderSubmenu = (items: ContextMenuItem[]) => (
    <div className="absolute left-full top-0 ml-1 w-48 bg-background border border-border rounded-md shadow-lg z-30">
      {items.map(renderMenuItem)}
    </div>
  );

  // Calculate menu position to keep it within viewport
  const getMenuStyle = () => {
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 20
    };

    // Adjust position to keep menu within viewport
    const menuWidth = 200; // Approximate menu width
    const menuHeight = menuItems.length * 40; // Approximate item height

    if (position.x + menuWidth > window.innerWidth) {
      style.right = window.innerWidth - position.x;
    } else {
      style.left = position.x;
    }

    if (position.y + menuHeight > window.innerHeight) {
      style.bottom = window.innerHeight - position.y;
    } else {
      style.top = position.y;
    }

    return style;
  };

  if (menuItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="w-48 bg-background border border-border rounded-md shadow-lg py-1"
      style={getMenuStyle()}
    >
      {menuItems.map(item => (
        <div key={item.id} className="relative">
          {renderMenuItem(item)}
          
          {/* Render submenu if active */}
          {activeSubmenu === item.id && submenuItems.has(item.id) && 
            renderSubmenu(submenuItems.get(item.id)!)
          }
        </div>
      ))}
    </div>
  );
};
