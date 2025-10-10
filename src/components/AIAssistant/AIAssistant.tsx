/**
 * AI 助手主组件
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { X, Settings, Plus, MessageSquare } from 'lucide-react';
import { AIConversation, AIContext } from '@/types/ai';
import { AIAssistantService } from '@/services/AI';
import { ChatPanel } from './ChatPanel';
import { ConversationList } from './ConversationList';
import { AIConfigPanel } from './AIConfigPanel';
import { QuickCommands } from './QuickCommands';

interface AIAssistantProps {
  context?: AIContext;
  onClose?: () => void;
  className?: string;
}

type View = 'chat' | 'conversations' | 'settings';

export const AIAssistant: React.FC<AIAssistantProps> = ({
  context,
  onClose,
  className
}) => {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [conversations, setConversations] = useState<AIConversation[]>([]);

  // 加载对话列表
  useEffect(() => {
    loadConversations();
  }, []);

  // 创建或加载对话
  useEffect(() => {
    const initConversation = async () => {
      if (!currentConversation) {
        // 创建新对话
        const newConv = await AIAssistantService.createConversation('新对话', context);
        setCurrentConversation(newConv);
        await loadConversations();
      } else if (context) {
        // 更新当前对话的上下文
        await AIAssistantService.updateContext(currentConversation.id, context);
        setCurrentConversation({
          ...currentConversation,
          context
        });
      }
    };

    initConversation();
  }, [context]);

  const loadConversations = async () => {
    const convs = await AIAssistantService.getConversations();
    setConversations(convs);
  };

  const handleNewConversation = async () => {
    const newConv = await AIAssistantService.createConversation('新对话', context);
    setCurrentConversation(newConv);
    setCurrentView('chat');
    await loadConversations();
  };

  const handleSelectConversation = (conversation: AIConversation) => {
    setCurrentConversation(conversation);
    setCurrentView('chat');
  };

  const handleDeleteConversation = async (id: string) => {
    await AIAssistantService.deleteConversation(id);
    await loadConversations();

    if (currentConversation?.id === id) {
      await handleNewConversation();
    }
  };

  const handleConversationUpdated = async () => {
    await loadConversations();
    if (currentConversation) {
      const updated = await AIAssistantService.getConversation(currentConversation.id);
      if (updated) {
        setCurrentConversation(updated);
      }
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center space-x-1.5">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">AI 助手</h2>
        </div>

        <div className="flex items-center space-x-0.5">
          <button
            onClick={handleNewConversation}
            className="p-1.5 hover:bg-accent rounded transition-colors"
            title="新对话"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setCurrentView(currentView === 'conversations' ? 'chat' : 'conversations')}
            className={cn(
              "p-1.5 hover:bg-accent rounded transition-colors",
              currentView === 'conversations' && "bg-accent"
            )}
            title="对话列表"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setCurrentView(currentView === 'settings' ? 'chat' : 'settings')}
            className={cn(
              "p-1.5 hover:bg-accent rounded transition-colors",
              currentView === 'settings' && "bg-accent"
            )}
            title="设置"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-accent rounded transition-colors"
              title="关闭"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'chat' && currentConversation && (
          <div className="h-full flex flex-col">
            {/* Quick Commands */}
            <QuickCommands
              onCommandSelect={(command) => {
                // TODO: 处理快捷命令
                console.log('Quick command:', command);
              }}
              context={context}
            />
            
            {/* Chat Panel */}
            <ChatPanel
              conversation={currentConversation}
              onConversationUpdated={handleConversationUpdated}
              className="flex-1"
            />
          </div>
        )}

        {currentView === 'conversations' && (
          <ConversationList
            conversations={conversations}
            currentConversationId={currentConversation?.id}
            onSelect={handleSelectConversation}
            onDelete={handleDeleteConversation}
            onNew={handleNewConversation}
          />
        )}

        {currentView === 'settings' && (
          <AIConfigPanel />
        )}
      </div>
    </div>
  );
};

