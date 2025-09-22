import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { X, ExternalLink, Github, Mail, Heart } from 'lucide-react';
import { cn } from '@/utils';
import { openPath } from '@tauri-apps/plugin-opener';


interface AboutPageProps {
  onClose?: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onClose }) => {
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
        const response = await fetch('/docs/about.md');
        
        if (!response.ok) {
          throw new Error(`Failed to load about.md: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        setMarkdownContent(content);
      } catch (err) {
        console.error('Error loading about.md:', err);
        setError(err instanceof Error ? err.message : 'Failed to load content');
        
        // 提供备用内容
        setMarkdownContent(`
# 关于 ProtoTool

**ProtoTool** 是一款功能强大的跨平台网络协议分析工具。

## 版本信息
- **当前版本**: v0.0.11
- **构建日期**: 2025-09-22
- **许可证**: MIT License

## 开发团队
ProtoTool 由 **programApe** 开发和维护。

## 联系方式
- **邮箱**: hi@kkape.com
- **GitHub**: [https://github.com/chenqi92/keke-proto-tool](https://github.com/chenqi92/keke-proto-tool)

## 开源许可
本软件基于 MIT 许可证开源，您可以自由使用、修改和分发。
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <img
              src="../icons/windows-icon.png"
              alt="ProtoTool Logo"
              className="w-12 h-12 object-contain"
            />
            <h2 className="text-xl font-semibold text-foreground">关于 ProtoTool</h2>
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
                      {href?.startsWith('http') && (
                        <ExternalLink className="w-3 h-3 ml-1" />
                      )}
                      {(href?.startsWith('mailto:') || (href?.includes('@') && !href?.startsWith('http'))) && (
                        <Mail className="w-3 h-3 ml-1" />
                      )}
                    </a>
                  ),
                  // 自定义标题样式 - 隐藏 h1 标题
                  h1: ({ children, ...props }) => null,
                  h2: ({ children, ...props }) => (
                    <h2 {...props} className="text-2xl font-semibold text-foreground mt-8 mb-4">
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 {...props} className="text-xl font-medium text-foreground mt-6 mb-3">
                      {children}
                    </h3>
                  ),
                  // 自定义段落样式
                  p: ({ children, ...props }) => (
                    <p {...props} className="text-muted-foreground leading-relaxed mb-4">
                      {children}
                    </p>
                  ),
                  // 自定义列表样式
                  ul: ({ children, ...props }) => (
                    <ul {...props} className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol {...props} className="list-decimal list-inside space-y-2 mb-4 text-muted-foreground">
                      {children}
                    </ol>
                  ),
                  // 自定义代码块样式
                  pre: ({ children, ...props }) => (
                    <pre {...props} className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-sm">
                      {children}
                    </pre>
                  ),
                  code: ({ children, className, ...props }) => {
                    const isInline = !className;
                    return (
                      <code
                        {...props}
                        className={cn(
                          isInline
                            ? "bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                            : "font-mono text-sm",
                          className
                        )}
                      >
                        {children}
                      </code>
                    );
                  },
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
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <button
                onClick={() => handleLinkClick('https://github.com/chenqi92/keke-proto-tool')}
                className="flex items-center space-x-1 hover:text-primary transition-colors cursor-pointer"
                title="访问 GitHub 仓库"
              >
                <Github className="w-4 h-4" />
                <span>开源项目</span>
              </button>
              <button
                onClick={() => handleLinkClick('hi@kkape.com')}
                className="flex items-center space-x-1 hover:text-primary transition-colors cursor-pointer"
                title="发送邮件"
              >
                <Mail className="w-4 h-4" />
                <span>hi@kkape.com</span>
              </button>
            </div>
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

export default AboutPage;
