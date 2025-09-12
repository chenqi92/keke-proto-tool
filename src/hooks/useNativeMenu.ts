import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useTheme } from '@/hooks/useTheme';

interface UseNativeMenuProps {
  onOpenModal: (modalType: string) => void;
}

export const useNativeMenu = ({ onOpenModal }: UseNativeMenuProps) => {
  const { setTheme, setColorTheme } = useTheme();

  useEffect(() => {
    const unlisten = listen<string>('menu-action', (event) => {
      const action = event.payload;
      console.log('Native menu action:', action);
      
      switch (action) {
        // 文件菜单
        case 'new_session':
          console.log('New Session');
          // TODO: 实现新建会话逻辑
          break;
        case 'new_workspace':
          console.log('New Workspace');
          // TODO: 实现新建工作区逻辑
          break;
        case 'open':
          console.log('Open');
          // TODO: 实现打开文件逻辑
          break;
        case 'save':
          console.log('Save');
          // TODO: 实现保存逻辑
          break;
        case 'save_as':
          console.log('Save As');
          // TODO: 实现另存为逻辑
          break;
        case 'import_config':
          console.log('Import Config');
          // TODO: 实现导入配置逻辑
          break;
        case 'export_config':
          console.log('Export Config');
          // TODO: 实现导出配置逻辑
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
          console.log('Start Capture');
          // TODO: 实现开始抓包逻辑
          break;
        case 'stop_capture':
          console.log('Stop Capture');
          // TODO: 实现停止抓包逻辑
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
          // TODO: 实现用户指南逻辑
          break;
        case 'keyboard_shortcuts':
          console.log('Keyboard Shortcuts');
          // TODO: 实现键盘快捷键逻辑
          break;
        case 'release_notes':
          console.log('Release Notes');
          // TODO: 实现版本说明逻辑
          break;
        case 'report_issue':
          console.log('Report Issue');
          // TODO: 实现报告问题逻辑
          break;
        case 'check_updates':
          console.log('Check Updates');
          // TODO: 实现检查更新逻辑
          break;

        default:
          console.log('Unknown menu action:', action);
          break;
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [onOpenModal, setTheme, setColorTheme]);
};
