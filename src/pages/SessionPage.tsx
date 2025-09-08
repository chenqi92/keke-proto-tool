import React, { useState } from 'react';
import { cn } from '@/utils';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { HexEditor } from '@/components/HexEditor/HexEditor';
import { ParseTree } from '@/components/ParseTree/ParseTree';
import { Timeline } from '@/components/Timeline/Timeline';
import { DataFormatSelector, DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { useLayoutConfig } from '@/hooks/useResponsive';
import {
  Play,
  Square,
  Send,
  Filter,
  Download,
  Settings,
  Maximize2,
  Minimize2,
  AlertCircle,
  Menu,
  Clock,
  TreePine
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

export const SessionPage: React.FC = () => {
  const layoutConfig = useLayoutConfig();
  const [isConnected, setIsConnected] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'hex' | 'tree' | 'timeline'>('split');
  const [filterText, setFilterText] = useState('');
  const [mobileActiveTab, setMobileActiveTab] = useState<'send' | 'receive' | 'hex' | 'tree' | 'timeline'>('timeline');

  // 数据格式相关状态
  const [sendFormat, setSendFormat] = useState<DataFormat>('ascii');
  const [receiveFormat, setReceiveFormat] = useState<DataFormat>('ascii');
  const [sendData, setSendData] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);

  // Mock data
  const [messages] = useState<Message[]>([
    {
      id: '1',
      timestamp: new Date(),
      direction: 'out',
      protocol: 'TCP',
      size: 64,
      data: new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64]),
      status: 'success'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000),
      direction: 'in',
      protocol: 'TCP',
      size: 32,
      data: new Uint8Array([0x4f, 0x4b, 0x0d, 0x0a]),
      status: 'success'
    }
  ]);

  const handleConnect = () => {
    setIsConnected(!isConnected);
  };

  const handleSendMessage = () => {
    // 验证数据格式
    if (!validateFormat[sendFormat](sendData)) {
      setFormatError(`无效的${sendFormat.toUpperCase()}格式`);
      return;
    }

    setFormatError(null);

    try {
      // 转换数据为字节数组
      const dataBytes = formatData.from[sendFormat](sendData);
      console.log('Send message:', dataBytes);

      // 清空发送框
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

  const handleDownload = () => {
    console.log('导出数据');
    // TODO: 实现数据导出功能
  };

  const handleSettings = () => {
    console.log('打开设置');
    // TODO: 实现设置功能
  };

  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
  };

  const renderToolbar = () => (
    <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
      <div className="flex items-center space-x-2">
        <button
          onClick={handleConnect}
          className={cn(
            "flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            isConnected
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          )}
        >
          {isConnected ? (
            <>
              <Square className="w-4 h-4" />
              <span>断开</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>连接</span>
            </>
          )}
        </button>

        <button
          onClick={handleSendMessage}
          disabled={!isConnected}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>发送</span>
        </button>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setViewMode('split')}
            className={cn(
              "px-2 py-1 rounded text-xs",
              viewMode === 'split' ? "bg-accent" : "hover:bg-accent"
            )}
          >
            分栏
          </button>
          <button
            onClick={() => setViewMode('hex')}
            className={cn(
              "px-2 py-1 rounded text-xs",
              viewMode === 'hex' ? "bg-accent" : "hover:bg-accent"
            )}
          >
            Hex
          </button>
          <button
            onClick={() => setViewMode('tree')}
            className={cn(
              "px-2 py-1 rounded text-xs",
              viewMode === 'tree' ? "bg-accent" : "hover:bg-accent"
            )}
          >
            解析树
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={cn(
              "px-2 py-1 rounded text-xs",
              viewMode === 'timeline' ? "bg-accent" : "hover:bg-accent"
            )}
          >
            时间线
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative">
          <input
            type="text"
            placeholder="过滤消息..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-48 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>

        <button
          onClick={handleDownload}
          className="p-1.5 hover:bg-accent rounded-md"
          title="导出数据"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={handleSettings}
          className="p-1.5 hover:bg-accent rounded-md"
          title="设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderSplitView = () => (
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

  const renderSingleView = () => {
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
      default:
        return renderSplitView();
    }
  };

  const renderSendPanel = () => (
    <div className="h-32 border-b border-border bg-card p-4">
      <div className="flex items-start space-x-3 h-full">
        <div className="flex-1 flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-muted-foreground">发送格式:</span>
            <DataFormatSelector
              value={sendFormat}
              onChange={setSendFormat}
              size="sm"
            />
            {formatError && (
              <div className="flex items-center space-x-1 text-red-500">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs">{formatError}</span>
              </div>
            )}
          </div>
          <textarea
            value={sendData}
            onChange={(e) => handleSendDataChange(e.target.value)}
            placeholder={`输入${sendFormat.toUpperCase()}格式的数据...`}
            className="flex-1 w-full px-3 py-2 text-sm bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !sendData.trim()}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Send className="w-4 h-4" />
          <span>发送</span>
        </button>
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

  // 移动端标签页导航
  const renderMobileTabNav = () => (
    <div className="h-12 border-b border-border bg-card flex items-center px-2 overflow-x-auto">
      <div className="flex space-x-1 min-w-max">
        {[
          { id: 'timeline', label: '时间线', icon: Clock },
          { id: 'send', label: '发送', icon: Send },
          { id: 'receive', label: '接收', icon: Download },
          { id: 'hex', label: 'Hex', icon: Maximize2 },
          { id: 'tree', label: '解析树', icon: TreePine },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setMobileActiveTab(tab.id as any)}
              className={cn(
                "flex items-center space-x-1 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                mobileActiveTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // 移动端内容渲染
  const renderMobileContent = () => {
    switch (mobileActiveTab) {
      case 'send':
        return renderSendPanel();
      case 'receive':
        return (
          <div className="h-full flex flex-col">
            {renderReceivePanel()}
            <div className="flex-1 p-4 text-center text-muted-foreground">
              <div className="text-4xl mb-2">📄</div>
              <p>暂无数据</p>
            </div>
          </div>
        );
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

  // 响应式布局渲染
  // 暂时禁用移动端渲染以测试其他响应式功能
  // if (layoutConfig.isMobile) {
  //   return (
  //     <div className="h-full flex flex-col">
  //       {/* 移动端工具栏 */}
  //       <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
  //         <div className="flex items-center space-x-2">
  //           <button
  //             onClick={handleConnect}
  //             className={cn(
  //               "flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors",
  //               isConnected
  //                 ? "bg-red-500 hover:bg-red-600 text-white"
  //                 : "bg-green-500 hover:bg-green-600 text-white"
  //             )}
  //           >
  //             {isConnected ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
  //             <span>{isConnected ? '断开' : '连接'}</span>
  //           </button>
  //         </div>

  //         <div className="flex items-center space-x-2">
  //           <button
  //             onClick={handleDownload}
  //             className="p-1 hover:bg-accent rounded"
  //             title="导出数据"
  //           >
  //             <Download className="w-4 h-4" />
  //           </button>
  //           <button
  //             onClick={handleSettings}
  //             className="p-1 hover:bg-accent rounded"
  //             title="设置"
  //           >
  //             <Settings className="w-4 h-4" />
  //           </button>
  //         </div>
  //       </div>

  //       {/* 移动端标签页导航 */}
  //       {renderMobileTabNav()}

  //       {/* 移动端内容 */}
  //       <div className="flex-1 overflow-hidden">
  //         {renderMobileContent()}
  //       </div>
  //     </div>
  //   );
  // }

  // 桌面端和平板端布局
  return (
    <div className="h-full flex flex-col">
      {/* 桌面端工具栏 */}
      {renderToolbar()}

      {/* 发送面板 */}
      {renderSendPanel()}

      {/* 接收面板标题 */}
      {renderReceivePanel()}

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        {layoutConfig.mainContent.showThreeColumns && viewMode === 'split'
          ? renderSplitView()
          : renderSingleView()
        }
      </div>
    </div>
  );
};
