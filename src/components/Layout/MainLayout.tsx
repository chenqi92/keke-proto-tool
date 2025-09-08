import React, { useState, useCallback } from 'react';
import { cn } from '@/utils';
import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [activeView, setActiveView] = useState('workbench');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const handleViewChange = useCallback((view: string) => {
    setActiveView(view);
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
  }, [sidebarCollapsed]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar - 左侧窄栏 */}
        <ActivityBar 
          activeView={activeView}
          onViewChange={handleViewChange}
        />

        {/* 主工作区域 */}
        <div className="flex-1 flex">
          <PanelGroup direction="horizontal">
            {/* 左侧边栏 */}
            {!sidebarCollapsed && (
              <>
                <Panel 
                  defaultSize={20} 
                  minSize={15} 
                  maxSize={40}
                  className="bg-card border-r border-border"
                >
                  <Sidebar 
                    activeView={activeView}
                    onCollapse={() => setSidebarCollapsed(true)}
                  />
                </Panel>
                <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors" />
              </>
            )}

            {/* 中心工作区 */}
            <Panel minSize={30}>
              <PanelGroup direction="horizontal">
                <Panel minSize={40}>
                  <div className="h-full flex flex-col">
                    {children}
                  </div>
                </Panel>

                {/* 右侧检视器 */}
                {!rightPanelCollapsed && (
                  <>
                    <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors" />
                    <Panel 
                      defaultSize={25} 
                      minSize={20} 
                      maxSize={40}
                      className="bg-card border-l border-border"
                    >
                      <div className="h-full p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-sm">检视器</h3>
                          <button
                            onClick={() => setRightPanelCollapsed(true)}
                            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div className="p-3 border rounded-lg">
                            <h4 className="font-medium text-sm mb-2">消息详情</h4>
                            <p className="text-xs text-muted-foreground">选择消息查看详细信息</p>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <h4 className="font-medium text-sm mb-2">协议绑定</h4>
                            <p className="text-xs text-muted-foreground">自动检测协议类型</p>
                          </div>
                          <div className="p-3 border rounded-lg">
                            <h4 className="font-medium text-sm mb-2">AI 建议</h4>
                            <p className="text-xs text-muted-foreground">智能分析和建议</p>
                          </div>
                        </div>
                      </div>
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>

        {/* 侧边栏折叠时的展开按钮 */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-12 top-4 z-10 p-2 bg-card border border-border rounded-md shadow-sm hover:bg-accent"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* 右侧面板折叠时的展开按钮 */}
        {rightPanelCollapsed && (
          <button
            onClick={() => setRightPanelCollapsed(false)}
            className="absolute right-4 top-4 z-10 p-2 bg-card border border-border rounded-md shadow-sm hover:bg-accent"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* 底部状态栏 */}
      <StatusBar />
    </div>
  );
};
