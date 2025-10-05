import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import { Search, X, Calendar, Filter, ArrowDown, ArrowUp, ArrowLeftRight, Clock } from 'lucide-react';
import { Message, DataFormat } from '@/types';
import { formatBytes, formatTimestamp } from '@/utils';
import { convertData } from '@/utils/dataConverter';

interface MessageSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onMessageSelect?: (messageId: string) => void;
}

interface SearchFilters {
  query: string;
  direction: 'all' | 'in' | 'out';
  startTime?: Date;
  endTime?: Date;
  useRegex: boolean;
  caseSensitive: boolean;
  searchFormat: DataFormat;
}

export const MessageSearchDialog: React.FC<MessageSearchDialogProps> = ({
  isOpen,
  onClose,
  messages,
  onMessageSelect
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    direction: 'all',
    useRegex: false,
    caseSensitive: false,
    searchFormat: 'hex'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // 搜索消息
  const searchResults = useMemo(() => {
    if (!filters.query) return messages;

    return messages.filter(message => {
      // 方向筛选
      if (filters.direction !== 'all' && message.direction !== filters.direction) {
        return false;
      }

      // 时间范围筛选
      if (filters.startTime && message.timestamp < filters.startTime) {
        return false;
      }
      if (filters.endTime && message.timestamp > filters.endTime) {
        return false;
      }

      // 内容搜索
      try {
        const dataStr = convertData(message.data, 'hex', filters.searchFormat);
        
        if (filters.useRegex) {
          const regex = new RegExp(filters.query, filters.caseSensitive ? '' : 'i');
          return regex.test(dataStr);
        } else {
          if (filters.caseSensitive) {
            return dataStr.includes(filters.query);
          } else {
            return dataStr.toLowerCase().includes(filters.query.toLowerCase());
          }
        }
      } catch (error) {
        console.error('Search error:', error);
        return false;
      }
    });
  }, [messages, filters]);

  const handleMessageClick = (messageId: string) => {
    onMessageSelect?.(messageId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">消息搜索</h2>
            <span className="text-sm text-muted-foreground">
              ({searchResults.length} / {messages.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索消息内容..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilters({ ...filters, direction: 'all' })}
              className={cn(
                "flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors",
                filters.direction === 'all'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>全部</span>
            </button>
            <button
              onClick={() => setFilters({ ...filters, direction: 'in' })}
              className={cn(
                "flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors",
                filters.direction === 'in'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>接收</span>
            </button>
            <button
              onClick={() => setFilters({ ...filters, direction: 'out' })}
              className={cn(
                "flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors",
                filters.direction === 'out'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>发送</span>
            </button>

            <div className="flex-1" />

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm bg-muted hover:bg-muted/80 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>高级筛选</span>
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div>
                <label className="block text-sm font-medium mb-1">搜索格式</label>
                <select
                  value={filters.searchFormat}
                  onChange={(e) => setFilters({ ...filters, searchFormat: e.target.value as DataFormat })}
                  className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-sm"
                >
                  <option value="hex">十六进制</option>
                  <option value="ascii">ASCII</option>
                  <option value="utf8">UTF-8</option>
                  <option value="decimal">十进制</option>
                  <option value="binary">二进制</option>
                  <option value="base64">Base64</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.useRegex}
                    onChange={(e) => setFilters({ ...filters, useRegex: e.target.checked })}
                    className="rounded"
                  />
                  <span>使用正则表达式</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.caseSensitive}
                    onChange={(e) => setFilters({ ...filters, caseSensitive: e.target.checked })}
                    className="rounded"
                  />
                  <span>区分大小写</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Search className="w-12 h-12 mb-2 opacity-50" />
              <p>{filters.query ? '未找到匹配的消息' : '输入关键词开始搜索'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((message) => (
                <button
                  key={message.id}
                  onClick={() => handleMessageClick(message.id)}
                  className="w-full text-left p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {message.direction === 'in' ? (
                        <ArrowDown className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowUp className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="text-sm font-medium">
                        {message.direction === 'in' ? '接收' : '发送'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(message.size)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(message.timestamp)}</span>
                    </div>
                  </div>
                  <div className="text-xs font-mono bg-muted/50 p-2 rounded overflow-hidden text-ellipsis whitespace-nowrap">
                    {convertData(message.data, 'hex', filters.searchFormat).substring(0, 100)}
                    {convertData(message.data, 'hex', filters.searchFormat).length > 100 && '...'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            找到 {searchResults.length} 条匹配消息
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

