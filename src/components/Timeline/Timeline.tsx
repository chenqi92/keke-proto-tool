import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import { 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Search,
  Filter
} from 'lucide-react';

interface Message {
  id: string;
  timestamp: Date;
  direction: 'in' | 'out';
  protocol: string;
  size: number;
  data: Uint8Array;
  parsed?: any;
  status: 'success' | 'error' | 'warning';
}

interface TimelineProps {
  messages: Message[];
  selectedMessage?: Message | null;
  onMessageSelect?: (message: Message) => void;
  filter?: string;
  className?: string;
  formatData?: (message: Message) => string;
}

const getDirectionIcon = (direction: string) => {
  return direction === 'in' ? (
    <ArrowDown className="w-4 h-4 text-blue-500" />
  ) : (
    <ArrowUp className="w-4 h-4 text-green-500" />
  );
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-3 h-3 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    case 'warning':
      return <AlertCircle className="w-3 h-3 text-yellow-500" />;
    default:
      return <Info className="w-3 h-3 text-blue-500" />;
  }
};

const formatTimestamp = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
};

const formatSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getProtocolColor = (protocol: string): string => {
  // 根据协议名称生成稳定的颜色
  const hash = protocol.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const colors = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

export const Timeline: React.FC<TimelineProps> = ({
  messages,
  selectedMessage,
  onMessageSelect,
  filter = '',
  className,
  formatData
}) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilter, setShowFilter] = useState(false);
  const [localFilter, setLocalFilter] = useState('');

  // 过滤和排序消息
  const filteredMessages = useMemo(() => {
    let filtered = messages;
    
    // 应用过滤器
    const searchTerm = (filter || localFilter).toLowerCase();
    if (searchTerm) {
      filtered = messages.filter(message => 
        message.protocol.toLowerCase().includes(searchTerm) ||
        message.id.toLowerCase().includes(searchTerm) ||
        message.status.toLowerCase().includes(searchTerm)
      );
    }
    
    // 排序
    return filtered.sort((a, b) => {
      const timeA = a.timestamp.getTime();
      const timeB = b.timestamp.getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [messages, filter, localFilter, sortOrder]);

  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  if (messages.length === 0) {
    return (
      <div className={cn("h-full flex items-center justify-center text-muted-foreground", className)}>
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无消息</p>
          <p className="text-sm mt-1">开始连接后消息将显示在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Filter Bar */}
      <div className="border-b border-border p-2 bg-muted/30">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              showFilter ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            <Filter className="w-4 h-4" />
          </button>
          
          {showFilter && (
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="过滤消息..."
                value={localFilter}
                onChange={(e) => setLocalFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            {filteredMessages.length} / {messages.length} 条消息
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="grid grid-cols-12 gap-2 p-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-3 flex items-center space-x-1">
            <button
              onClick={handleSort}
              className="flex items-center space-x-1 hover:text-foreground"
            >
              <Clock className="w-3 h-3" />
              <span>时间</span>
              {sortOrder === 'asc' ? (
                <ArrowUp className="w-3 h-3" />
              ) : (
                <ArrowDown className="w-3 h-3" />
              )}
            </button>
          </div>
          <div className="col-span-1">方向</div>
          <div className="col-span-2">协议</div>
          <div className="col-span-2">大小</div>
          <div className="col-span-3">状态</div>
          <div className="col-span-1">操作</div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-border pb-4">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "grid grid-cols-12 gap-2 p-2 text-sm hover:bg-accent transition-colors",
                selectedMessage?.id === message.id && "bg-primary/10 border-l-2 border-l-primary"
              )}
              onClick={() => onMessageSelect?.(message)}
            >
              {/* Timestamp */}
              <div className="col-span-3 font-mono text-xs">
                {formatTimestamp(message.timestamp)}
              </div>

              {/* Direction */}
              <div className="col-span-1 flex items-center">
                {getDirectionIcon(message.direction)}
              </div>

              {/* Protocol */}
              <div className="col-span-2">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  getProtocolColor(message.protocol)
                )}>
                  {message.protocol}
                </span>
              </div>

              {/* Size */}
              <div className="col-span-2 font-mono text-xs">
                {formatSize(message.size)}
              </div>

              {/* Status */}
              <div className="col-span-3 flex items-center space-x-1">
                {getStatusIcon(message.status)}
                <span className="text-xs capitalize">
                  {message.status === 'success' && '成功'}
                  {message.status === 'error' && '错误'}
                  {message.status === 'warning' && '警告'}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1">
                <button
                  className="p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="查看详情"
                >
                  <Info className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="border-t border-border p-2 bg-muted/30">
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div className="text-center">
            <div className="font-medium">
              {messages.filter(m => m.direction === 'in').length}
            </div>
            <div className="text-muted-foreground">接收</div>
          </div>
          <div className="text-center">
            <div className="font-medium">
              {messages.filter(m => m.direction === 'out').length}
            </div>
            <div className="text-muted-foreground">发送</div>
          </div>
          <div className="text-center">
            <div className="font-medium">
              {messages.filter(m => m.status === 'error').length}
            </div>
            <div className="text-muted-foreground">错误</div>
          </div>
          <div className="text-center">
            <div className="font-medium">
              {messages.reduce((sum, m) => sum + m.size, 0)}
            </div>
            <div className="text-muted-foreground">总字节</div>
          </div>
        </div>
      </div>
    </div>
  );
};
