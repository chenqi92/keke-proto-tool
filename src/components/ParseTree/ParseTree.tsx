import React, { useState } from 'react';
import { cn } from '@/utils';
import { 
  ChevronDown, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Copy,
  Eye
} from 'lucide-react';

interface ParsedField {
  id: string;
  name: string;
  type: string;
  value: any;
  offset: number;
  length: number;
  children?: ParsedField[];
  status: 'success' | 'error' | 'warning';
  description?: string;
  expanded?: boolean;
}

interface ParseTreeProps {
  message?: {
    id: string;
    data: Uint8Array;
    parsed?: any;
  } | null;
  onFieldSelect?: (field: ParsedField) => void;
  className?: string;
}

// Mock parsed data
const mockParsedData: ParsedField[] = [
  {
    id: 'header',
    name: '报文头',
    type: 'Header',
    value: null,
    offset: 0,
    length: 8,
    status: 'success',
    expanded: true,
    children: [
      {
        id: 'magic',
        name: '魔数',
        type: 'uint32',
        value: '0x48656C6C',
        offset: 0,
        length: 4,
        status: 'success',
        description: '协议标识符'
      },
      {
        id: 'version',
        name: '版本',
        type: 'uint16',
        value: 1,
        offset: 4,
        length: 2,
        status: 'success',
        description: '协议版本号'
      },
      {
        id: 'length',
        name: '长度',
        type: 'uint16',
        value: 64,
        offset: 6,
        length: 2,
        status: 'success',
        description: '报文总长度'
      }
    ]
  },
  {
    id: 'payload',
    name: '载荷',
    type: 'Payload',
    value: 'Hello World',
    offset: 8,
    length: 11,
    status: 'success',
    description: '实际数据内容'
  },
  {
    id: 'checksum',
    name: '校验和',
    type: 'uint32',
    value: '0xDEADBEEF',
    offset: 19,
    length: 4,
    status: 'error',
    description: '校验和不匹配'
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

const formatValue = (value: any, type: string): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number') {
    if (type.includes('hex') || type.includes('uint')) {
      return `${value} (0x${value.toString(16).toUpperCase()})`;
    }
    return value.toString();
  }
  
  return JSON.stringify(value);
};

const TreeNode: React.FC<{
  field: ParsedField;
  level: number;
  onToggle: (id: string) => void;
  onFieldSelect?: (field: ParsedField) => void;
}> = ({ field, level, onToggle, onFieldSelect }) => {
  const hasChildren = field.children && field.children.length > 0;
  const isExpanded = field.expanded;

  const handleCopyValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formatValue(field.value, field.type));
  };

  const handleViewInHex = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFieldSelect?.(field);
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center px-2 py-1 text-sm hover:bg-accent rounded-md cursor-auto group",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={() => onFieldSelect?.(field)}
      >
        {/* Expand/Collapse Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            hasChildren && onToggle(field.id);
          }}
          className="mr-2 p-0.5 hover:bg-accent rounded"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )
          ) : (
            <div className="w-3 h-3" />
          )}
        </button>

        {/* Status Icon */}
        <div className="mr-2">
          {getStatusIcon(field.status)}
        </div>

        {/* Field Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-foreground truncate">
              {field.name}
            </span>
            <span className="text-xs text-muted-foreground">
              ({field.type})
            </span>
          </div>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              偏移: {field.offset}, 长度: {field.length}
            </span>
            {field.value !== null && field.value !== undefined && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-mono text-foreground">
                  {formatValue(field.value, field.type)}
                </span>
              </>
            )}
          </div>
          {field.description && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {field.description}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
          <button
            onClick={handleCopyValue}
            className="p-1 hover:bg-accent rounded"
            title="复制值"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={handleViewInHex}
            className="p-1 hover:bg-accent rounded"
            title="在Hex编辑器中查看"
          >
            <Eye className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {field.children!.map((child) => (
            <TreeNode
              key={child.id}
              field={child}
              level={level + 1}
              onToggle={onToggle}
              onFieldSelect={onFieldSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ParseTree: React.FC<ParseTreeProps> = ({ 
  message, 
  onFieldSelect,
  className 
}) => {
  const [treeData, setTreeData] = useState<ParsedField[]>(mockParsedData);

  const handleToggle = (id: string) => {
    const toggleNode = (nodes: ParsedField[]): ParsedField[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setTreeData(toggleNode(treeData));
  };

  if (!message) {
    return (
      <div className={cn("h-full flex items-center justify-center text-muted-foreground", className)}>
        <div className="text-center">
          <div className="text-4xl mb-2">🌳</div>
          <p>选择消息查看解析结果</p>
        </div>
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className={cn("h-full flex items-center justify-center text-muted-foreground", className)}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>解析失败</p>
          <p className="text-sm mt-1">无法识别的协议格式</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full overflow-auto", className)}>
      <div className="p-4 space-y-1">
        {treeData.map((field) => (
          <TreeNode
            key={field.id}
            field={field}
            level={0}
            onToggle={handleToggle}
            onFieldSelect={onFieldSelect}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-border p-4 bg-muted/30">
        <h4 className="font-medium text-sm mb-2">解析摘要</h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">总字段数:</span>
            <span className="ml-2 font-mono">
              {treeData.reduce((count, field) => 
                count + 1 + (field.children?.length || 0), 0
              )}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">解析状态:</span>
            <span className="ml-2 text-green-500">成功</span>
          </div>
          <div>
            <span className="text-muted-foreground">数据长度:</span>
            <span className="ml-2 font-mono">{message.data.length} 字节</span>
          </div>
          <div>
            <span className="text-muted-foreground">协议类型:</span>
            <span className="ml-2">自定义协议</span>
          </div>
        </div>
      </div>
    </div>
  );
};
