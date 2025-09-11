import { toolboxService } from './ToolboxService';
import { toolIntegrationManager } from './ToolIntegrationManager';

interface ShortcutDefinition {
  id: string;
  key: string;
  description: string;
  category: 'tool' | 'navigation' | 'action';
  handler: (event: KeyboardEvent) => void | Promise<void>;
  condition?: () => boolean;
  preventDefault?: boolean;
}

interface ShortcutContext {
  sessionId?: string;
  selectedData?: Uint8Array;
  activePanel?: string;
  protocol?: string;
}

class KeyboardShortcutManager {
  private shortcuts = new Map<string, ShortcutDefinition>();
  private context: ShortcutContext = {};
  private enabled = true;
  private pressedKeys = new Set<string>();

  constructor() {
    this.setupEventListeners();
    this.registerDefaultShortcuts();
  }

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: ShortcutDefinition): void {
    const normalizedKey = this.normalizeKey(shortcut.key);
    this.shortcuts.set(normalizedKey, {
      ...shortcut,
      key: normalizedKey
    });
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(key: string): void {
    const normalizedKey = this.normalizeKey(key);
    this.shortcuts.delete(normalizedKey);
  }

  /**
   * Update shortcut context
   */
  updateContext(newContext: Partial<ShortcutContext>): void {
    this.context = { ...this.context, ...newContext };
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: string): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.category === category);
  }

  // Private methods
  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Clear pressed keys when window loses focus
    window.addEventListener('blur', () => {
      this.pressedKeys.clear();
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Skip if typing in input fields
    if (this.isTypingInInput(event.target as Element)) {
      return;
    }

    const key = this.getKeyFromEvent(event);
    this.pressedKeys.add(key);

    const shortcut = this.shortcuts.get(key);
    if (shortcut && this.shouldExecuteShortcut(shortcut)) {
      if (shortcut.preventDefault !== false) {
        event.preventDefault();
      }
      
      try {
        shortcut.handler(event);
      } catch (error) {
        console.error(`Shortcut handler error for ${key}:`, error);
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = this.getKeyFromEvent(event);
    this.pressedKeys.delete(key);
  }

  private getKeyFromEvent(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    
    // Handle special keys
    const specialKeys: Record<string, string> = {
      ' ': 'Space',
      'Enter': 'Enter',
      'Escape': 'Escape',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right'
    };

    const key = specialKeys[event.key] || event.key.toUpperCase();
    parts.push(key);

    return parts.join('+');
  }

  private normalizeKey(key: string): string {
    return key.split('+')
      .map(part => part.trim())
      .map(part => {
        // Normalize modifier keys
        if (part.toLowerCase() === 'cmd' || part.toLowerCase() === 'meta') {
          return 'Ctrl';
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join('+');
  }

  private isTypingInInput(target: Element): boolean {
    if (!target) return false;
    
    const tagName = target.tagName.toLowerCase();
    const inputTypes = ['input', 'textarea', 'select'];
    
    if (inputTypes.includes(tagName)) {
      return true;
    }

    // Check for contenteditable
    if (target.getAttribute('contenteditable') === 'true') {
      return true;
    }

    // Check if inside a code editor or similar
    if (target.closest('.monaco-editor, .cm-editor, [data-editor]')) {
      return true;
    }

    return false;
  }

  private shouldExecuteShortcut(shortcut: ShortcutDefinition): boolean {
    if (shortcut.condition) {
      return shortcut.condition();
    }
    return true;
  }

  private registerDefaultShortcuts(): void {
    // Tool shortcuts
    this.register({
      id: 'open-toolbox',
      key: 'Ctrl+T',
      description: '打开工具箱',
      category: 'navigation',
      handler: () => {
        // Navigate to toolbox page
        window.location.hash = '#/toolbox';
      }
    });

    this.register({
      id: 'toggle-tool-panel',
      key: 'Ctrl+Shift+T',
      description: '切换工具面板',
      category: 'navigation',
      handler: () => {
        // Toggle tool panel in session page
        document.dispatchEvent(new CustomEvent('toggle-tool-panel'));
      }
    });

    // Quick tool shortcuts
    this.register({
      id: 'quick-hex-to-ascii',
      key: 'Ctrl+H',
      description: 'Hex → ASCII 转换',
      category: 'tool',
      handler: async () => {
        if (this.context.selectedData) {
          await toolIntegrationManager.executeToolWithContext(
            'data-converter',
            {
              data: this.context.selectedData,
              metadata: { fromFormat: 'hex', toFormat: 'ascii' }
            },
            this.context
          );
        }
      },
      condition: () => !!this.context.selectedData
    });

    this.register({
      id: 'quick-ascii-to-hex',
      key: 'Ctrl+Shift+H',
      description: 'ASCII → Hex 转换',
      category: 'tool',
      handler: async () => {
        if (this.context.selectedData) {
          await toolIntegrationManager.executeToolWithContext(
            'data-converter',
            {
              data: this.context.selectedData,
              metadata: { fromFormat: 'ascii', toFormat: 'hex' }
            },
            this.context
          );
        }
      },
      condition: () => !!this.context.selectedData
    });

    this.register({
      id: 'calculate-crc',
      key: 'Ctrl+R',
      description: '计算 CRC',
      category: 'tool',
      handler: async () => {
        if (this.context.selectedData) {
          await toolIntegrationManager.executeToolWithContext(
            'crc-calculator',
            {
              data: this.context.selectedData,
              metadata: { algorithmId: 'crc16-modbus' }
            },
            this.context
          );
        }
      },
      condition: () => !!this.context.selectedData
    });

    this.register({
      id: 'parse-protocol',
      key: 'Ctrl+P',
      description: '解析协议',
      category: 'tool',
      handler: async () => {
        if (this.context.selectedData) {
          await toolIntegrationManager.executeToolWithContext(
            'protocol-parser',
            {
              data: this.context.selectedData,
              metadata: { autoDetect: true }
            },
            this.context
          );
        }
      },
      condition: () => !!this.context.selectedData
    });

    this.register({
      id: 'generate-message',
      key: 'Ctrl+G',
      description: '生成报文',
      category: 'tool',
      handler: async () => {
        await toolboxService.executeTool('message-generator', {
          metadata: {
            template: 'HELLO SERVER FROM CLIENT',
            format: 'ascii'
          }
        }, this.context.sessionId);
      }
    });

    // Navigation shortcuts
    this.register({
      id: 'focus-search',
      key: 'Ctrl+F',
      description: '聚焦搜索框',
      category: 'navigation',
      handler: (event) => {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="搜索"], input[placeholder*="过滤"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });

    this.register({
      id: 'escape',
      key: 'Escape',
      description: '取消/关闭',
      category: 'navigation',
      handler: () => {
        // Close modals, panels, etc.
        document.dispatchEvent(new CustomEvent('escape-pressed'));
      },
      preventDefault: false
    });

    // View shortcuts
    this.register({
      id: 'toggle-hex-view',
      key: 'Ctrl+1',
      description: '切换到 Hex 视图',
      category: 'navigation',
      handler: () => {
        document.dispatchEvent(new CustomEvent('set-view-mode', { detail: 'hex' }));
      }
    });

    this.register({
      id: 'toggle-tree-view',
      key: 'Ctrl+2',
      description: '切换到解析树视图',
      category: 'navigation',
      handler: () => {
        document.dispatchEvent(new CustomEvent('set-view-mode', { detail: 'tree' }));
      }
    });

    this.register({
      id: 'toggle-timeline-view',
      key: 'Ctrl+3',
      description: '切换到时间线视图',
      category: 'navigation',
      handler: () => {
        document.dispatchEvent(new CustomEvent('set-view-mode', { detail: 'timeline' }));
      }
    });

    // Copy shortcuts
    this.register({
      id: 'copy-as-hex',
      key: 'Ctrl+Shift+C',
      description: '复制为 Hex',
      category: 'action',
      handler: async () => {
        if (this.context.selectedData) {
          const result = await toolIntegrationManager.executeToolWithContext(
            'data-converter',
            {
              data: this.context.selectedData,
              metadata: { fromFormat: 'raw', toFormat: 'hex' }
            },
            this.context
          );
          
          if (result.result) {
            await navigator.clipboard.writeText(result.result);
          }
        }
      },
      condition: () => !!this.context.selectedData
    });

    // Help shortcut
    this.register({
      id: 'show-shortcuts',
      key: 'Ctrl+?',
      description: '显示快捷键帮助',
      category: 'navigation',
      handler: () => {
        document.dispatchEvent(new CustomEvent('show-shortcuts-help'));
      }
    });
  }
}

// Export singleton instance
export const keyboardShortcutManager = new KeyboardShortcutManager();

// React hook for using shortcuts in components
import React from 'react';

export function useKeyboardShortcuts(context?: Partial<ShortcutContext>) {
  React.useEffect(() => {
    if (context) {
      keyboardShortcutManager.updateContext(context);
    }
  }, [context]);

  return {
    updateContext: (newContext: Partial<ShortcutContext>) => {
      keyboardShortcutManager.updateContext(newContext);
    },
    getShortcuts: () => keyboardShortcutManager.getShortcuts(),
    setEnabled: (enabled: boolean) => keyboardShortcutManager.setEnabled(enabled)
  };
}
