import React, { useState } from 'react';
import { cn } from '@/utils';
import { DataFormatSelector, DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { HexEditor } from '@/components/HexEditor/HexEditor';
import { ParseTree } from '@/components/ParseTree/ParseTree';
import { Timeline } from '@/components/Timeline/Timeline';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLayoutConfig } from '@/hooks/useResponsive';
import {
  Globe,
  Send,
  AlertCircle,
  Play,
  Square,
  Settings,
  Download,
  Filter,
  Zap
} from 'lucide-react';

interface SessionConfig {
  protocol: 'TCP' | 'UDP' | 'WebSocket' | 'MQTT' | 'SSE';
  connectionType: 'client' | 'server';
  host?: string;
  port?: number;
  websocketSubprotocol?: string;
}

interface Message {
  id: string;
  timestamp: Date;
  direction: 'in' | 'out';
  protocol: string;
  size: number;
  data: Uint8Array;
  status: 'success' | 'error' | 'warning';
  frameType?: 'text' | 'binary' | 'ping' | 'pong' | 'close';
}

interface WebSocketSessionContentProps {
  config: SessionConfig;
}

export const WebSocketSessionContent: React.FC<WebSocketSessionContentProps> = ({ config }) => {
  const layoutConfig = useLayoutConfig();
  const [isConnected, setIsConnected] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'hex' | 'tree' | 'timeline'>('split');
  const [filterText, setFilterText] = useState('');
  
  // WebSocket-specific states
  const [sendFormat, setSendFormat] = useState<DataFormat>('ascii');
  const [receiveFormat, setReceiveFormat] = useState<DataFormat>('ascii');
  const [sendData, setSendData] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'text' | 'binary' | 'ping' | 'pong'>('text');
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [_pingInterval, _setPingInterval] = useState(30);

  // Mock WebSocket statistics
  const [wsStats] = useState({
    textFrames: 15,
    binaryFrames: 3,
    controlFrames: 8,
    totalFrames: 26,
    bytesReceived: 4096,
    bytesSent: 2048,
    connectionTime: '00:05:23'
  });

  // Mock messages with frame types
  const [messages] = useState<Message[]>([
    {
      id: '1',
      timestamp: new Date(),
      direction: 'out',
      protocol: 'WebSocket',
      size: 64,
      data: new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64]),
      status: 'success',
      frameType: 'text'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000),
      direction: 'in',
      protocol: 'WebSocket',
      size: 32,
      data: new Uint8Array([0x4f, 0x4b, 0x0d, 0x0a]),
      status: 'success',
      frameType: 'text'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 2000),
      direction: 'out',
      protocol: 'WebSocket',
      size: 0,
      data: new Uint8Array([]),
      status: 'success',
      frameType: 'ping'
    }
  ]);

  const handleConnect = () => {
    setIsConnected(!isConnected);
  };

  const handleSendMessage = () => {
    if (messageType === 'text' && !validateFormat[sendFormat](sendData)) {
      setFormatError(`无效的${sendFormat.toUpperCase()}格式`);
      return;
    }

    setFormatError(null);

    try {
      if (messageType === 'ping' || messageType === 'pong') {
        console.log(`Send WebSocket ${messageType} frame`);
      } else {
        const dataBytes = formatData.from[sendFormat](sendData);
        console.log(`Send WebSocket ${messageType} message:`, dataBytes);
      }
      setSendData('');
    } catch (error) {
      setFormatError('数据转换失败');
    }
  };

  const handleSendDataChange = (value: string) => {
    setSendData(value);
    setFormatError(null);
  };

  const formatMessageData = (message: Message): string => {
    try {
      return formatData.to[receiveFormat](message.data);
    } catch {
      return '数据格式转换失败';
    }
  };

  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
  };

  const getFrameTypeColor = (frameType?: string) => {
    switch (frameType) {
      case 'text': return 'text-blue-500';
      case 'binary': return 'text-purple-500';
      case 'ping': return 'text-green-500';
      case 'pong': return 'text-yellow-500';
      case 'close': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const renderWebSocketToolbar = () => (
    <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
      <div className="flex items-center space-x-2">
        <Globe className="w-4 h-4 text-green-500" />
        <span className="text-sm font-medium">WebSocket</span>
        <span className="text-xs text-muted-foreground">
          ws://{config.host}:{config.port}
        </span>
        {config.websocketSubprotocol && (
          <span className="text-xs text-muted-foreground">
            ({config.websocketSubprotocol})
          </span>
        )}
        
        <button
          onClick={handleConnect}
          className={cn(
            "flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ml-4",
            isConnected
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          )}
        >
          {isConnected ? (
            <>
              <Square className="w-3 h-3" />
              <span>断开</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              <span>连接</span>
            </>
          )}
        </button>
      </div>
      
      <div className="flex items-center space-x-2">
        {/* WebSocket-specific controls */}
        <button 
          onClick={() => setAutoReconnect(!autoReconnect)}
          className={cn(
            "px-2 py-1 text-xs rounded transition-colors",
            autoReconnect ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
          )}
        >
          自动重连
        </button>
        
        <button 
          onClick={() => {
            if (isConnected) {
              console.log('Send ping frame');
            }
          }}
          disabled={!isConnected}
          className="px-2 py-1 text-xs bg-muted hover:bg-accent rounded transition-colors disabled:opacity-50"
        >
          Ping/Pong
        </button>
        
        {/* View mode buttons */}
        <div className="flex items-center space-x-1 ml-4">
          <button
            onClick={() => setViewMode('split')}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              viewMode === 'split' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            分栏
          </button>
          <button
            onClick={() => setViewMode('hex')}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              viewMode === 'hex' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            Hex
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              viewMode === 'tree' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            解析树
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              viewMode === 'timeline' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            时间线
          </button>
        </div>

        <div className="flex items-center space-x-1 ml-4">
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="过滤消息..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-7 pr-3 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary w-32"
            />
          </div>
          <button className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderWebSocketSendPanel = () => (
    <div className="h-32 border-b border-border bg-card p-4">
      <div className="flex items-start space-x-3 h-full">
        <div className="flex-1 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-muted-foreground">消息类型:</span>
                <select 
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as 'text' | 'binary' | 'ping' | 'pong')}
                  className="px-2 py-1 text-xs bg-background border border-border rounded"
                >
                  <option value="text">文本消息</option>
                  <option value="binary">二进制消息</option>
                  <option value="ping">Ping帧</option>
                  <option value="pong">Pong帧</option>
                </select>
              </div>
              {(messageType === 'text' || messageType === 'binary') && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground">数据格式:</span>
                  <DataFormatSelector value={sendFormat} onChange={setSendFormat} size="sm" />
                </div>
              )}
            </div>
            
            {/* Connection status indicator */}
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-xs text-muted-foreground">
                {isConnected ? "已连接" : "未连接"}
              </span>
            </div>
          </div>
          
          {(messageType === 'text' || messageType === 'binary') ? (
            <textarea
              value={sendData}
              onChange={(e) => handleSendDataChange(e.target.value)}
              placeholder="输入WebSocket消息内容..."
              className="flex-1 w-full px-3 py-2 text-sm bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-md">
              {messageType === 'ping' ? 'Ping帧不需要载荷数据' : 'Pong帧不需要载荷数据'}
            </div>
          )}
          
          {formatError && (
            <div className="flex items-center space-x-1 text-red-500">
              <AlertCircle className="w-3 h-3" />
              <span className="text-xs">{formatError}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col space-y-2">
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || (messageType !== 'ping' && messageType !== 'pong' && !sendData.trim())}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
              "flex items-center space-x-2 min-w-20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isConnected && (messageType === 'ping' || messageType === 'pong' || sendData.trim())
                ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105"
                : "bg-muted text-muted-foreground"
            )}
          >
            {messageType === 'ping' || messageType === 'pong' ? (
              <Zap className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {messageType === 'ping' ? 'Ping' : messageType === 'pong' ? 'Pong' : '发送'}
            </span>
          </button>
          
          <button
            onClick={() => setSendData('')}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            title="清空"
          >
            清空
          </button>
        </div>
      </div>
    </div>
  );

  const renderReceivePanel = () => (
    <div className="h-8 border-b border-border flex items-center justify-between px-3 bg-muted/50">
      <h3 className="text-sm font-medium">数据接收</h3>
      <div className="flex items-center space-x-2">
        <span className="text-xs text-muted-foreground">显示格式:</span>
        <DataFormatSelector
          value={receiveFormat}
          onChange={setReceiveFormat}
          size="sm"
        />
      </div>
    </div>
  );

  const renderWebSocketStats = () => (
    <div className="h-8 border-b border-border flex items-center px-3 bg-muted/30">
      <div className="flex items-center space-x-4 text-xs">
        <span>帧类型统计</span>
        <span className={getFrameTypeColor('text')}>文本: {wsStats.textFrames}</span>
        <span className={getFrameTypeColor('binary')}>二进制: {wsStats.binaryFrames}</span>
        <span className={getFrameTypeColor('ping')}>控制帧: {wsStats.controlFrames}</span>
        <span>总计: {wsStats.totalFrames}</span>
        <span>接收: {wsStats.bytesReceived}B</span>
        <span>发送: {wsStats.bytesSent}B</span>
        <span>连接时长: {wsStats.connectionTime}</span>
      </div>
    </div>
  );

  const renderContent = () => {
    if (viewMode === 'split' && layoutConfig.mainContent.showThreeColumns) {
      return (
        <PanelGroup direction="horizontal">
          {/* Left Panel - Hex Editor */}
          <Panel defaultSize={40} minSize={25}>
            <div className="h-full border-r border-border">
              <div className="h-8 border-b border-border flex items-center px-3 bg-muted/50">
                <h3 className="text-sm font-medium">Hex 编辑器</h3>
              </div>
              <HexEditor 
                data={selectedMessage?.data || new Uint8Array()} 
                readOnly={true}
              />
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors" />

          {/* Right Panel */}
          <Panel minSize={25}>
            <PanelGroup direction="vertical">
              {/* Parse Tree */}
              <Panel defaultSize={50} minSize={30}>
                <div className="h-full border-b border-border">
                  <div className="h-8 border-b border-border flex items-center px-3 bg-muted/50">
                    <h3 className="text-sm font-medium">解析树</h3>
                  </div>
                  <ParseTree message={selectedMessage} />
                </div>
              </Panel>

              <PanelResizeHandle className="h-1 bg-border hover:bg-accent transition-colors" />

              {/* Timeline */}
              <Panel minSize={30}>
                <div className="h-full">
                  <div className="h-8 border-b border-border flex items-center px-3 bg-muted/50">
                    <h3 className="text-sm font-medium">消息时间线</h3>
                  </div>
                  <Timeline
                    messages={messages}
                    selectedMessage={selectedMessage}
                    onMessageSelect={handleMessageSelect}
                    filter={filterText}
                    formatData={formatMessageData}
                  />
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      );
    }

    // Single view modes
    switch (viewMode) {
      case 'hex':
        return (
          <div className="h-full">
            <div className="h-8 border-b border-border flex items-center px-3 bg-muted/50">
              <h3 className="text-sm font-medium">Hex 编辑器</h3>
            </div>
            <HexEditor 
              data={selectedMessage?.data || new Uint8Array()} 
              readOnly={true}
            />
          </div>
        );
      case 'tree':
        return (
          <div className="h-full">
            <div className="h-8 border-b border-border flex items-center px-3 bg-muted/50">
              <h3 className="text-sm font-medium">解析树</h3>
            </div>
            <ParseTree message={selectedMessage} />
          </div>
        );
      case 'timeline':
      default:
        return (
          <div className="h-full">
            <div className="h-8 border-b border-border flex items-center px-3 bg-muted/50">
              <h3 className="text-sm font-medium">消息时间线</h3>
            </div>
            <Timeline
              messages={messages}
              selectedMessage={selectedMessage}
              onMessageSelect={handleMessageSelect}
              filter={filterText}
              formatData={formatMessageData}
            />
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* WebSocket-specific toolbar */}
      {renderWebSocketToolbar()}

      {/* WebSocket-specific send panel */}
      {renderWebSocketSendPanel()}

      {/* Receive panel header */}
      {renderReceivePanel()}

      {/* WebSocket frame statistics */}
      {renderWebSocketStats()}

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};
