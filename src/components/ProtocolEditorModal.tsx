import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Download, Upload, Info, HelpCircle, AlertTriangle, Edit3, RotateCcw, Search, Replace, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';
import { MessageModal } from '@/components/Common/MessageModal';
import { invoke } from '@tauri-apps/api/core';
import { notificationService } from '@/services/NotificationService';

interface ProtocolEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
}

interface ProtocolMeta {
  name: string;
  version: string;
  author: string;
  description: string;
  supported_formats: string[];
  category: string;
  tags: string[];
}

// 默认协议模板 - 符合KPT 1.1规范
const DEFAULT_PROTOCOL_TEMPLATE = `protocol "universal-template" {
  title "通用协议模板"
  version "1.1"
  description "基于KPT 1.1规范的通用协议模板，适用于各种物联网协议"

  # 帧同步配置 - 定义如何识别和分割数据帧
  frame {
    mode length                    # 帧模式: fixed|delimited|length|stxetx|slip|cobs|hdlc
    header "##"                    # 帧头标识
    length at +2 size 4 encoding dec_ascii includes payload
    # length 字段位置: at +偏移量, 大小, 编码方式, 包含范围
  }

  # 校验配置 - 数据完整性验证
  checksum {
    type crc16                     # 校验类型: none|sum8|xor8|lrc|modbus|crc16|crc32
    store size 4 encoding hex_ascii
    range from after_header to before_checksum
    params poly 0x1021 init 0xFFFF refin off refout off xorout 0x0000
  }

  # 编解码插件 - 处理不同数据格式
  codec "kv" type kv pair ";" kvsep "=" trim
  codec "json" type json

  # 枚举定义 - 常用的状态码和命令码
  enum "status" {
    0x00 "正常"
    0x01 "告警"
    0x02 "故障"
  }

  # 消息定义 - 协议的核心解析逻辑
  message "data" {
    select pattern "*"             # 消息选择条件

    # 基础字段解析
    field header ascii size 2
    field length u32 encoding dec_ascii
    field payload ascii lenfrom "length"
    field checksum ascii size 4

    # 条件解析 - 根据载荷内容选择不同解析方式
    case when "payload.startsWith('ST=')" {
      field data codec "kv" src $payload
      compute station_id = kv(data).ST
      compute timestamp = kv(data).DataTime
    }

    case when "payload.startsWith('{')" {
      field json_data codec "json" src $payload
      compute device_id = $.json_data.device_id
      compute values = $.json_data.data
    }

    # 数据验证
    assert $.header == "##"
    assert $.length > 0 && $.length <= 65535
  }

  # 测试样例 - 验证协议解析正确性
  tests {
    sample "basic_kv" {
      raw "##0025ST=001;DataTime=20250929123000;1234"
      expect "$.message.station_id" "001"
      expect "$.frame.checksum_ok" true
    }
  }
}`;

// 默认Meta信息
const DEFAULT_META: ProtocolMeta = {
  name: "新协议",
  version: "1.0.0",
  author: "ProtoTool User",
  description: "自定义协议描述",
  supported_formats: ["ascii", "hex"],
  category: "custom",
  tags: ["custom", "protocol"]
};

// KPT 1.1 节点提示信息
const NODE_HINTS = {
  protocol: {
    title: "协议定义",
    description: "协议的基本信息和标识，每个KPT文件的根节点",
    example: `protocol "my-protocol" {
  title "我的协议"
  version "1.1"
  description "协议描述信息"
  # 其他子块...
}`
  },
  frame: {
    title: "帧同步",
    description: "定义如何识别和分割数据帧的规则",
    example: `frame {
  mode length                    # 帧模式
  header "##"                    # 帧头标识
  tail "\\r\\n"                   # 帧尾标识（delimited模式）
  length at +2 size 4 encoding dec_ascii includes payload
  escape on                      # 转义处理（slip/hdlc模式）
}`
  },
  checksum: {
    title: "校验配置",
    description: "数据完整性验证的配置",
    example: `checksum {
  type crc16                     # 校验算法
  store size 4 encoding hex_ascii
  range from after_header to before_checksum
  locator after_char "*" take 2  # 定位器（如NMEA）
  params poly 0x1021 init 0xFFFF # CRC参数
}`
  },
  envelope: {
    title: "传输封装",
    description: "承载层上下文信息（MQTT主题、CAN ID等）",
    example: `envelope mqtt {
  topic_match "plant/{site}/mn/{mn}/up/{type}"
  expose site mn type
}
envelope can {
  id_bits 11
  expose id pgn sa da prio
}`
  },
  codec: {
    title: "编解码插件",
    description: "处理不同数据格式的编解码器",
    example: `codec "kv" type kv pair ";" kvsep "=" trim
codec "json" type json
codec "pb" type protobuf schema "meter.proto" message "Reading"
codec "tlv" type tlv_ber`
  },
  enum: {
    title: "枚举定义",
    description: "定义状态码、命令码等枚举值",
    example: `enum "cmd" {
  0x01 "读取状态"
  0x02 "控制命令"
  0x03 "配置参数"
}`
  },
  catalog: {
    title: "码表/知识库",
    description: "外部数据映射表，用于代码到名称的转换",
    example: `catalog "points" csv "points.csv" key "code"
catalog "factors" inline {
  1001 "H2S" unit "mg/m3"
  1002 "CO" unit "mg/m3"
}`
  },
  units: {
    title: "单位转换",
    description: "定义单位之间的转换关系",
    example: `units {
  define "mg/m3" to "µg/m3" factor 1000
  define "Pa" to "kPa" factor 0.001
}`
  },
  message: {
    title: "消息定义",
    description: "协议的核心解析逻辑，定义字段和处理规则",
    example: `message "data" {
  select pattern "*"             # 消息选择
  field header ascii size 2     # 字段定义
  field length u16 endian big   # 数值字段
  field payload bytes lenfrom "length"

  case 0x01 {                   # 条件分支
    field temp i16 scale 0.1 unit "°C"
    field hum u16 scale 0.1 unit "%"
  }

  compute device_name = lookup("devices", $.id).name
  assert $.header == "##"       # 数据验证
}`
  },
  tests: {
    title: "测试样例",
    description: "验证协议解析正确性的测试用例",
    example: `tests {
  sample "case1" {
    raw "##0048ST=001;DataTime=20250929123000;1234"
    expect "$.message.station_id" "001"
    expect "$.frame.checksum_ok" true
  }
}`
  }
};

export const ProtocolEditorModal: React.FC<ProtocolEditorModalProps> = ({
  isOpen,
  onClose,
  onMinimize
}) => {
  const [content, setContent] = useState(DEFAULT_PROTOCOL_TEMPLATE);
  const [meta, setMeta] = useState<ProtocolMeta>(DEFAULT_META);
  const [isModified, setIsModified] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originalContentRef = useRef(DEFAULT_PROTOCOL_TEMPLATE);

  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState<{ title: string; message: string; type: 'info' | 'success' | 'error' }>({ title: '', message: '', type: 'info' });

  // Find/Replace states
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [totalMatches, setTotalMatches] = useState(0);

  // 检测内容是否被修改
  useEffect(() => {
    setIsModified(content !== originalContentRef.current);
  }, [content]);

  // 查找匹配项
  useEffect(() => {
    if (!findText) {
      setTotalMatches(0);
      setCurrentMatchIndex(-1);
      return;
    }

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const matches = content.match(regex);
    setTotalMatches(matches ? matches.length : 0);

    if (!matches || matches.length === 0) {
      setCurrentMatchIndex(-1);
    } else if (currentMatchIndex === -1) {
      setCurrentMatchIndex(0);
    } else if (currentMatchIndex >= matches.length) {
      setCurrentMatchIndex(matches.length - 1);
    }
  }, [findText, content, caseSensitive]);

  // 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F 或 Cmd+F 打开查找
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      }
      // Ctrl+H 或 Cmd+H 打开替换
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowFindReplace(true);
      }
      // Esc 关闭查找/替换
      if (e.key === 'Escape' && showFindReplace) {
        setShowFindReplace(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFindReplace]);

  // 查找下一个
  const handleFindNext = () => {
    if (totalMatches === 0) return;
    const nextIndex = (currentMatchIndex + 1) % totalMatches;
    setCurrentMatchIndex(nextIndex);
    highlightMatch(nextIndex);
  };

  // 查找上一个
  const handleFindPrevious = () => {
    if (totalMatches === 0) return;
    const prevIndex = currentMatchIndex <= 0 ? totalMatches - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    highlightMatch(prevIndex);
  };

  // 高亮当前匹配项
  const highlightMatch = (matchIndex: number) => {
    if (!textareaRef.current || !findText || totalMatches === 0) return;

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const matches = [...content.matchAll(regex)];

    if (matchIndex >= 0 && matchIndex < matches.length) {
      const match = matches[matchIndex];
      const start = match.index!;
      const end = start + match[0].length;

      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, end);
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight * (start / content.length);
    }
  };

  // 替换当前匹配项
  const handleReplaceCurrent = () => {
    if (!findText || totalMatches === 0 || currentMatchIndex === -1) return;

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const matches = [...content.matchAll(regex)];

    if (currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
      const match = matches[currentMatchIndex];
      const start = match.index!;
      const end = start + match[0].length;

      const newContent = content.substring(0, start) + replaceText + content.substring(end);
      setContent(newContent);

      // 查找下一个
      setTimeout(() => handleFindNext(), 0);
    }
  };

  // 替换全部
  const handleReplaceAll = () => {
    if (!findText) return;

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    const newContent = content.replace(regex, replaceText);

    if (newContent !== content) {
      setContent(newContent);
      notificationService.success('替换完成', `已替换 ${totalMatches} 处`);
    }
  };

  // 处理关闭确认
  const handleClose = async () => {
    if (isModified) {
      const result = await notificationService.confirm({
        title: '保存更改',
        message: '协议内容已修改，是否要保存？',
        confirmText: '保存并关闭',
        cancelText: '直接关闭',
        variant: 'warning'
      });
      if (result) {
        handleSave();
      }
    }
    onClose();
  };

  // 处理内容变化
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  // 处理Meta信息变化
  const handleMetaChange = (field: keyof ProtocolMeta, value: string | string[]) => {
    setMeta(prev => ({ ...prev, [field]: value }));
    setIsModified(true);
  };

  // 保存协议
  const handleSave = () => {
    try {
      // 这里可以添加保存逻辑
      originalContentRef.current = content;
      setIsModified(false);

      // 使用更友好的提示
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      notification.textContent = '✓ 协议已成功保存';
      document.body.appendChild(notification);

      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    } catch (error) {
      console.error('保存失败:', error);
      setDialogContent({
        title: '保存失败',
        message: '保存协议时发生错误，请重试。',
        type: 'error'
      });
      setShowSaveDialog(true);
    }
  };

  // 导出协议
  const handleExport = async () => {
    try {
      const fullProtocol = `# ${meta.name}
# ${meta.description}

meta:
  name: "${meta.name}"
  version: "${meta.version}"
  author: "${meta.author}"
  description: "${meta.description}"
  supported_formats: [${meta.supported_formats.map(f => `"${f}"`).join(', ')}]
  category: "${meta.category}"
  tags: [${meta.tags.map(t => `"${t}"`).join(', ')}]

${content}`;

      // 使用 Tauri invoke 命令调用后端文件保存功能
      const result = await invoke<{ success: boolean; path?: string; error?: string }>('save_file_dialog', {
        defaultPath: `${meta.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.kpt`,
        content: fullProtocol,
        filters: [
          {
            name: 'KPT Protocol Files',
            extensions: ['kpt']
          },
          {
            name: 'Text Files',
            extensions: ['txt']
          }
        ]
      });

      if (result.success && result.path) {
        setDialogContent({
          title: '导出成功',
          message: `协议文件已成功导出到：\n${result.path}`,
          type: 'success'
        });
        setShowExportDialog(true);
      } else if (result.error) {
        setDialogContent({
          title: '导出失败',
          message: `导出协议时发生错误：${result.error}`,
          type: 'error'
        });
        setShowExportDialog(true);
      }
      // 如果用户取消，不显示任何提示
    } catch (error) {
      console.error('导出失败:', error);
      setDialogContent({
        title: '导出失败',
        message: `导出协议时发生错误：${error}`,
        type: 'error'
      });
      setShowExportDialog(true);
    }
  };

  // 重置协议到默认状态
  const handleReset = async () => {
    const shouldReset = await notificationService.confirm({
      title: '重置协议',
      message: '确定要重置协议到默认状态吗？当前的所有更改将丢失，此操作无法撤销。',
      confirmText: '重置',
      cancelText: '取消',
      variant: 'danger'
    });
    if (shouldReset) {
      setContent(DEFAULT_PROTOCOL_TEMPLATE);
      setMeta(DEFAULT_META);
      originalContentRef.current = DEFAULT_PROTOCOL_TEMPLATE;
      setIsModified(false);

      // 显示重置成功提示
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
      notification.textContent = '✓ 协议已重置为默认状态';
      document.body.appendChild(notification);

      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    }
  };

  // 导入协议
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  // 处理文件导入
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target?.result as string;
      if (fileContent) {
        // 解析文件内容，提取meta和协议内容
        const lines = fileContent.split('\n');
        let metaStart = -1;
        let metaEnd = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim() === 'meta:') {
            metaStart = i;
          } else if (metaStart !== -1 && lines[i].match(/^[a-zA-Z]/)) {
            metaEnd = i;
            break;
          }
        }

        if (metaStart !== -1 && metaEnd !== -1) {
          const protocolContent = lines.slice(metaEnd).join('\n');
          setContent(protocolContent);
          originalContentRef.current = protocolContent;
          setIsModified(false);
        } else {
          setContent(fileContent);
          originalContentRef.current = fileContent;
          setIsModified(false);
        }
      }
    };
    reader.readAsText(file);
    
    // 重置input值以支持重复导入同一文件
    e.target.value = '';
  };

  // Don't return null when closed - just hide it to preserve component state
  // This is crucial for minimization feature to work properly
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      style={{ display: isOpen ? 'flex' : 'none' }}
    >
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">协议编辑器</h2>
            {isModified && (
              <div className="flex items-center space-x-1 text-orange-500">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">未保存</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFindReplace(!showFindReplace)}
              className={cn(showFindReplace && "bg-accent")}
            >
              <Search className="w-4 h-4 mr-1" />
              查找
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="w-4 h-4 mr-1" />
              导入
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={!isModified}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              重置
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHints(!showHints)}
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            {onMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMinimize}
                title="最小化到状态栏"
              >
                <Minus className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Meta Info */}
          <div className="w-80 border-r border-border bg-muted/30 p-4 overflow-auto">
            <h3 className="font-semibold mb-4 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              协议信息
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">协议名称</label>
                <input
                  type="text"
                  value={meta.name}
                  onChange={(e) => handleMetaChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">版本</label>
                <input
                  type="text"
                  value={meta.version}
                  onChange={(e) => handleMetaChange('version', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">作者</label>
                <input
                  type="text"
                  value={meta.author}
                  onChange={(e) => handleMetaChange('author', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={meta.description}
                  onChange={(e) => handleMetaChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background h-20 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">分类</label>
                <select
                  value={meta.category}
                  onChange={(e) => handleMetaChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="custom">自定义</option>
                  <option value="industrial">工业协议</option>
                  <option value="environmental">环境监测</option>
                  <option value="network">网络协议</option>
                  <option value="iot">物联网</option>
                </select>
              </div>
            </div>
          </div>

          {/* Center Panel - Editor */}
          <div className="flex-1 flex flex-col">
            {/* Find/Replace Panel */}
            {showFindReplace && (
              <div className="border-b border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={findText}
                      onChange={(e) => setFindText(e.target.value)}
                      placeholder="查找..."
                      className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
                      autoFocus
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {totalMatches > 0 ? `${currentMatchIndex + 1}/${totalMatches}` : '无匹配'}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleFindPrevious} disabled={totalMatches === 0}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleFindNext} disabled={totalMatches === 0}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowFindReplace(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Replace className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      placeholder="替换为..."
                      className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReplaceCurrent}
                      disabled={totalMatches === 0}
                    >
                      替换
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReplaceAll}
                      disabled={totalMatches === 0}
                    >
                      全部替换
                    </Button>
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={caseSensitive}
                        onChange={(e) => setCaseSensitive(e.target.checked)}
                        className="rounded"
                      />
                      区分大小写
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 p-4">
              <div className="relative w-full h-full">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  className="w-full h-full font-mono text-sm border border-border rounded-md p-4 bg-slate-50 dark:bg-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="在此编辑协议内容..."
                  style={{
                    lineHeight: '1.5',
                    tabSize: 2,
                    color: '#1e293b',
                  }}
                />
                {/* 编辑器背景装饰 */}
                <div className="absolute top-2 right-2 text-xs text-gray-400 pointer-events-none">
                  KPT 1.1
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Hints */}
          {showHints && (
            <div className="w-80 border-l border-border bg-muted/30 p-4 overflow-auto">
              <h3 className="font-semibold mb-4 flex items-center">
                <HelpCircle className="w-4 h-4 mr-2" />
                节点参考
              </h3>
              
              <div className="space-y-4">
                {Object.entries(NODE_HINTS).map(([key, hint]) => (
                  <div key={key} className="border border-border rounded-md">
                    <button
                      onClick={() => setActiveHint(activeHint === key ? null : key)}
                      className="w-full p-3 text-left hover:bg-accent transition-colors"
                    >
                      <div className="font-medium">{hint.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">{hint.description}</div>
                    </button>
                    
                    {activeHint === key && (
                      <div className="p-3 border-t border-border bg-background">
                        <pre className="text-xs overflow-auto whitespace-pre-wrap">
                          {hint.example}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".kpt,.yaml,.yml,.txt"
          onChange={handleFileImport}
          className="hidden"
        />

        {/* Dialogs */}
        <MessageModal
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          title={dialogContent.title}
          message={dialogContent.message}
          type={dialogContent.type}
        />

        <MessageModal
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          title={dialogContent.title}
          message={dialogContent.message}
          type={dialogContent.type}
        />
      </div>
    </div>
  );
};
