/**
 * 对话列表组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils';
import { AIConversation } from '@/types/ai';
import { MessageSquare, Trash2, Pin, Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { AIAssistantService } from '@/services/AI';

interface ConversationListProps {
  conversations: AIConversation[];
  currentConversationId?: string;
  onSelect: (conversation: AIConversation) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  className?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onSelect,
  onDelete,
  onNew,
  className
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const deletePopoverRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭删除确认框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deletePopoverRef.current && !deletePopoverRef.current.contains(event.target as Node)) {
        setDeleteConfirmId(null);
      }
    };

    if (deleteConfirmId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [deleteConfirmId]);

  const handleStartEdit = (conversation: AIConversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      AIAssistantService.updateConversation(id, { title: editTitle.trim() });
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleTogglePin = (conversation: AIConversation) => {
    AIAssistantService.updateConversation(conversation.id, {
      pinned: !conversation.pinned
    });
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  // 排序：置顶的在前，然后按更新时间
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-3 border-b">
        <button
          onClick={onNew}
          className="w-full px-2.5 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          新建对话
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sortedConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-xs">暂无对话</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group relative p-2 rounded cursor-pointer transition-colors",
                  "hover:bg-accent",
                  conversation.id === currentConversationId && "bg-accent"
                )}
                onClick={() => onSelect(conversation)}
              >
                {/* Pin indicator */}
                {conversation.pinned && (
                  <div className="absolute top-1.5 right-1.5">
                    <Pin className="w-2.5 h-2.5 text-primary fill-current" />
                  </div>
                )}

                {/* Title */}
                {editingId === conversation.id ? (
                  <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit(conversation.id);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className="flex-1 px-1.5 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(conversation.id)}
                      className="p-0.5 hover:bg-background rounded"
                    >
                      <Check className="w-3 h-3 text-green-500" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-0.5 hover:bg-background rounded"
                    >
                      <X className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start space-x-1.5">
                    <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium truncate pr-6">
                        {conversation.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {conversation.messages.length} 条消息 • {format(conversation.updatedAt, 'MM-dd HH:mm')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {editingId !== conversation.id && (
                  <div
                    className="absolute top-1.5 right-1.5 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleTogglePin(conversation)}
                      className="p-0.5 hover:bg-background rounded"
                      title={conversation.pinned ? '取消置顶' : '置顶'}
                    >
                      <Pin className={cn(
                        "w-2.5 h-2.5",
                        conversation.pinned && "fill-current text-primary"
                      )} />
                    </button>

                    <button
                      onClick={() => handleStartEdit(conversation)}
                      className="p-0.5 hover:bg-background rounded"
                      title="重命名"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => handleDeleteClick(conversation.id)}
                        className="p-0.5 hover:bg-background rounded"
                        title="删除"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-destructive" />
                      </button>

                      {/* Delete Confirmation Popover */}
                      {deleteConfirmId === conversation.id && (
                        <div
                          ref={deletePopoverRef}
                          className="absolute right-0 top-full mt-1 z-50 w-48 bg-popover border rounded-lg shadow-lg p-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs font-medium mb-2">确认删除？</p>
                          <p className="text-[10px] text-muted-foreground mb-2">
                            此操作无法撤销
                          </p>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={handleCancelDelete}
                              className="flex-1 px-2 py-1 text-[10px] border rounded hover:bg-accent transition-colors"
                            >
                              取消
                            </button>
                            <button
                              onClick={handleConfirmDelete}
                              className="flex-1 px-2 py-1 text-[10px] bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {conversation.tags && conversation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {conversation.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

