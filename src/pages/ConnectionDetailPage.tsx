import React from 'react';
import { TCPClientDetailContent } from '@/components/ProtocolSessions/TCPClientDetailContent';
import { AlertCircle } from 'lucide-react';

interface ConnectionDetailPageProps {
  nodeData: any;
}

export const ConnectionDetailPage: React.FC<ConnectionDetailPageProps> = ({ nodeData }) => {
  // 从nodeData中提取必要信息
  const sessionData = nodeData?.sessionData;
  const clientConnection = sessionData?.clientConnection;
  const sessionId = sessionData?.config?.id;
  const protocol = nodeData?.protocol;

  // 验证数据完整性
  if (!sessionData || !clientConnection || !sessionId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">连接详情不可用</h3>
          <p className="text-sm text-muted-foreground">
            无法获取连接详情信息，请重新选择连接节点
          </p>
        </div>
      </div>
    );
  }

  // 根据协议类型渲染不同的详情页面
  switch (protocol) {
    case 'TCP':
      return (
        <TCPClientDetailContent
          sessionId={sessionId}
          clientId={clientConnection.id}
          clientConnection={clientConnection}
        />
      );
    
    case 'UDP':
      // TODO: 实现UDP客户端详情页面
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">UDP客户端详情</h3>
            <p className="text-sm text-muted-foreground">
              UDP客户端详情页面正在开发中...
            </p>
          </div>
        </div>
      );
    
    case 'WebSocket':
      // TODO: 实现WebSocket客户端详情页面
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">WebSocket客户端详情</h3>
            <p className="text-sm text-muted-foreground">
              WebSocket客户端详情页面正在开发中...
            </p>
          </div>
        </div>
      );
    
    default:
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">不支持的协议</h3>
            <p className="text-sm text-muted-foreground">
              协议 {protocol} 的客户端详情页面尚未实现
            </p>
          </div>
        </div>
      );
  }
};
