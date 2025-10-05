// Hook for initializing and managing command palette

import { useEffect } from 'react';
import { commandRegistry } from '@/services/CommandPalette';
import {
  createFileCommands,
  createViewCommands,
  createThemeCommands,
  createSessionCommands,
  createToolsCommands,
  createSettingsCommands,
  createHelpCommands
} from '@/services/CommandPalette/commands';
import { useAppStore } from '@/stores/AppStore';
import { useTheme } from '@/hooks/useTheme';
import { notificationService } from '@/services/NotificationService';

interface UseCommandPaletteOptions {
  onOpenModal?: (modalType: string) => void;
  onOpenToolbox?: () => void;
}

/**
 * Initialize command palette with all available commands
 */
export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const { onOpenModal, onOpenToolbox } = options;
  const { setTheme } = useTheme();
  const {
    toggleSidebar,
    toggleInspector,
    toggleStatusBar,
    zoomIn,
    zoomOut,
    resetZoom
  } = useAppStore();

  useEffect(() => {
    // File commands
    const fileCommands = createFileCommands({
      onNewSession: () => {
        onOpenModal?.('new-session');
      },
      onOpenFile: () => {
        notificationService.info('打开文件', '功能开发中');
      },
      onSave: () => {
        notificationService.info('保存', '功能开发中');
      },
      onExportLogs: () => {
        // Trigger export logs via Tauri event
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('export_logs').catch(console.error);
        });
      }
    });

    // View commands
    const viewCommands = createViewCommands({
      onToggleSidebar: () => {
        toggleSidebar();
      },
      onToggleInspector: () => {
        toggleInspector();
      },
      onToggleStatusBar: () => {
        toggleStatusBar();
      },
      onSearch: () => {
        notificationService.info('搜索', '请使用工具栏的搜索按钮');
      },
      onZoomIn: () => {
        zoomIn();
      },
      onZoomOut: () => {
        zoomOut();
      },
      onZoomReset: () => {
        resetZoom();
      },
      onFullscreen: () => {
        notificationService.info('全屏', '请使用 F11 键切换全屏');
      }
    });

    // Theme commands
    const themeCommands = createThemeCommands({
      onSetTheme: (theme) => {
        setTheme(theme);
      }
    });

    // Session commands
    const sessionCommands = createSessionCommands({
      onConnect: () => {
        notificationService.info('连接', '请选择一个会话并使用工具栏的连接按钮');
      },
      onDisconnect: () => {
        notificationService.info('断开连接', '请使用工具栏的连接按钮');
      },
      onToggleCapture: () => {
        notificationService.info('抓包', '请使用工具栏的抓包按钮');
      },
      onEditProtocol: () => {
        onOpenModal?.('edit-protocol');
      }
    });

    // Tools commands
    const toolsCommands = createToolsCommands({
      onOpenToolbox: () => {
        if (onOpenToolbox) {
          onOpenToolbox();
        } else {
          onOpenModal?.('toolbox');
        }
      },
      onOpenTool: (toolId) => {
        onOpenModal?.('toolbox');
        // TODO: Open specific tool
        notificationService.info('工具', `打开工具: ${toolId}`);
      }
    });

    // Settings commands
    const settingsCommands = createSettingsCommands({
      onOpenSettings: (section) => {
        onOpenModal?.('settings');
        // TODO: Navigate to specific section
      }
    });

    // Help commands
    const helpCommands = createHelpCommands({
      onOpenUserGuide: () => {
        onOpenModal?.('user-guide');
      },
      onOpenKeyboardShortcuts: () => {
        onOpenModal?.('keyboard-shortcuts');
      },
      onOpenReleaseNotes: () => {
        onOpenModal?.('release-notes');
      },
      onReportIssue: () => {
        notificationService.info('报告问题', '请访问 GitHub Issues');
      },
      onCheckUpdates: () => {
        notificationService.info('检查更新', '功能开发中');
      },
      onAbout: () => {
        onOpenModal?.('about');
      }
    });

    // Register all commands
    commandRegistry.registerMany([
      ...fileCommands,
      ...viewCommands,
      ...themeCommands,
      ...sessionCommands,
      ...toolsCommands,
      ...settingsCommands,
      ...helpCommands
    ]);

    console.log('Command palette initialized with', commandRegistry.getAllCommands().length, 'commands');

    // Cleanup on unmount
    return () => {
      // Commands will persist across component remounts
      // Only clear if needed
    };
  }, [onOpenModal, onOpenToolbox, setTheme, toggleSidebar, toggleInspector, toggleStatusBar, zoomIn, zoomOut, resetZoom]);

  return {
    commandRegistry
  };
}

