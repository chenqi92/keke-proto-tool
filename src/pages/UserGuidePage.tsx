import React, { useState } from 'react';
import { X, BookOpen, ChevronRight } from 'lucide-react';
import { cn } from '@/utils';
import { openUrl } from '@tauri-apps/plugin-opener';

interface UserGuidePageProps {
  onClose?: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export const UserGuidePage: React.FC<UserGuidePageProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('quick-start');

  const handleLinkClick = async (href: string) => {
    console.log('[UserGuidePage] Attempting to open link:', href);
    try {
      await openUrl(href);
      console.log('[UserGuidePage] Successfully opened link');
    } catch (error) {
      console.error('[UserGuidePage] Failed to open link:', error);
      // Fallback to window.open
      try {
        window.open(href, '_blank');
      } catch (fallbackError) {
        console.error('[UserGuidePage] Fallback also failed:', fallbackError);
      }
    }
  };

  const guideSections: GuideSection[] = [
    {
      id: 'quick-start',
      title: '快速开始',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">快速开始</h2>
          <p className="text-foreground leading-relaxed">
            欢迎使用 ProtoTool！这是一款功能强大的网络协议分析和测试工具，支持多种网络协议的连接、数据收发和分析。
          </p>

          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">创建第一个会话</h3>
          <ol className="list-decimal list-inside space-y-2 text-foreground">
            <li>点击左侧工作区的"新建会话"按钮</li>
            <li>选择协议类型（TCP、UDP、WebSocket、MQTT、SSE 或 Modbus）</li>
            <li>选择连接类型（客户端或服务端）</li>
            <li>配置连接参数（地址、端口等）</li>
            <li>点击"创建"按钮</li>
            <li>在会话列表中找到新创建的会话，点击"连接"按钮</li>
          </ol>

          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">发送和接收数据</h3>
          <ol className="list-decimal list-inside space-y-2 text-foreground">
            <li>连接成功后，在右侧数据面板的发送区域输入数据</li>
            <li>选择数据格式（文本、十六进制、Base64 等）</li>
            <li>点击"发送"按钮</li>
            <li>接收到的数据会实时显示在接收区域</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'protocols',
      title: '支持的协议',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">支持的协议</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">TCP (Transmission Control Protocol)</h3>
              <p className="text-foreground leading-relaxed mb-2">
                可靠的、面向连接的传输层协议。适用于需要保证数据完整性和顺序的场景。
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>支持客户端和服务端模式</li>
                <li>自动重连功能</li>
                <li>支持多客户端连接（服务端模式）</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">UDP (User Datagram Protocol)</h3>
              <p className="text-foreground leading-relaxed mb-2">
                快速的、无连接的传输层协议。适用于对实时性要求高、可以容忍少量数据丢失的场景。
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>支持客户端和服务端模式</li>
                <li>低延迟数据传输</li>
                <li>支持广播和组播</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">WebSocket</h3>
              <p className="text-foreground leading-relaxed mb-2">
                基于 TCP 的全双工通信协议。适用于需要实时双向通信的 Web 应用。
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>支持客户端和服务端模式</li>
                <li>支持文本和二进制消息</li>
                <li>自动心跳保活</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">MQTT (Message Queuing Telemetry Transport)</h3>
              <p className="text-foreground leading-relaxed mb-2">
                轻量级的发布/订阅消息传输协议。适用于物联网和低带宽场景。
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>支持 QoS 0、1、2 三种服务质量等级</li>
                <li>支持主题订阅和发布</li>
                <li>支持遗嘱消息和保留消息</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">SSE (Server-Sent Events)</h3>
              <p className="text-foreground leading-relaxed mb-2">
                服务器向客户端推送事件的单向通信协议。适用于服务器主动推送数据的场景。
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>支持事件流接收</li>
                <li>自动重连机制</li>
                <li>支持事件过滤</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Modbus</h3>
              <p className="text-foreground leading-relaxed mb-2">
                工业自动化领域广泛使用的通信协议。支持 Modbus TCP 和 Modbus RTU。
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>支持读写线圈、离散输入、保持寄存器、输入寄存器</li>
                <li>支持多种功能码</li>
                <li>支持从站模拟</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'session-management',
      title: '会话管理',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">会话管理</h2>

          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">创建会话</h3>
          <p className="text-foreground leading-relaxed">
            在工作区页面点击"新建会话"按钮，填写会话配置信息后创建。每个会话都有唯一的 ID 和名称。
          </p>

          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">连接和断开</h3>
          <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
            <li>点击会话卡片上的"连接"按钮建立连接</li>
            <li>连接成功后按钮变为"断开"</li>
            <li>会话状态会实时更新（已连接/已断开/连接中/错误）</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">会话操作</h3>
          <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
            <li><strong>复制</strong>：快速创建相同配置的新会话</li>
            <li><strong>编辑</strong>：修改会话配置（需要先断开连接）</li>
            <li><strong>删除</strong>：删除不需要的会话</li>
            <li><strong>导出</strong>：导出会话配置和数据</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">会话筛选</h3>
          <p className="text-foreground leading-relaxed">
            使用顶部的筛选器可以按协议类型、连接状态等条件筛选会话列表。
          </p>
        </div>
      ),
    },
    {
      id: 'toolbox',
      title: '工具箱',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">工具箱功能</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">报文生成器</h3>
              <p className="text-foreground leading-relaxed">
                根据协议规则生成标准格式的数据包，支持自定义字段值和自动计算校验和。
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">协议解析器</h3>
              <p className="text-foreground leading-relaxed">
                自动识别和解析接收到的协议数据，将原始字节流转换为结构化的字段信息。支持自定义解析规则。
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">数据转换器</h3>
              <p className="text-foreground leading-relaxed">
                提供多种数据格式转换功能：
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>文本 ↔ 十六进制</li>
                <li>Base64 编码/解码</li>
                <li>URL 编码/解码</li>
                <li>JSON 格式化</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">CRC 校验计算器</h3>
              <p className="text-foreground leading-relaxed">
                支持多种 CRC 算法（CRC8、CRC16、CRC32 等），可用于数据完整性验证。
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">时间戳转换器</h3>
              <p className="text-foreground leading-relaxed">
                Unix 时间戳与人类可读时间格式之间的相互转换，支持毫秒和秒级精度。
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'data-formats',
      title: '数据格式',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">数据格式</h2>

          <p className="text-foreground leading-relaxed">
            ProtoTool 支持多种数据格式的发送和显示：
          </p>

          <div className="space-y-4 mt-4">
            <div className="border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">文本 (Text)</h3>
              <p className="text-muted-foreground text-sm">
                UTF-8 编码的文本数据，适用于可读的字符串内容。
              </p>
              <code className="block mt-2 bg-muted p-2 rounded text-sm">
                Hello, ProtoTool!
              </code>
            </div>

            <div className="border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">十六进制 (Hex)</h3>
              <p className="text-muted-foreground text-sm">
                以十六进制格式显示的字节数据，每个字节用两位十六进制数表示。
              </p>
              <code className="block mt-2 bg-muted p-2 rounded text-sm">
                48 65 6C 6C 6F 2C 20 50 72 6F 74 6F 54 6F 6F 6C 21
              </code>
            </div>

            <div className="border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">Base64</h3>
              <p className="text-muted-foreground text-sm">
                Base64 编码的数据，常用于在文本协议中传输二进制数据。
              </p>
              <code className="block mt-2 bg-muted p-2 rounded text-sm">
                SGVsbG8sIFByb3RvVG9vbCE=
              </code>
            </div>

            <div className="border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">JSON</h3>
              <p className="text-muted-foreground text-sm">
                结构化的 JSON 数据，支持语法高亮和格式化显示。
              </p>
              <code className="block mt-2 bg-muted p-2 rounded text-sm">
                {`{"message": "Hello", "tool": "ProtoTool"}`}
              </code>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'shortcuts',
      title: '快捷键',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">快捷键</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">全局快捷键</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-foreground">新建会话</span>
                  <kbd className="px-2 py-1 bg-muted border border-border rounded text-sm">Ctrl+N</kbd>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-foreground">打开工具箱</span>
                  <kbd className="px-2 py-1 bg-muted border border-border rounded text-sm">Ctrl+T</kbd>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-foreground">搜索</span>
                  <kbd className="px-2 py-1 bg-muted border border-border rounded text-sm">Ctrl+F</kbd>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-foreground">设置</span>
                  <kbd className="px-2 py-1 bg-muted border border-border rounded text-sm">Ctrl+,</kbd>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">会话操作</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-foreground">连接/断开</span>
                  <kbd className="px-2 py-1 bg-muted border border-border rounded text-sm">Ctrl+Enter</kbd>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-foreground">发送数据</span>
                  <kbd className="px-2 py-1 bg-muted border border-border rounded text-sm">Ctrl+S</kbd>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="text-foreground">清空接收区</span>
                  <kbd className="px-2 py-1 bg-muted border border-border rounded text-sm">Ctrl+L</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      title: '故障排除',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">故障排除</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">无法建立连接</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li>检查目标地址和端口是否正确</li>
                <li>确认目标服务是否正在运行</li>
                <li>检查防火墙设置是否阻止了连接</li>
                <li>对于服务端模式，确认端口未被其他程序占用</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">数据发送失败</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li>确认连接状态为"已连接"</li>
                <li>检查数据格式是否正确</li>
                <li>对于 MQTT，确认已成功连接到 Broker</li>
                <li>查看应用日志获取详细错误信息</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">协议解析错误</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li>确认选择了正确的协议解析器</li>
                <li>检查接收到的数据格式是否符合协议规范</li>
                <li>尝试使用十六进制格式查看原始数据</li>
                <li>检查协议解析规则配置是否正确</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">性能问题</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                <li>限制接收区显示的消息数量</li>
                <li>定期清空历史数据</li>
                <li>关闭不需要的会话</li>
                <li>减少日志记录级别</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'faq',
      title: '常见问题',
      content: (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">常见问题</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Q: ProtoTool 支持哪些操作系统？</h3>
              <p className="text-muted-foreground ml-4">
                A: ProtoTool 基于 Tauri 框架开发，支持 Windows、macOS 和 Linux 操作系统。
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Q: 如何保存会话配置？</h3>
              <p className="text-muted-foreground ml-4">
                A: 会话配置会自动保存到本地。您也可以使用"导出"功能将配置导出为文件，方便在其他设备上导入使用。
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Q: 可以同时连接多个会话吗？</h3>
              <p className="text-muted-foreground ml-4">
                A: 可以。ProtoTool 支持同时管理和连接多个会话，每个会话独立运行，互不干扰。
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Q: 如何添加自定义协议解析器？</h3>
              <p className="text-muted-foreground ml-4">
                A: 在"协议仓库"页面可以导入自定义的协议解析规则文件（.kpt 或 .yaml 格式）。
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Q: 数据存储在哪里？</h3>
              <p className="text-muted-foreground ml-4">
                A: 会话数据和配置存储在应用的本地数据目录中。您可以在"存储方法"页面配置外部数据库存储。
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Q: 如何报告 Bug 或提出功能建议？</h3>
              <p className="text-muted-foreground ml-4">
                A: 请访问 GitHub 仓库提交 Issue，或通过"帮助 → 报告问题"菜单联系我们。
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-6xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">ProtoTool 用户指南</h2>
              <p className="text-sm text-muted-foreground">User Guide</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content - Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Table of Contents */}
          <div className="w-64 border-r border-border overflow-y-auto bg-muted/20">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">目录</h3>
              <nav className="space-y-1">
                {guideSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group",
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <span>{section.title}</span>
                    {activeSection === section.id && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {guideSections.find(s => s.id === activeSection)?.content}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              需要更多帮助？访问{' '}
              <button
                onClick={() => handleLinkClick('https://github.com/chenqi92/keke-proto-tool')}
                className="text-primary hover:underline cursor-pointer"
              >
                GitHub 仓库
              </button>
            </p>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                关闭
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
