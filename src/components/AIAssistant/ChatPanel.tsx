/**
 * AI 聊天面板
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { AIConversation, AIStreamChunk } from '@/types/ai';
import { AIAssistantService } from '@/services/AI';
import { MessageBubble } from './MessageBubble';

interface ChatPanelProps {
  conversation: AIConversation;
  onConversationUpdated?: () => void;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  conversation,
  onConversationUpdated,
  className
}) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages, streamingContent]);

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const message = input.trim();
    setInput('');
    setError(null);
    setIsProcessing(true);
    setStreamingContent('');

    try {
      // 使用流式响应
      await AIAssistantService.sendMessageStream(
        conversation.id,
        message,
        (chunk: AIStreamChunk) => {
          setStreamingContent(chunk.content);
        },
        {
          stream: true,
          context: conversation.context
        }
      );

      setStreamingContent('');
      onConversationUpdated?.();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : '发送消息失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Warning */}
      <div className="px-3 py-1.5 bg-muted/50 border-b">
        <p className="text-[10px] text-muted-foreground text-center">
          ⚠️ AI 可能会产生错误，请验证重要信息
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {conversation.messages.length === 0 && !streamingContent && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-1">
              <p className="text-sm">开始与 AI 助手对话</p>
              <p className="text-xs">我可以帮助您分析协议、诊断问题、转换数据等</p>
            </div>
          </div>
        )}

        {conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Streaming message */}
        {streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              conversationId: conversation.id,
              role: 'assistant',
              content: streamingContent,
              timestamp: new Date()
            }}
            isStreaming
          />
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start space-x-1.5 p-2 bg-destructive/10 border border-destructive/20 rounded">
            <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-destructive">发送失败</p>
              <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-2">
        <div className="flex items-end space-x-1.5">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Shift+Enter 换行)"
              className={cn(
                "w-full px-2 py-1.5 rounded border bg-background text-sm",
                "resize-none focus:outline-none focus:ring-1 focus:ring-primary",
                "min-h-[32px] max-h-[120px]"
              )}
              rows={1}
              disabled={isProcessing}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className={cn(
              "p-1.5 rounded transition-colors flex-shrink-0",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="发送 (Enter)"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

