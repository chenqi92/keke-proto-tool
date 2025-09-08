import React, { useState } from 'react';
import { cn } from '@/utils';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { HexEditor } from '@/components/HexEditor/HexEditor';
import { ParseTree } from '@/components/ParseTree/ParseTree';
import { Timeline } from '@/components/Timeline/Timeline';
import { 
  Play, 
  Square, 
  Send, 
  Filter, 
  Download, 
  Settings,
  Maximize2,
  Minimize2
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
  const [isConnected, setIsConnected] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'hex' | 'tree' | 'timeline'>('split');
  const [filterText, setFilterText] = useState('');

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
    console.log('Send message');
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

        <button className="p-1.5 hover:bg-accent rounded-md">
          <Download className="w-4 h-4" />
        </button>

        <button className="p-1.5 hover:bg-accent rounded-md">
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
            />
          </div>
        );
      default:
        return renderSplitView();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {renderToolbar()}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'split' ? renderSplitView() : renderSingleView()}
      </div>
    </div>
  );
};
