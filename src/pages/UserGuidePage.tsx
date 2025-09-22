import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { X, ExternalLink, Github, Mail, BookOpen } from 'lucide-react';
import { cn } from '@/utils';
import { openPath } from '@tauri-apps/plugin-opener';

interface UserGuidePageProps {
  onClose?: () => void;
}

export const UserGuidePage: React.FC<UserGuidePageProps> = ({ onClose }) => {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMarkdownContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 在开发环境中，直接从 public 目录加载
        // 在生产环境中，需要确保文件被正确打包
        const response = await fetch('/docs/user-guide.md');
        
        if (!response.ok) {
          throw new Error(`Failed to load user-guide.md: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        setMarkdownContent(content);
      } catch (err) {
        console.error('Error loading user-guide.md:', err);
        setError(err instanceof Error ? err.message : 'Failed to load content');
        
        // 提供备用内容
        setMarkdownContent(`
# ProtoTool 用户指南

欢迎使用 **ProtoTool**！本指南将帮助您快速上手并充分利用这款强大的网络协议分析工具。

## 🚀 快速开始

### 创建第一个会话
1. 点击"新建会话"按钮
2. 选择协议类型（TCP、UDP、WebSocket等）
3. 配置连接参数
4. 建立连接并开始分析

## 📡 支持的协议

- **TCP**：可靠的面向连接协议
- **UDP**：快速的无连接协议  
- **WebSocket**：实时双向通信
- **MQTT**：轻量级消息队列协议
- **SSE**：服务器推送事件

## 🛠️ 工具箱功能

- **报文生成器**：创建和发送自定义数据包
- **协议解析器**：自动识别和解析协议数据
- **数据转换器**：各种格式转换工具
- **CRC 校验**：数据完整性验证
- **时间戳转换**：时间格式转换工具

## 📊 分析功能

- **实时监控**：实时捕获和显示网络数据
- **历史记录**：完整的通信记录保存
- **数据过滤**：按条件筛选显示内容
- **协议解析**：结构化显示协议内容

## 🔧 故障排除

如果遇到问题，请检查：
1. 网络连接是否正常
2. 目标地址和端口是否正确
3. 防火墙设置是否允许连接
4. 查看应用程序日志获取详细错误信息

## 📞 获取帮助

- 查看在线文档
- 访问 GitHub 仓库
- 联系技术支持：hi@kkape.com

---

**注意**：由于无法加载完整的用户指南文档，这里显示的是简化版本。请确保 user-guide.md 文件存在于 public/docs/ 目录中。
        `);
      } finally {
        setLoading(false);
      }
    };

    loadMarkdownContent();
  }, []);

  const handleLinkClick = async (href: string) => {
    try {
      // 检查是否在 Tauri 环境中
      if (typeof window !== 'undefined' && window.__TAURI__) {
        // 在 Tauri 应用中打开外部链接
        if (href.startsWith('http')) {
          await openPath(href);
        } else if (href.startsWith('mailto:')) {
          await openPath(href);
        } else if (href.includes('@') && !href.startsWith('http')) {
          // 处理纯邮箱地址
          await openPath(`mailto:${href}`);
        }
      } else {
        // 在浏览器环境中直接使用 window.open
        if (href.startsWith('http')) {
          window.open(href, '_blank');
        } else if (href.startsWith('mailto:')) {
          window.open(href);
        } else if (href.includes('@') && !href.startsWith('http')) {
          window.open(`mailto:${href}`);
        }
      }
    } catch (error) {
      console.error('Failed to open link:', error);
      // 作为最后的回退，尝试使用 window.open
      if (typeof window !== 'undefined') {
        try {
          if (href.startsWith('http')) {
            window.open(href, '_blank');
          } else if (href.startsWith('mailto:')) {
            window.open(href);
          } else if (href.includes('@') && !href.startsWith('http')) {
            window.open(`mailto:${href}`);
          }
        } catch (fallbackError) {
          console.error('Fallback link opening also failed:', fallbackError);
          // 显示用户友好的错误消息
          alert(`无法打开链接: ${href}\n请手动复制链接到浏览器中打开。`);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <img 
              src="../icons/windows-icon.png" 
              alt="ProtoTool Logo" 
              className="w-12 h-12 object-contain"
            />
            <h2 className="text-xl font-semibold text-foreground">ProtoTool 用户指南</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">加载中...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-destructive mb-2">加载失败</div>
              <div className="text-sm text-muted-foreground">{error}</div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  // 自定义链接组件
                  a: ({ href, children, ...props }) => (
                    <a
                      {...props}
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        if (href) handleLinkClick(href);
                      }}
                      className="text-primary hover:text-primary/80 underline cursor-pointer inline-flex items-center gap-1"
                    >
                      {children}
                      {href?.startsWith('http') && <ExternalLink className="w-3 h-3" />}
                      {href?.startsWith('mailto:') && <Mail className="w-3 h-3" />}
                    </a>
                  ),
                  // 自定义标题样式 - 隐藏 h1 标题
                  h1: ({ children, ...props }) => null,
                  h2: ({ children, ...props }) => (
                    <h2 {...props} className="text-2xl font-bold text-foreground mt-8 mb-4 pb-2 border-b border-border">
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 {...props} className="text-xl font-semibold text-foreground mt-6 mb-3">
                      {children}
                    </h3>
                  ),
                  h4: ({ children, ...props }) => (
                    <h4 {...props} className="text-lg font-medium text-foreground mt-4 mb-2">
                      {children}
                    </h4>
                  ),
                  // 自定义段落样式
                  p: ({ children, ...props }) => (
                    <p {...props} className="text-foreground mb-4 leading-relaxed">
                      {children}
                    </p>
                  ),
                  // 自定义列表样式
                  ul: ({ children, ...props }) => (
                    <ul {...props} className="list-disc list-inside text-foreground mb-4 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol {...props} className="list-decimal list-inside text-foreground mb-4 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }) => (
                    <li {...props} className="text-foreground">
                      {children}
                    </li>
                  ),
                  // 自定义代码样式
                  code: ({ children, className, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code {...props} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                        {children}
                      </code>
                    ) : (
                      <code {...props} className={className}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children, ...props }) => (
                    <pre {...props} className="bg-muted p-4 rounded-md overflow-x-auto mb-4">
                      {children}
                    </pre>
                  ),
                  // 自定义引用样式
                  blockquote: ({ children, ...props }) => (
                    <blockquote {...props} className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-4">
                      {children}
                    </blockquote>
                  ),
                  // 自定义图片样式
                  img: ({ src, alt, ...props }) => (
                    <img
                      {...props}
                      src={src}
                      alt={alt}
                      className="max-w-16 max-h-16 w-auto h-auto object-contain mx-auto mb-4 rounded"
                    />
                  ),
                  // 自定义表格样式
                  table: ({ children, ...props }) => (
                    <div className="overflow-x-auto mb-4">
                      <table {...props} className="min-w-full border-collapse border border-border">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children, ...props }) => (
                    <th {...props} className="border border-border bg-muted px-4 py-2 text-left font-medium">
                      {children}
                    </th>
                  ),
                  td: ({ children, ...props }) => (
                    <td {...props} className="border border-border px-4 py-2">
                      {children}
                    </td>
                  ),
                  // 自定义分隔线样式
                  hr: ({ ...props }) => (
                    <hr {...props} className="border-border my-8" />
                  ),
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
