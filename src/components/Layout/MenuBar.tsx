import React from 'react';
import { cn } from '@/utils';

interface MenuBarProps {
  className?: string;
  onOpenModal: (modalType: string) => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  separator?: boolean;
  submenu?: MenuItem[];
  action?: () => void;
}

const createMenuStructure = (onOpenModal: (modalType: string) => void): { [key: string]: MenuItem[] } => ({
  文件: [
    { label: '新建会话', shortcut: 'Ctrl+N', action: () => console.log('New Session') },
    { label: '新建工作区', action: () => console.log('New Workspace') },
    { separator: true },
    { label: '打开', shortcut: 'Ctrl+O', action: () => console.log('Open') },
    { label: '最近打开', submenu: [
      { label: 'TCP调试会话.kkpsession', action: () => console.log('Recent 1') },
      { label: '协议解析工作区.kkpworkspace', action: () => console.log('Recent 2') },
    ]},
    { separator: true },
    { label: '保存视图', shortcut: 'Ctrl+S', action: () => console.log('Save View') },
    { label: '导入', submenu: [
      { label: '插件包', action: () => console.log('Import Plugin') },
      { label: '解析规则', action: () => console.log('Import Rules') },
      { label: '配置文件', action: () => console.log('Import Config') },
    ]},
    { label: '导出', shortcut: 'Ctrl+E', action: () => console.log('Export') },
    { separator: true },
    { label: '设置', action: () => onOpenModal('settings') },
    { separator: true },
    { label: '关闭窗口', shortcut: 'Ctrl+W', action: () => console.log('Close Window') },
  ],
  编辑: [
    { label: '撤销', shortcut: 'Ctrl+Z', action: () => console.log('Undo') },
    { label: '重做', shortcut: 'Ctrl+Y', action: () => console.log('Redo') },
    { separator: true },
    { label: '剪切', shortcut: 'Ctrl+X', action: () => console.log('Cut') },
    { label: '复制', shortcut: 'Ctrl+C', action: () => console.log('Copy') },
    { label: '粘贴', shortcut: 'Ctrl+V', action: () => console.log('Paste') },
    { label: '复制为', submenu: [
      { label: 'Hex格式', action: () => console.log('Copy as Hex') },
      { label: 'JSON格式', action: () => console.log('Copy as JSON') },
      { label: '字段格式', action: () => console.log('Copy as Fields') },
      { label: '原始数据', action: () => console.log('Copy as Raw') },
    ]},
    { separator: true },
    { label: '查找', shortcut: 'Ctrl+F', action: () => console.log('Find') },
    { label: '查找下一个', shortcut: 'F3', action: () => console.log('Find Next') },
    { label: '替换', shortcut: 'Ctrl+H', action: () => console.log('Replace') },
    { separator: true },
    { label: '全选', shortcut: 'Ctrl+A', action: () => console.log('Select All') },
  ],
  视图: [
    { label: '命令面板', shortcut: 'Ctrl+K', action: () => console.log('Command Palette') },
    { separator: true },
    { label: '切换深色模式', shortcut: 'Ctrl+J', action: () => console.log('Toggle Dark Mode') },
    { label: '界面密度', submenu: [
      { label: '紧凑', action: () => console.log('Compact') },
      { label: '标准', action: () => console.log('Standard') },
      { label: '宽松', action: () => console.log('Comfortable') },
    ]},
    { separator: true },
    { label: '布局', submenu: [
      { label: '解析三列', action: () => console.log('Three Column') },
      { label: '上下拆分', action: () => console.log('Split Vertical') },
      { label: '回放对比', action: () => console.log('Playback Compare') },
      { label: '重置布局', action: () => console.log('Reset Layout') },
    ]},
    { label: '面板', submenu: [
      { label: '显示侧边栏', action: () => console.log('Show Sidebar') },
      { label: '显示检视器', action: () => console.log('Show Inspector') },
      { label: '显示状态栏', action: () => console.log('Show Status Bar') },
    ]},
    { separator: true },
    { label: '放大', shortcut: 'Ctrl++', action: () => console.log('Zoom In') },
    { label: '缩小', shortcut: 'Ctrl+-', action: () => console.log('Zoom Out') },
    { label: '重置缩放', shortcut: 'Ctrl+0', action: () => console.log('Reset Zoom') },
    { separator: true },
    { label: '全屏', shortcut: 'F11', action: () => console.log('Full Screen') },
  ],
  会话: [
    { label: '连接', shortcut: 'Ctrl+Enter', action: () => console.log('Connect') },
    { label: '断开连接', action: () => console.log('Disconnect') },
    { separator: true },
    { label: '发送构建器', shortcut: 'Ctrl+B', action: () => console.log('Send Builder') },
    { label: '开始抓包', shortcut: 'Ctrl+R', action: () => console.log('Start Capture') },
    { label: '停止抓包', action: () => console.log('Stop Capture') },
    { separator: true },
    { label: '应用规则', action: () => console.log('Apply Rule') },
    { label: '绑定协议', action: () => console.log('Bind Protocol') },
    { separator: true },
    { label: '快照和标记', action: () => console.log('Snapshot') },
    { label: '在回放中打开', action: () => onOpenModal('playback') },
    { separator: true },
    { label: '会话设置', action: () => console.log('Session Settings') },
  ],
  工具: [
    { label: '打开工具箱', action: () => onOpenModal('toolbox') },
    { separator: true },
    { label: '报文生成器', action: () => console.log('Message Generator') },
    { label: '协议解析器', submenu: [
      { label: '离线解析', action: () => console.log('Offline Parser') },
      { label: '在线解析', action: () => console.log('Online Parser') },
    ]},
    { label: '日志提取器', action: () => console.log('Log Extractor') },
    { separator: true },
    { label: '转换器', submenu: [
      { label: 'Hex ↔ 二进制', action: () => console.log('Hex Binary') },
      { label: 'Base64 编解码', action: () => console.log('Base64') },
      { label: 'COBS/SLIP 编码', action: () => console.log('COBS SLIP') },
      { label: '字节序转换', action: () => console.log('Endian') },
      { label: 'PCAP ↔ JSON/CSV', action: () => console.log('PCAP Convert') },
    ]},
    { label: 'CRC 校验套件', action: () => console.log('CRC Suite') },
    { label: '时间戳套件', action: () => console.log('Timestamp Suite') },
    { separator: true },
    { label: '工具链设计器', action: () => console.log('Toolchain Designer') },
    { label: 'AI 助手', submenu: [
      { label: '自然语言查询', action: () => console.log('NL Query') },
      { label: '会话摘要', action: () => console.log('Session Summary') },
      { label: '异常检测', action: () => console.log('Anomaly Detection') },
      { label: '规则生成/修复', action: () => console.log('Rule Generation') },
    ]},
  ],
  日志: [
    { label: '打开日志管理', action: () => onOpenModal('logs') },
    { separator: true },
    { label: '搜索日志', shortcut: 'Ctrl+L', action: () => console.log('Search Logs') },
    { label: '已保存视图', action: () => console.log('Saved Views') },
    { separator: true },
    { label: '导出日志', action: () => console.log('Export Logs') },
    { label: '归档到 Parquet', action: () => console.log('Archive to Parquet') },
    { label: '从归档恢复', action: () => console.log('Restore from Archive') },
    { separator: true },
    { label: '打开日志文件夹', action: () => console.log('Open Logs Folder') },
    { label: '清理日志', action: () => console.log('Clean Logs') },
  ],
  插件: [
    { label: '打开插件管理', action: () => onOpenModal('plugins') },
    { separator: true },
    { label: '已安装插件', action: () => console.log('Installed Plugins') },
    { label: '插件市场', action: () => console.log('Plugin Marketplace') },
    { separator: true },
    { label: '导入插件包', action: () => console.log('Import Plugin') },
    { label: '检查插件更新', action: () => console.log('Check Plugin Updates') },
    { separator: true },
    { label: '插件诊断', action: () => console.log('Plugin Diagnostics') },
  ],
  窗口: [
    { label: '最小化', action: () => console.log('Minimize') },
    { label: '最大化', action: () => console.log('Maximize') },
    { separator: true },
    { label: '下一个标签', shortcut: 'Ctrl+Tab', action: () => console.log('Next Tab') },
    { label: '上一个标签', shortcut: 'Shift+Ctrl+Tab', action: () => console.log('Previous Tab') },
  ],
  帮助: [
    { label: '命令面板', shortcut: 'Ctrl+K', action: () => console.log('Command Palette') },
    { label: '键盘快捷键', action: () => console.log('Keyboard Shortcuts') },
    { separator: true },
    { label: '文档', action: () => console.log('Documentation') },
    { label: '发行说明', action: () => console.log('Release Notes') },
    { separator: true },
    { label: '报告问题', action: () => console.log('Report Issue') },
    { separator: true },
    { label: '关于', action: () => onOpenModal('settings-about') },
    { label: '检查更新', action: () => console.log('Check for Updates') },
  ],
});

export const MenuBar: React.FC<MenuBarProps> = ({ className, onOpenModal }) => {
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>(null);
  const menuStructure = createMenuStructure(onOpenModal);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
    setOpenSubmenu(null);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
      setActiveMenu(null);
      setOpenSubmenu(null);
    }
  };

  const renderMenuItem = (item: MenuItem, index: number, isSubmenu = false) => {
    if (item.separator) {
      return <div key={index} className="h-px bg-border my-1" />;
    }

    const hasSubmenu = item.submenu && item.submenu.length > 0;

    return (
      <div key={index} className="relative">
        <button
          className={cn(
            "w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-accent rounded-sm",
            isSubmenu && "pl-6"
          )}
          onClick={() => hasSubmenu ? setOpenSubmenu(openSubmenu === item.label ? null : item.label) : handleItemClick(item)}
          onMouseEnter={() => hasSubmenu && setOpenSubmenu(item.label)}
        >
          <span>{item.label}</span>
          <div className="flex items-center space-x-2">
            {item.shortcut && (
              <span className="text-xs text-muted-foreground">{item.shortcut}</span>
            )}
            {hasSubmenu && (
              <span className="text-xs">▶</span>
            )}
          </div>
        </button>
        
        {hasSubmenu && openSubmenu === item.label && (
          <div className="absolute left-full top-0 ml-1 min-w-48 bg-popover border border-border rounded-md shadow-lg z-50">
            <div className="py-1">
              {item.submenu!.map((subItem, subIndex) => renderMenuItem(subItem, subIndex, true))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("h-8 bg-card border-b border-border flex items-center", className)}>
      {Object.entries(menuStructure).map(([menuName, items]) => (
        <div key={menuName} className="relative">
          <button
            className={cn(
              "px-3 py-1 text-sm hover:bg-accent rounded-sm transition-colors",
              activeMenu === menuName && "bg-accent"
            )}
            onClick={() => handleMenuClick(menuName)}
          >
            {menuName}
          </button>
          
          {activeMenu === menuName && (
            <div className="absolute top-full left-0 mt-1 min-w-48 bg-popover border border-border rounded-md shadow-lg z-50">
              <div className="py-1">
                {items.map((item, index) => renderMenuItem(item, index))}
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Click outside to close */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setActiveMenu(null);
            setOpenSubmenu(null);
          }}
        />
      )}
    </div>
  );
};
