import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { X, ExternalLink, Github, Mail, FileText, ChevronDown } from 'lucide-react';
import { cn } from '@/utils';
import { openUrl } from '@tauri-apps/plugin-opener';

interface ReleaseNotesPageProps {
  onClose?: () => void;
}

interface ReleaseNote {
  version: string;
  filename: string;
  date?: string;
}

export const ReleaseNotesPage: React.FC<ReleaseNotesPageProps> = ({ onClose }) => {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('0.0.13');
  const [availableVersions] = useState<ReleaseNote[]>([
    { version: '0.0.13', filename: '0.0.13.md', date: '2025-10-05' },
    { version: '0.0.12', filename: '0.0.12.md', date: '2025-09-22' },
    { version: '0.0.11', filename: '0.0.11.md', date: '2025-09-15' },
    { version: '0.0.8', filename: '0.0.8.md', date: '2025-09-08' },
    { version: '0.0.5', filename: '0.0.5.md', date: '2025-09-05' },
    { version: '0.0.2', filename: '0.0.2.md', date: '2025-09-02' },
  ]);

  useEffect(() => {
    loadReleaseNotes(selectedVersion);
  }, [selectedVersion]);

  const loadReleaseNotes = async (version: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const versionInfo = availableVersions.find(v => v.version === version);
      if (!versionInfo) {
        throw new Error(`Version ${version} not found`);
      }

      // Try to load from release-notes directory
      const response = await fetch(`/release-notes/${versionInfo.filename}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load release notes: ${response.status} ${response.statusText}`);
      }
      
      const content = await response.text();
      setMarkdownContent(content);
    } catch (err) {
      console.error('Error loading release notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
      
      // Provide fallback content
      setMarkdownContent(`
# Version ${version}

## 📝 版本说明

无法加载版本 ${version} 的详细说明。

## 🔗 查看完整版本说明

请访问 [GitHub Releases](https://github.com/chenqi92/keke-proto-tool/releases) 查看完整的版本说明。

---

**注意**：由于无法加载完整的版本说明文档，这里显示的是简化版本。
      `);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkClick = async (href: string) => {
    console.log('[ReleaseNotesPage] Attempting to open link:', href);
    try {
      await openUrl(href);
      console.log('[ReleaseNotesPage] Successfully opened link');
    } catch (error) {
      console.error('[ReleaseNotesPage] Failed to open link:', error);
      // Fallback to window.open
      try {
        if (href.startsWith('http')) {
          window.open(href, '_blank');
        } else if (href.startsWith('mailto:')) {
          window.open(href);
        }
      } catch (fallbackError) {
        console.error('[ReleaseNotesPage] Fallback also failed:', fallbackError);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">版本说明</h2>
              <p className="text-sm text-muted-foreground">ProtoTool Release Notes</p>
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

        {/* Version Selector */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-foreground">选择版本:</label>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="bg-background border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {availableVersions.map((version) => (
                <option key={version.version} value={version.version}>
                  v{version.version} {version.date && `(${version.date})`}
                </option>
              ))}
            </select>
          </div>
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
                  h1: ({ children, ...props }) => (
                    <h1 {...props} className="text-3xl font-bold text-foreground mb-4 pb-2 border-b border-border">
                      {children}
                    </h1>
                  ),
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
                  p: ({ children, ...props }) => (
                    <p {...props} className="text-foreground mb-4 leading-relaxed">
                      {children}
                    </p>
                  ),
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
                  blockquote: ({ children, ...props }) => (
                    <blockquote {...props} className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-4">
                      {children}
                    </blockquote>
                  ),
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

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => handleLinkClick('https://github.com/chenqi92/keke-proto-tool/releases')}
              className="flex items-center space-x-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Github className="w-4 h-4" />
              <span>查看所有版本</span>
            </button>
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

export default ReleaseNotesPage;

