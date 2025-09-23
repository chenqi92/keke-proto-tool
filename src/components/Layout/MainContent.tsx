import React, { useState, useEffect, Suspense } from 'react';
import { cn } from '@/utils';
import { TabNavigation, TabId } from './TabNavigation';
import { useAppStore } from '@/stores/AppStore';

// 页面组件
import { WorkspacePage } from '@/pages/WorkspacePage';
import { LogsPage } from '@/pages/LogsPage';
import { PluginsPage } from '@/pages/PluginsPage';
import { StoragePage } from '@/pages/StoragePage';
import { SessionPage } from '@/pages/SessionPage';
import { ConnectionDetailPage } from '@/pages/ConnectionDetailPage';
import { ToolboxInterface } from '@/components/Toolbox/ToolboxInterface';
import { ProtocolTypeOverview } from '@/components/ProtocolTypeOverview';
import { PageSkeleton } from '@/components/Common/PageSkeleton';

interface MainContentProps {
  className?: string;
}

// 节点视图类型
type NodeViewType = 'workspace-overview' | 'protocol-type-overview' | 'session-detail' | 'connection-detail';

interface NodeViewData {
  viewType: NodeViewType;
  nodeId: string;
  nodeType: 'workspace' | 'session' | 'connection';
  protocol?: string;
  connectionType?: string;
  sessionId?: string;
  [key: string]: any;
}

export const MainContent: React.FC<MainContentProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<TabId>('workspace');
  const [isLoading, setIsLoading] = useState(false);

  // 从AppStore获取选中的节点信息
  const { selectedNodeId, selectedNodeType, selectedNodeData } = useAppStore();

  // 处理Tab切换
  const handleTabChange = (tabId: TabId) => {
    if (tabId === activeTab) return;

    setIsLoading(true);
    setActiveTab(tabId);

    // 模拟加载时间，实际项目中可以移除
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  };

  // 工具箱执行处理
  const handleToolExecute = (toolId: string, result: any) => {
    console.log('Tool executed:', toolId, result);
    // 这里可以添加工具执行结果的处理逻辑
  };

  // 渲染节点特定的内容
  const renderNodeContent = (nodeData: NodeViewData) => {
    switch (nodeData.viewType) {
      case 'workspace-overview':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <WorkspacePage />
          </Suspense>
        );

      case 'protocol-type-overview':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <ProtocolTypeOverview
              protocol={nodeData.protocol}
              connectionType={nodeData.connectionType as 'client' | 'server'}
            />
          </Suspense>
        );

      case 'session-detail':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <SessionPage />
          </Suspense>
        );

      case 'connection-detail':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <ConnectionDetailPage nodeData={nodeData} />
          </Suspense>
        );

      default:
        return (
          <Suspense fallback={<PageSkeleton />}>
            <WorkspacePage />
          </Suspense>
        );
    }
  };

  // 渲染当前激活的页面内容
  const renderActiveContent = () => {
    if (isLoading) {
      return <PageSkeleton />;
    }

    // 如果是workspace tab且有选中的节点，显示节点特定内容
    if (activeTab === 'workspace' && selectedNodeData && selectedNodeData.viewType) {
      return renderNodeContent(selectedNodeData as NodeViewData);
    }

    // 否则显示Tab对应的固定页面
    switch (activeTab) {
      case 'workspace':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <WorkspacePage />
          </Suspense>
        );

      case 'toolbox':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <div className="h-full">
              <ToolboxInterface
                mode="page"
                onToolExecute={handleToolExecute}
                className="h-full"
              />
            </div>
          </Suspense>
        );

      case 'logs':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <LogsPage />
          </Suspense>
        );

      case 'plugins':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <PluginsPage />
          </Suspense>
        );

      case 'storage':
        return (
          <Suspense fallback={<PageSkeleton />}>
            <StoragePage />
          </Suspense>
        );

      default:
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">页面未找到</h2>
              <p className="text-muted-foreground">请选择一个有效的标签页</p>
            </div>
          </div>
        );
    }
  };

  // 监听节点选择变化，仅在节点ID实际发生变化时自动切换到workspace tab
  const [lastSelectedNodeId, setLastSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== lastSelectedNodeId && selectedNodeData && selectedNodeData.viewType) {

      setActiveTab('workspace');
      setLastSelectedNodeId(selectedNodeId);
    }
  }, [selectedNodeId, selectedNodeData, lastSelectedNodeId]);



  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Tab导航 */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        className="flex-shrink-0"
      />

      {/* 页面内容 */}
      <div className="flex-1 overflow-hidden">
        {renderActiveContent()}
      </div>
    </div>
  );
};
