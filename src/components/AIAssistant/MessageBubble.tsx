/**
 * 消息气泡组件
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
// import rehypeKatex from 'rehype-katex';
import { cn } from '@/utils';
import { AIMessage } from '@/types/ai';
import { User, Bot, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
// import { MermaidRenderer } from './MermaidRenderer';
// import 'katex/dist/katex.min.css';

interface MessageBubbleProps {
  message: AIMessage;
  isStreaming?: boolean;
  className?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  className
}) => {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div
      className={cn(
        "flex items-start space-x-2",
        isUser && "flex-row-reverse space-x-reverse",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-accent"
        )}
      >
        {isUser ? (
          <User className="w-3 h-3" />
        ) : (
          <Bot className="w-3 h-3" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 space-y-0.5", isUser && "flex flex-col items-end")}>
        {/* Message bubble */}
        <div
          className={cn(
            "rounded px-2.5 py-1.5 max-w-[85%]",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-accent",
            isStreaming && "animate-pulse"
          )}
        >
          {isAssistant ? (
            <div className="prose prose-xs dark:prose-invert max-w-none text-xs">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  // 自定义代码块样式
                  code: ({ node, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const inline = !match;

                    return !inline ? (
                      <div className="relative group">
                        <pre className={cn("rounded p-2 overflow-x-auto text-xs", className)}>
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                        <button
                          onClick={() => {
                            const code = String(children).replace(/\n$/, '');
                            navigator.clipboard.writeText(code);
                          }}
                          className="absolute top-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="复制代码"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <code className={cn("px-1 py-0.5 rounded bg-muted text-xs", className)} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // 自定义链接样式
                  a: ({ node, children, ...props }) => (
                    <a
                      {...props}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  // 自定义表格样式
                  table: ({ node, children, ...props }) => (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border" {...props}>
                        {children}
                      </table>
                    </div>
                  )
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-xs whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Metadata */}
        <div
          className={cn(
            "flex items-center space-x-1.5 text-[10px] text-muted-foreground px-0.5",
            isUser && "justify-end"
          )}
        >
          <span>{format(message.timestamp, 'HH:mm:ss')}</span>

          {message.metadata?.tokens && (
            <span>• {message.metadata.tokens.total} tokens</span>
          )}

          {message.metadata?.error && (
            <span className="text-destructive">• 错误</span>
          )}

          {!isUser && !isStreaming && (
            <button
              onClick={handleCopy}
              className="p-0.5 hover:bg-accent rounded transition-colors"
              title="复制"
            >
              {copied ? (
                <Check className="w-2.5 h-2.5 text-green-500" />
              ) : (
                <Copy className="w-2.5 h-2.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

