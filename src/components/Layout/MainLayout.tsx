import React, { useState, useEffect } from 'react';
import { ToolBar } from './ToolBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { WindowDragRegion } from './WindowDragRegion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLayoutConfig } from '@/hooks/useResponsive';
import { useSession, getDefaultSessionConfig, SelectedNode } from '@/contexts/SessionContext';
import { useAppStore } from '@/stores/AppStore';
import { ModalType } from '@/stores/MinimizedModalsStore';
import { AIAssistant } from '@/components/AIAssistant';
import { AIContext } from '@/types/ai';

interface MainLayoutProps {
  children: React.ReactNode;
  onOpenModal: (modalType: string) => void;
  isProtoShellMinimized?: boolean;
  onRestoreProtoShell?: () => void;
  onRestoreModal?: (modalType: ModalType) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  onOpenModal,
  isProtoShellMinimized,
  onRestoreProtoShell,
  onRestoreModal
}) => {
  const layoutConfig = useLayoutConfig();
  const { setCurrentSession, setSessionId } = useSession();
  const showSidebar = useAppStore(state => state.showSidebar);
  const showInspector = useAppStore(state => state.showInspector);
  const showStatusBar = useAppStore(state => state.showStatusBar);
  const toggleSidebar = useAppStore(state => state.toggleSidebar);
  const toggleInspector = useAppStore(state => state.toggleInspector);
  const selectedNodeId = useAppStore(state => state.selectedNodeId);
  const selectedNodeType = useAppStore(state => state.selectedNodeType);
  const selectedNodeData = useAppStore(state => state.selectedNodeData);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 构建 AI 上下文
  const aiContext: AIContext | undefined = selectedNodeId && selectedNodeData ? {
    sessionId: selectedNodeType === 'session' ? selectedNodeId : undefined,
    sessionName: selectedNodeData.label,
    protocol: selectedNodeData.protocol,
    customData: selectedNodeData
  } : undefined;

  // 响应式处理：在移动端自动折叠侧边栏
  useEffect(() => {
    if (layoutConfig.sidebar.shouldCollapse) {
      setMobileMenuOpen(false);
    }
  }, [layoutConfig.sidebar.shouldCollapse]);

  // 会话选择处理
  const handleSessionSelect = (sessionId: string, protocol: string) => {
    const sessionConfig = getDefaultSessionConfig(protocol, sessionId);
    setCurrentSession(sessionConfig);
    setSessionId(sessionId);
    console.log('Selected session:', sessionId, protocol, sessionConfig);
  };

  const handleNodeSelect = (nodeId: string, nodeType: 'workspace' | 'session' | 'connection', nodeData: any) => {
    const selectedNode: SelectedNode = {
      id: nodeId,
      type: nodeType,
      protocol: nodeData.protocol,
      label: nodeData.label,
      config: nodeData.config,
      viewType: nodeData.viewType,
      connectionType: nodeData.connectionType,
      sessionData: nodeData.sessionData
    };

    // Use the AppStore's setSelectedNode with the complete nodeData
    const { setSelectedNode: setSelectedNodeInStore } = useAppStore.getState();
    setSelectedNodeInStore(nodeId, nodeType, nodeData);

    // If it's a session node, also set it as the active session
    if (nodeType === 'session' && nodeData.sessionId) {
      setSessionId(nodeData.sessionId);
    }

    console.log('Selected node:', selectedNode);
    console.log('Node data passed to store:', nodeData);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Minimal window drag region at the very top edge */}
      <WindowDragRegion showDebugOutline={false} />

      {/* Tool Bar */}
      <ToolBar onOpenModal={onOpenModal} />

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 移动端侧边栏遮罩 */}
        {layoutConfig.isMobile && mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* 移动端侧边栏 */}
        {layoutConfig.isMobile && mobileMenuOpen && (
          <div className="fixed left-0 top-0 bottom-0 w-80 bg-card border-r border-border z-50 transform transition-transform">
            <Sidebar
              onCollapse={() => setMobileMenuOpen(false)}
              onSessionSelect={handleSessionSelect}
              onNodeSelect={handleNodeSelect}
            />
          </div>
        )}

        {/* 桌面端布局 */}
        {!layoutConfig.isMobile ? (
          <PanelGroup direction="horizontal">
            {/* 左侧边栏 */}
            {showSidebar && (
              <>
                <Panel
                  defaultSize={layoutConfig.isTablet ? 35 : 28}
                  minSize={20}
                  maxSize={layoutConfig.isTablet ? 45 : 40}
                  className="bg-card border-r border-border"
                >
                  <Sidebar
                    onCollapse={toggleSidebar}
                    onSessionSelect={handleSessionSelect}
                    onNodeSelect={handleNodeSelect}
                  />
                </Panel>
                <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors" />
              </>
            )}

            {/* 中心工作区 */}
            <Panel minSize={40}>
              {layoutConfig.mainContent.showThreeColumns ? (
                <PanelGroup direction="horizontal">
                  <Panel minSize={40}>
                    <div className="h-full flex flex-col">
                      {children}
                    </div>
                  </Panel>

                  {/* 右侧检视器 */}
                  {showInspector && (
                    <>
                      <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors" />
                      <Panel
                        defaultSize={30}
                        minSize={25}
                        maxSize={40}
                        className="bg-card border-l border-border"
                      >
                        <AIAssistant
                          context={aiContext}
                          onClose={toggleInspector}
                        />
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              ) : (
                // 平板和移动端：单栏布局
                <div className="h-full flex flex-col">
                  {children}
                </div>
              )}
            </Panel>
          </PanelGroup>
        ) : (
          // 移动端：全屏布局
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        )}

        {/* 左侧面板边缘切换器 */}
        {(!showSidebar || layoutConfig.isMobile) && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 group"
            onClick={() => {
              if (layoutConfig.isMobile) {
                setMobileMenuOpen(true);
              } else {
                toggleSidebar();
              }
            }}
          >
            <div className="flex items-center bg-card border border-border rounded-md rounded-l-none shadow-sm transition-all duration-200 hover:bg-accent group-hover:scale-105">
              <div className="px-2 py-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* 右侧面板边缘切换器 */}
        {!showInspector && layoutConfig.mainContent.showThreeColumns && (
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 group"
            onClick={toggleInspector}
          >
            <div className="flex items-center bg-card border border-border rounded-md rounded-r-none shadow-sm transition-all duration-200 hover:bg-accent group-hover:scale-105">
              <div className="px-2 py-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      {showStatusBar && (
        <StatusBar
          isProtoShellMinimized={isProtoShellMinimized}
          onRestoreProtoShell={onRestoreProtoShell}
          onRestoreModal={onRestoreModal}
        />
      )}
    </div>
  );
};
