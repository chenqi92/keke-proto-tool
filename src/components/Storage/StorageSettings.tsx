import React, { useState } from 'react';
import { cn } from '@/utils';
import { ConfirmationModal } from '@/components/Common/ConfirmationModal';
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

interface NewRuleForm {
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: StorageCondition[];
  actions: StorageAction[];
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
  const [newRuleForm, setNewRuleForm] = useState<NewRuleForm>({
    name: '',
    description: '',
    enabled: true,
    priority: 1,
    conditions: [{ field: '', operator: 'equals', value: '' }],
    actions: [{ type: 'store', target: '', parameters: {} }]
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule =>
      rule.id === ruleId
        ? { ...rule, enabled: !rule.enabled, updatedAt: new Date() }
        : rule
    ));
  };

  const handleEditRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      setNewRuleForm({
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        priority: rule.priority,
        conditions: rule.conditions,
        actions: rule.actions
      });
      setEditingRule(ruleId);
      setIsAddingRule(true);
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    setShowDeleteConfirm(ruleId);
  };

  const confirmDeleteRule = () => {
    if (showDeleteConfirm) {
      setRules(prev => prev.filter(rule => rule.id !== showDeleteConfirm));
      setShowDeleteConfirm(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newRuleForm.name.trim()) {
      errors.name = '规则名称不能为空';
    }

    if (!newRuleForm.description.trim()) {
      errors.description = '规则描述不能为空';
    }

    if (newRuleForm.priority < 1 || newRuleForm.priority > 100) {
      errors.priority = '优先级必须在 1-100 之间';
    }

    // Validate conditions
    newRuleForm.conditions.forEach((condition, index) => {
      if (!condition.field.trim()) {
        errors[`condition_${index}_field`] = '条件字段不能为空';
      }
      if (!condition.value.trim()) {
        errors[`condition_${index}_value`] = '条件值不能为空';
      }
    });

    // Validate actions
    newRuleForm.actions.forEach((action, index) => {
      if (!action.target.trim()) {
        errors[`action_${index}_target`] = '动作目标不能为空';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveRule = () => {
    if (!validateForm()) {
      return;
    }

    if (editingRule) {
      // 编辑现有规则
      setRules(prev => prev.map(rule =>
        rule.id === editingRule
          ? { ...rule, ...newRuleForm, updatedAt: new Date() }
          : rule
      ));
    } else {
      // 创建新规则
      const newRule: StorageRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...newRuleForm,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setRules(prev => [...prev, newRule]);
    }

    setIsAddingRule(false);
    setEditingRule(null);
    resetForm();
  };

  const resetForm = () => {
    setNewRuleForm({
      name: '',
      description: '',
      enabled: true,
      priority: 1,
      conditions: [{ field: '', operator: 'equals', value: '' }],
      actions: [{ type: 'store', target: '', parameters: {} }]
    });
    setFormErrors({});
    setEditingRule(null);
  };

  const addCondition = () => {
    setNewRuleForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: '', operator: 'equals', value: '' }]
    }));
  };

  const removeCondition = (index: number) => {
    if (newRuleForm.conditions.length > 1) {
      setNewRuleForm(prev => ({
        ...prev,
        conditions: prev.conditions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateCondition = (index: number, field: keyof StorageCondition, value: any) => {
    setNewRuleForm(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) =>
        i === index ? { ...condition, [field]: value } : condition
      )
    }));
  };

  const addAction = () => {
    setNewRuleForm(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'store', target: '', parameters: {} }]
    }));
  };

  const removeAction = (index: number) => {
    if (newRuleForm.actions.length > 1) {
      setNewRuleForm(prev => ({
        ...prev,
        actions: prev.actions.filter((_, i) => i !== index)
      }));
    }
  };

  const updateAction = (index: number, field: keyof StorageAction, value: any) => {
    setNewRuleForm(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) =>
        i === index ? { ...action, [field]: value } : action
      )
    }));
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
            className="flex items-center space-x-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加规则</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Global Settings */}
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-3">全局设置</h3>
          <div className="bg-background border border-border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">默认存储引擎</label>
                <select className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="mysql">MySQL</option>
                  <option value="influxdb">InfluxDB</option>
                  <option value="redis">Redis</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">数据保留期限 (天)</label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">批量写入大小</label>
                <input
                  type="number"
                  defaultValue={1000}
                  className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">写入超时 (秒)</label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
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
                        onClick={() => handleEditRule(rule.id)}
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

      {/* Add Rule Modal */}
      {isAddingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {editingRule ? '编辑存储规则' : '新建存储规则'}
                  </h2>
                  <p className="text-sm text-muted-foreground">配置数据存储的条件和动作</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddingRule(false);
                  resetForm();
                }}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto">
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      规则名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newRuleForm.name}
                      onChange={(e) => setNewRuleForm(prev => ({ ...prev, name: e.target.value }))}
                      className={cn(
                        "w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                        formErrors.name ? "border-red-500" : "border-border"
                      )}
                      placeholder="输入规则名称"
                    />
                    {formErrors.name && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">优先级</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newRuleForm.priority}
                      onChange={(e) => setNewRuleForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                      className={cn(
                        "w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                        formErrors.priority ? "border-red-500" : "border-border"
                      )}
                    />
                    {formErrors.priority && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.priority}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    规则描述 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newRuleForm.description}
                    onChange={(e) => setNewRuleForm(prev => ({ ...prev, description: e.target.value }))}
                    className={cn(
                      "w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                      formErrors.description ? "border-red-500" : "border-border"
                    )}
                    rows={3}
                    placeholder="描述此规则的用途和功能"
                  />
                  {formErrors.description && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={newRuleForm.enabled}
                    onChange={(e) => setNewRuleForm(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <label htmlFor="enabled" className="text-sm font-medium">启用此规则</label>
                </div>

                {/* Conditions Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">触发条件</h3>
                    <button
                      onClick={addCondition}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>添加条件</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newRuleForm.conditions.map((condition, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 border border-border rounded-lg">
                        <select
                          value={condition.field}
                          onChange={(e) => updateCondition(index, 'field', e.target.value)}
                          className={cn(
                            "px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary",
                            formErrors[`condition_${index}_field`] ? "border-red-500" : "border-border"
                          )}
                        >
                          <option value="">选择字段</option>
                          <option value="protocol">协议类型</option>
                          <option value="dataSize">数据大小</option>
                          <option value="source">数据源</option>
                          <option value="type">数据类型</option>
                          <option value="timestamp">时间戳</option>
                        </select>
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="equals">等于</option>
                          <option value="contains">包含</option>
                          <option value="startsWith">开始于</option>
                          <option value="endsWith">结束于</option>
                          <option value="greater">大于</option>
                          <option value="less">小于</option>
                          <option value="regex">正则匹配</option>
                        </select>
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => updateCondition(index, 'value', e.target.value)}
                          className={cn(
                            "flex-1 px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary",
                            formErrors[`condition_${index}_value`] ? "border-red-500" : "border-border"
                          )}
                          placeholder="条件值"
                        />
                        {index < newRuleForm.conditions.length - 1 && (
                          <select
                            value={condition.logicalOperator || 'AND'}
                            onChange={(e) => updateCondition(index, 'logicalOperator', e.target.value)}
                            className="px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="AND">且</option>
                            <option value="OR">或</option>
                          </select>
                        )}
                        {newRuleForm.conditions.length > 1 && (
                          <button
                            onClick={() => removeCondition(index)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">执行动作</h3>
                    <button
                      onClick={addAction}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>添加动作</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newRuleForm.actions.map((action, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 border border-border rounded-lg">
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(index, 'type', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="store">存储</option>
                          <option value="transform">转换</option>
                          <option value="filter">过滤</option>
                          <option value="route">路由</option>
                        </select>
                        <input
                          type="text"
                          value={action.target}
                          onChange={(e) => updateAction(index, 'target', e.target.value)}
                          className={cn(
                            "flex-1 px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary",
                            formErrors[`action_${index}_target`] ? "border-red-500" : "border-border"
                          )}
                          placeholder="目标位置 (如: mysql_main, influxdb_metrics)"
                        />
                        {newRuleForm.actions.length > 1 && (
                          <button
                            onClick={() => removeAction(index)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border bg-muted/30 flex-shrink-0">
              <button
                onClick={() => {
                  setIsAddingRule(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveRule}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Save className="w-4 h-4 inline mr-2" />
                {editingRule ? '更新规则' : '保存规则'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={confirmDeleteRule}
        title="删除存储规则"
        message="确定要删除这个存储规则吗？此操作不可撤销。"
        type="warning"
        confirmText="确认删除"
      />
    </div>
  );
};
