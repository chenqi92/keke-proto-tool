import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { showOpenDialog, showSaveDialog, readTextFile, writeTextFile } from '@/utils/tauri';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/stores/AppStore';
import { useSession } from '@/contexts/SessionContext';
import { notificationService } from '@/services/NotificationService';

interface UseNativeMenuProps {
  onOpenModal: (modalType: string) => void;
  onCheckUpdates?: () => void;
  onOpenSearch?: () => void;
}

export const useNativeMenu = ({ onOpenModal, onCheckUpdates, onOpenSearch }: UseNativeMenuProps) => {
  const { setTheme, setColorTheme } = useTheme();
  const { selectedNode } = useSession();
  const startRecording = useAppStore(state => state.startRecording);
  const stopRecording = useAppStore(state => state.stopRecording);
  const sessions = useAppStore(state => state.sessions);
  const clearAllSessions = useAppStore(state => state.clearAllSessions);
  const loadSessions = useAppStore(state => state.loadSessions);
  const currentSession = useAppStore(state =>
    selectedNode?.config ? state.sessions[selectedNode.config.id] : null
  );

  // 工作区管理函数
  const handleNewWorkspace = useCallback(async () => {
    if (Object.keys(sessions).length > 0) {
      const confirmed = await notificationService.confirm({
        title: '创建新工作区',
        message: '创建新工作区将清空当前所有会话，是否继续？',
        variant: 'warning',
        confirmText: '继续',
        cancelText: '取消'
      });
      if (!confirmed) return;
    }
    clearAllSessions();
    notificationService.success('新工作区已创建');
    console.log('[useNativeMenu] New workspace created');
  }, [sessions, clearAllSessions]);

  const handleOpenWorkspace = useCallback(async () => {
    try {
      const filePath = await showOpenDialog({
        title: '打开工作区',
        filters: [{
          name: 'ProtoTool Workspace',
          extensions: ['json']
        }],
        multiple: false
      });

      if (filePath && typeof filePath === 'string') {
        const content = await readTextFile(filePath);
        const workspaceData = JSON.parse(content);

        if (workspaceData.sessions) {
          loadSessions(workspaceData.sessions);
          console.log('[useNativeMenu] Workspace loaded successfully');
          notificationService.success('工作区加载成功', `已加载 ${Object.keys(workspaceData.sessions).length} 个会话`);
        }
      }
    } catch (error) {
      console.error('[useNativeMenu] Failed to open workspace:', error);
      notificationService.error('打开工作区失败', String(error));
    }
  }, [loadSessions]);

  const handleSaveWorkspace = useCallback(async (saveAs: boolean = false) => {
    try {
      const workspaceData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        sessions: sessions
      };

      const filePath = await showSaveDialog({
        title: saveAs ? '工作区另存为' : '保存工作区',
        defaultPath: `workspace-${Date.now()}.json`,
        filters: [{
          name: 'ProtoTool Workspace',
          extensions: ['json']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, JSON.stringify(workspaceData, null, 2));
        console.log('[useNativeMenu] Workspace saved successfully');
        notificationService.success('工作区保存成功', `已保存 ${Object.keys(sessions).length} 个会话`);
      }
    } catch (error) {
      console.error('[useNativeMenu] Failed to save workspace:', error);
      notificationService.error('保存工作区失败', String(error));
    }
  }, [sessions]);

  const handleImportConfig = useCallback(async () => {
    try {
      const filePath = await showOpenDialog({
        title: '导入配置',
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }],
        multiple: false
      });

      if (filePath && typeof filePath === 'string') {
        const content = await readTextFile(filePath);
        const config = JSON.parse(content);
        // TODO: 实现配置导入逻辑
        console.log('[useNativeMenu] Config imported:', config);
        notificationService.success('配置导入成功');
      }
    } catch (error) {
      console.error('[useNativeMenu] Failed to import config:', error);
      notificationService.error('导入配置失败', String(error));
    }
  }, []);

  const handleExportConfig = useCallback(async () => {
    try {
      const config = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        sessions: sessions
      };

      const filePath = await showSaveDialog({
        title: '导出配置',
        defaultPath: `config-${Date.now()}.json`,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, JSON.stringify(config, null, 2));
        console.log('[useNativeMenu] Config exported successfully');
        notificationService.success('配置导出成功');
      }
    } catch (error) {
      console.error('[useNativeMenu] Failed to export config:', error);
      notificationService.error('导出配置失败', String(error));
    }
  }, [sessions]);

  const handleExportLogs = useCallback(async () => {
    try {
      const filePath = await showSaveDialog({
        title: '导出日志',
        defaultPath: `logs-${Date.now()}.txt`,
        filters: [{
          name: 'Text Files',
          extensions: ['txt']
        }, {
          name: 'JSON Files',
          extensions: ['json']
        }]
      });

      if (filePath) {
        // TODO: 从日志系统获取日志数据
        const logs = 'Log export functionality - to be implemented';
        await writeTextFile(filePath, logs);
        console.log('[useNativeMenu] Logs exported successfully');
        notificationService.success('日志导出成功');
      }
    } catch (error) {
      console.error('[useNativeMenu] Failed to export logs:', error);
      notificationService.error('导出日志失败', String(error));
    }
  }, []);

  useEffect(() => {
    console.log('[useNativeMenu] Setting up event listener with onOpenModal:', typeof onOpenModal);

    const handleMenuAction = (action: string) => {
      console.log('[useNativeMenu] Native menu action received:', action);
      
      switch (action) {
        // 文件菜单
        case 'new_session':
          console.log('[useNativeMenu] New Session');
          onOpenModal('new-session');
          break;
        case 'new_workspace':
          console.log('[useNativeMenu] New Workspace');
          handleNewWorkspace();
          break;
        case 'open_workspace':
          console.log('[useNativeMenu] Open Workspace');
          handleOpenWorkspace();
          break;
        case 'save_workspace':
          console.log('[useNativeMenu] Save Workspace');
          handleSaveWorkspace(false);
          break;
        case 'save_workspace_as':
          console.log('[useNativeMenu] Save Workspace As');
          handleSaveWorkspace(true);
          break;
        case 'import_config':
          console.log('[useNativeMenu] Import Config');
          handleImportConfig();
          break;
        case 'export_config':
          console.log('[useNativeMenu] Export Config');
          handleExportConfig();
          break;
        case 'export_logs':
          console.log('[useNativeMenu] Export Logs');
          handleExportLogs();
          break;

        // 编辑菜单
        case 'find':
          console.log('Find');
          // TODO: 实现查找逻辑
          break;
        case 'replace':
          console.log('Replace');
          // TODO: 实现替换逻辑
          break;

        // 视图菜单
        case 'command_palette':
          console.log('Command Palette');
          // TODO: 实现命令面板逻辑
          break;

        // 主题风格
        case 'theme_light':
          setTheme('light');
          break;
        case 'theme_dark':
          setTheme('dark');
          break;
        case 'theme_system':
          setTheme('system');
          break;

        // 主题色
        case 'color_default':
          setColorTheme('default');
          break;
        case 'color_slate':
          setColorTheme('slate');
          break;
        case 'color_gray':
          setColorTheme('gray');
          break;
        case 'color_zinc':
          setColorTheme('zinc');
          break;
        case 'color_neutral':
          setColorTheme('neutral');
          break;
        case 'color_stone':
          setColorTheme('stone');
          break;
        case 'color_red':
          setColorTheme('red');
          break;
        case 'color_orange':
          setColorTheme('orange');
          break;
        case 'color_amber':
          setColorTheme('amber');
          break;
        case 'color_yellow':
          setColorTheme('yellow');
          break;
        case 'color_lime':
          setColorTheme('lime');
          break;
        case 'color_green':
          setColorTheme('green');
          break;
        case 'color_emerald':
          setColorTheme('emerald');
          break;
        case 'color_teal':
          setColorTheme('teal');
          break;
        case 'color_cyan':
          setColorTheme('cyan');
          break;
        case 'color_sky':
          setColorTheme('sky');
          break;
        case 'color_blue':
          setColorTheme('blue');
          break;
        case 'color_indigo':
          setColorTheme('indigo');
          break;
        case 'color_violet':
          setColorTheme('violet');
          break;
        case 'color_purple':
          setColorTheme('purple');
          break;
        case 'color_fuchsia':
          setColorTheme('fuchsia');
          break;
        case 'color_pink':
          setColorTheme('pink');
          break;
        case 'color_rose':
          setColorTheme('rose');
          break;
        case 'show_sidebar':
          console.log('Show Sidebar');
          // TODO: 实现显示侧边栏逻辑
          break;
        case 'show_inspector':
          console.log('Show Inspector');
          // TODO: 实现显示检视器逻辑
          break;
        case 'show_status_bar':
          console.log('Show Status Bar');
          // TODO: 实现显示状态栏逻辑
          break;
        case 'zoom_in':
          console.log('Zoom In');
          // TODO: 实现放大逻辑
          break;
        case 'zoom_out':
          console.log('Zoom Out');
          // TODO: 实现缩小逻辑
          break;
        case 'zoom_reset':
          console.log('Reset Zoom');
          // TODO: 实现重置缩放逻辑
          break;
        case 'fullscreen':
          console.log('Fullscreen');
          // TODO: 实现全屏逻辑
          break;

        // 会话菜单
        case 'connect':
          console.log('Connect');
          // TODO: 实现连接逻辑
          break;
        case 'disconnect':
          console.log('Disconnect');
          // TODO: 实现断开连接逻辑
          break;
        case 'send_builder':
          console.log('Send Builder');
          // TODO: 实现发送构建器逻辑
          break;
        case 'start_capture':
          if (selectedNode?.config && currentSession && !currentSession.isRecording) {
            startRecording(selectedNode.config.id);
            console.log('Started recording session:', selectedNode.config.id);
          }
          break;
        case 'stop_capture':
          if (selectedNode?.config && currentSession && currentSession.isRecording) {
            stopRecording(selectedNode.config.id);
            console.log('Stopped recording session:', selectedNode.config.id);
          }
          break;
        case 'apply_rule':
          console.log('Apply Rule');
          // TODO: 实现应用规则逻辑
          break;
        case 'bind_protocol':
          console.log('Bind Protocol');
          // TODO: 实现绑定协议逻辑
          break;
        case 'snapshot':
          console.log('Snapshot');
          // TODO: 实现快照和标记逻辑
          break;
        case 'open_playback':
          console.log('Open Playback');
          onOpenModal('playback');
          break;
        case 'session_settings':
          console.log('Session Settings');
          // TODO: 实现会话设置逻辑
          break;

        // 工具菜单
        case 'open_toolbox':
          console.log('Open Toolbox');
          onOpenModal('toolbox');
          break;
        case 'message_generator':
          console.log('Message Generator');
          // TODO: 实现报文生成器逻辑
          break;
        case 'protocol_parser':
          console.log('Protocol Parser');
          // TODO: 实现协议解析器逻辑
          break;
        case 'log_extractor':
          console.log('Log Extractor');
          // TODO: 实现日志提取器逻辑
          break;
        case 'hex_converter':
          console.log('Hex Converter');
          // TODO: 实现Hex转换器逻辑
          break;
        case 'base64_converter':
          console.log('Base64 Converter');
          // TODO: 实现Base64转换器逻辑
          break;
        case 'crc_suite':
          console.log('CRC Suite');
          // TODO: 实现CRC校验套件逻辑
          break;
        case 'timestamp_suite':
          console.log('Timestamp Suite');
          // TODO: 实现时间戳套件逻辑
          break;
        case 'ai_assistant':
          console.log('AI Assistant');
          // TODO: 实现AI助手逻辑
          break;

        // 窗口菜单
        case 'next_tab':
          console.log('Next Tab');
          // TODO: 实现下一个标签逻辑
          break;
        case 'prev_tab':
          console.log('Previous Tab');
          // TODO: 实现上一个标签逻辑
          break;

        // 帮助菜单
        case 'user_guide':
          console.log('User Guide');
          onOpenModal('user-guide');
          break;
        case 'keyboard_shortcuts':
          console.log('Keyboard Shortcuts');
          onOpenModal('keyboard-shortcuts');
          break;
        case 'release_notes':
          console.log('Release Notes');
          onOpenModal('release-notes');
          break;
        case 'report_issue':
          console.log('Report Issue');
          onOpenModal('report-issue');
          break;
        case 'check_updates':
          console.log('Check Updates');
          if (onCheckUpdates) {
            onCheckUpdates();
          }
          break;
        case 'about':
          console.log('About ProtoTool');
          onOpenModal('about');
          break;

        default:
          console.log('Unknown menu action:', action);
          break;
      }
    };

    // 设置事件监听器
    let unlisten: (() => void) | undefined;
    let isMounted = true;

    listen('menu-action', (event: any) => {
      const action = event.payload;
      handleMenuAction(action);
    }).then((unlistenFn) => {
      if (isMounted) {
        unlisten = unlistenFn;
        console.log('[useNativeMenu] Event listener successfully set up');
      } else {
        // 如果组件已经卸载，立即清理监听器
        unlistenFn();
        console.log('[useNativeMenu] Component unmounted before listener setup, cleaned up immediately');
      }
    }).catch((error) => {
      console.error('[useNativeMenu] Failed to set up event listener:', error);
    });

    return () => {
      console.log('[useNativeMenu] Cleaning up event listener');
      isMounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, [
    onOpenModal,
    onCheckUpdates,
    onOpenSearch,
    setTheme,
    setColorTheme,
    selectedNode,
    currentSession,
    startRecording,
    stopRecording,
    handleNewWorkspace,
    handleOpenWorkspace,
    handleSaveWorkspace,
    handleImportConfig,
    handleExportConfig,
    handleExportLogs
  ]);
};
