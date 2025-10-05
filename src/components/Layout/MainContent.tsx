import React, { useState, useEffect, Suspense } from 'react';
import { cn } from '@/utils';
import { useAppStore } from '@/stores/AppStore';

// 页面组件
import { WorkspacePage } from '@/pages/WorkspacePage';
import { SessionPage } from '@/pages/SessionPage';
import { ConnectionDetailPage } from '@/pages/ConnectionDetailPage';
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
  const [isLoading, setIsLoading] = useState(false);

  // 从AppStore获取选中的节点信息
  const { selectedNodeId, selectedNodeType, selectedNodeData } = useAppStore();

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

    // 如果有选中的节点，显示节点特定内容
    if (selectedNodeData && selectedNodeData.viewType) {
      return renderNodeContent(selectedNodeData as NodeViewData);
    }

    // 否则显示工作区概览
    return (
      <Suspense fallback={<PageSkeleton />}>
        <WorkspacePage />
      </Suspense>
    );
  };





  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* 页面内容 */}
      <div className="flex-1 overflow-hidden">
        {renderActiveContent()}
      </div>
    </div>
  );
};
