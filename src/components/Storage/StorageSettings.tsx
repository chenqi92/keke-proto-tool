import React, { useState } from 'react';
import { cn } from '@/utils';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Filter,
  ArrowRight,
  Database,
  FileText,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface StorageRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: StorageCondition[];
  actions: StorageAction[];
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

interface StorageCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'greater' | 'less';
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

interface StorageAction {
  type: 'store' | 'transform' | 'filter' | 'route';
  target: string;
  parameters: Record<string, any>;
}

export const StorageSettings: React.FC = () => {
  const [rules, setRules] = useState<StorageRule[]>([
    {
      id: 'rule_1',
      name: '协议数据存储',
      description: '将所有协议数据存储到主数据库',
      enabled: true,
      conditions: [
        { field: 'protocol', operator: 'equals', value: 'TCP' },
        { field: 'dataSize', operator: 'greater', value: '0', logicalOperator: 'AND' }
      ],
      actions: [
        { type: 'store', target: 'mysql_main', parameters: { table: 'protocol_data' } }
      ],
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'rule_2',
      name: '性能指标存储',
      description: '将性能指标数据存储到时序数据库',
      enabled: true,
      conditions: [
        { field: 'type', operator: 'equals', value: 'metrics' }
      ],
      actions: [
        { type: 'store', target: 'influxdb_metrics', parameters: { measurement: 'performance' } }
      ],
      priority: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, enabled: !rule.enabled, updatedAt: new Date() }
        : rule
    ));
  };

  const handleDeleteRule = (ruleId: string) => {
    if (window.confirm('确定要删除这个存储规则吗？')) {
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
    }
  };

  const getConditionText = (condition: StorageCondition) => {
    const operatorText = {
      equals: '等于',
      contains: '包含',
      startsWith: '开始于',
      endsWith: '结束于',
      regex: '匹配正则',
      greater: '大于',
      less: '小于'
    };

    return `${condition.field} ${operatorText[condition.operator]} "${condition.value}"`;
  };

  const getActionText = (action: StorageAction) => {
    const actionText = {
      store: '存储到',
      transform: '转换为',
      filter: '过滤',
      route: '路由到'
    };

    return `${actionText[action.type]} ${action.target}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">存储设置</h2>
              <p className="text-sm text-muted-foreground">配置数据存储策略和规则</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddingRule(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>添加规则</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Global Settings */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">全局设置</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">默认存储引擎</label>
                <select className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="mysql">MySQL</option>
                  <option value="influxdb">InfluxDB</option>
                  <option value="redis">Redis</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">数据保留期限 (天)</label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">批量写入大小</label>
                <input
                  type="number"
                  defaultValue={1000}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">写入超时 (秒)</label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Storage Rules */}
        <div>
          <h3 className="text-lg font-semibold mb-4">存储规则</h3>
          
          {rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h4 className="text-lg font-semibold mb-2">暂无存储规则</h4>
              <p className="mb-4">创建存储规则来自动化数据路由和处理</p>
              <button
                onClick={() => setIsAddingRule(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                创建第一个规则
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "border border-border rounded-lg p-4 transition-all",
                    rule.enabled ? "bg-background" : "bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full mt-1",
                        rule.enabled ? "bg-green-500" : "bg-gray-400"
                      )} />
                      <div>
                        <h4 className="font-semibold">{rule.name}</h4>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">优先级: {rule.priority}</span>
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={cn(
                          "px-2 py-1 text-xs rounded transition-colors",
                          rule.enabled 
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {rule.enabled ? '启用' : '禁用'}
                      </button>
                      <button
                        onClick={() => setEditingRule(rule.id)}
                        className="p-1 hover:bg-accent rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 hover:bg-accent rounded transition-colors text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Rule Logic */}
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 rounded">
                      <Filter className="w-3 h-3 text-blue-600" />
                      <span className="text-blue-700">条件:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {rule.conditions.map((condition, index) => (
                        <React.Fragment key={index}>
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            {getConditionText(condition)}
                          </span>
                          {index < rule.conditions.length - 1 && condition.logicalOperator && (
                            <span className="text-xs font-medium text-muted-foreground">
                              {condition.logicalOperator}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded">
                      <Database className="w-3 h-3 text-green-600" />
                      <span className="text-green-700">动作:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {rule.actions.map((action, index) => (
                        <span key={index} className="px-2 py-1 bg-muted rounded text-xs">
                          {getActionText(action)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
