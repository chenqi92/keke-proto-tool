import React, { useState } from 'react';
import { cn } from '@/utils';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { HexEditor } from '@/components/HexEditor/HexEditor';
import { ParseTree } from '@/components/ParseTree/ParseTree';
import { Timeline } from '@/components/Timeline/Timeline';
import { DataFormatSelector, DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { Message } from '@/types';
import { TCPSessionContent } from '@/components/ProtocolSessions/TCPSessionContent';
import { UDPSessionContent } from '@/components/ProtocolSessions/UDPSessionContent';
import { WebSocketSessionContent } from '@/components/ProtocolSessions/WebSocketSessionContent';
import { MQTTSessionContent } from '@/components/ProtocolSessions/MQTTSessionContent';
import { SSESessionContent } from '@/components/ProtocolSessions/SSESessionContent';
import { ModbusSessionContent } from '@/components/ProtocolSessions/ModbusSessionContent';
import { useLayoutConfig } from '@/hooks/useResponsive';
import { useSession } from '@/contexts/SessionContext';
import { WorkspacePage } from './WorkspacePage';
import { ConnectionPage } from './ConnectionPage';
import { ProtocolTypeOverview } from '@/components/ProtocolTypeOverview';
import { useActiveSession } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { ToolIntegration, useToolIntegration } from '@/components/Session/ToolIntegration';
import {
  Play,
  Square,
  Send,
  Filter,
  Download,
  Settings,
  AlertCircle,
  Wrench
} from 'lucide-react';





export const SessionPage: React.FC = () => {
  const layoutConfig = useLayoutConfig();
  const { currentSession, selectedNode } = useSession();

  // Get real session data
  const activeSession = useActiveSession();

  // UI state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'hex' | 'tree' | 'timeline'>('split');
  const [filterText, setFilterText] = useState('');
  const [showToolPanel, setShowToolPanel] = useState(false);

  // Tool integration
  const toolIntegration = useToolIntegration(currentSession?.id || '');


  // 数据格式相关状态
  const [sendFormat, setSendFormat] = useState<DataFormat>('ascii');
  const [receiveFormat, setReceiveFormat] = useState<DataFormat>('ascii');
  const [sendData, setSendData] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);

  // Get real messages from active session
  const messages = activeSession?.messages || [];
  const isConnected = activeSession?.status === 'connected';

  const handleConnect = async () => {
    if (!activeSession) return;

    if (isConnected) {
      await networkService.disconnect(activeSession.config.id);
    } else {
      await networkService.connect(activeSession.config.id);
    }
  };

  const handleSendMessage = async () => {
    if (!activeSession || !isConnected) return;

    // 验证数据格式
    if (!validateFormat[sendFormat](sendData)) {
      setFormatError(`无效的${sendFormat.toUpperCase()}格式`);
      return;
    }

    setFormatError(null);

    try {
      // 转换数据为字节数组
      const dataBytes = formatData.from[sendFormat](sendData);

      // 发送数据
      const success = await networkService.sendMessage(activeSession.config.id, dataBytes);

      if (success) {
        setSendData('');
      } else {
        setFormatError('发送失败');
      }
    } catch (error) {
      setFormatError(`发送失败: ${  error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleSendDataChange = (value: string) => {
    setSendData(value);
    setFormatError(null);
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
    // Select message data for tool integration
    if (message.data) {
      toolIntegration.selectData(message.data);
    }
  };

  const handleToolResult = async (toolId: string, result: any) => {
    console.log('Tool result:', toolId, result);
    // Handle tool execution results
    // This could update the UI, send data, or trigger other actions
    if (result.data && result.metadata?.shouldSend) {
      // Auto-send tool result if requested
      setSendData(new TextDecoder().decode(result.data));
      await handleSendMessage();
    }
  };

  // Protocol-specific content renderer
  const renderProtocolSpecificContent = () => {
    if (!currentSession) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">欢迎使用 ProtoTool</h3>
            <p className="text-sm">请从左侧会话管理中选择一个会话开始分析</p>
          </div>
        </div>
      );
    }

    switch (currentSession.protocol) {
      case 'TCP':
        return <TCPSessionContent key={currentSession.id} sessionId={currentSession.id} />;
      case 'UDP':
        return <UDPSessionContent key={currentSession.id} sessionId={currentSession.id} />;
      case 'WebSocket':
        return <WebSocketSessionContent key={currentSession.id} sessionId={currentSession.id} />;
      case 'MQTT':
        return <MQTTSessionContent key={currentSession.id} sessionId={currentSession.id} />;
      case 'SSE':
        return <SSESessionContent key={currentSession.id} sessionId={currentSession.id} />;
      case 'Modbus':
      case 'Modbus-TCP':
      case 'Modbus-RTU':
        return <ModbusSessionContent key={currentSession.id} sessionId={currentSession.id} />;
      default:
        // Fall back to generic session content for protocols not yet implemented
        return renderGenericSessionContent();
    }
  };

  // Generic session content (original implementation)
  const renderGenericSessionContent = () => {
    return (
      <div className="h-full flex flex-col">
        {/* Generic toolbar */}
        {renderToolbar()}

        {/* Generic send panel */}
        {renderSendPanel()}

        {/* Generic receive panel */}
        {renderReceivePanel()}

        {/* Generic main content area */}
        <div className="flex-1 overflow-hidden">
          {layoutConfig.mainContent.showThreeColumns && viewMode === 'split'
            ? renderSplitView()
            : renderSingleView()
          }
        </div>
      </div>
    );
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
          onClick={() => setShowToolPanel(!showToolPanel)}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            showToolPanel ? "bg-accent" : "hover:bg-accent"
          )}
          title="工具面板"
        >
          <Wrench className="w-4 h-4" />
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
      <Panel defaultSize={showToolPanel ? 30 : 40} minSize={25}>
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

      {/* Middle Panel - Parse Tree & Timeline */}
      <Panel defaultSize={showToolPanel ? 40 : 60} minSize={25}>
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
              />
            </div>
          </Panel>
        </PanelGroup>
      </Panel>

      {/* Tool Panel */}
      {showToolPanel && (
        <>
          <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors" />
          <Panel defaultSize={30} minSize={20}>
            <div className="h-full border-l border-border">
              <div className="h-8 border-b border-border flex items-center px-3 bg-muted/50">
                <h3 className="text-sm font-medium">工具面板</h3>
              </div>
              <div className="p-4 h-full overflow-auto">
                <ToolIntegration
                  sessionId={currentSession?.id || ''}
                  protocol={currentSession?.protocol}
                  connectionState={isConnected ? 'connected' : 'disconnected'}
                  selectedData={toolIntegration.selectedData}
                  onToolResult={handleToolResult}
                />
              </div>
            </div>
          </Panel>
        </>
      )}
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
            />
          </div>
        );
      default:
        return renderSplitView();
    }
  };

  const renderSendPanel = () => (
    <div className="h-32 border-b border-border bg-card p-4">
      <div className="flex items-stretch space-x-3 h-full">
        <div className="flex-1 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-muted-foreground">发送格式:</span>
              <DataFormatSelector
                value={sendFormat}
                onChange={setSendFormat}
                size="sm"
              />
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

          <textarea
            value={sendData}
            onChange={(e) => handleSendDataChange(e.target.value)}
            placeholder={`输入${sendFormat.toUpperCase()}格式的数据...`}
            className="flex-1 w-full px-3 py-2 text-sm bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {formatError && (
            <div className="flex items-center space-x-1 text-red-500">
              <AlertCircle className="w-3 h-3" />
              <span className="text-xs">{formatError}</span>
            </div>
          )}
        </div>

        {/* Enhanced send button - aligned to bottom */}
        <div className="flex flex-col justify-end space-y-2">
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !sendData.trim()}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
              "flex items-center space-x-2 min-w-20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isConnected && sendData.trim()
                ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Send className="w-4 h-4" />
            <span>发送</span>
          </button>

          {/* Quick actions */}
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
  // Check if a specific node is selected and render appropriate content
  if (selectedNode) {
    // Handle different view types based on node selection
    switch (selectedNode.viewType) {
      case 'workspace-overview':
        return <WorkspacePage viewType="workspace-overview" />;
      case 'protocol-type-overview':
        if (selectedNode.protocol && selectedNode.connectionType) {
          return <ProtocolTypeOverview
            protocol={selectedNode.protocol}
            connectionType={selectedNode.connectionType}
          />;
        }
        return <WorkspacePage viewType="workspace-overview" />;
      case 'connection-detail':
        return <ConnectionPage />;
      case 'session-detail':
      default:
        return renderProtocolSpecificContent();
    }
  }

  return renderProtocolSpecificContent();
};
