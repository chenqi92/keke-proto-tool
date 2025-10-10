/**
 * AI 配置面板
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { AIConfig, AIPlatform } from '@/types/ai';
import { AIConfigService } from '@/services/AI';
import { AIServiceFactory } from '@/services/AI/AIServiceFactory';
import { Plus, Trash2, Check, Eye, EyeOff, Star } from 'lucide-react';

interface AIConfigPanelProps {
  className?: string;
}

export const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ className }) => {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [newConfig, setNewConfig] = useState<Partial<AIConfig>>({
    platform: 'openai',
    name: '',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    enabled: true
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const loaded = await AIConfigService.getConfigs();
    setConfigs(loaded);
  };

  const handleAdd = async () => {
    if (!newConfig.name || !newConfig.apiKey) {
      alert('请填写配置名称和 API Key');
      return;
    }

    await AIConfigService.saveConfig(newConfig as Omit<AIConfig, 'id' | 'createdAt' | 'updatedAt'>);
    await loadConfigs();
    setIsAdding(false);
    setNewConfig({
      platform: 'openai',
      name: '',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000,
      enabled: true
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个配置吗？')) {
      await AIConfigService.deleteConfig(id);
      await loadConfigs();
    }
  };

  const handleSetDefault = async (id: string) => {
    await AIConfigService.setDefaultConfig(id);
    await loadConfigs();
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await AIConfigService.updateConfig(id, { enabled });
    await loadConfigs();
  };

  const platforms = AIServiceFactory.getSupportedPlatforms();

  return (
    <div className={cn("flex flex-col h-full overflow-y-auto", className)}>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">AI 配置</h3>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3 h-3" />
            <span>添加配置</span>
          </button>
        </div>

        {/* Add new config */}
        {isAdding && (
          <div className="p-2.5 border rounded space-y-2">
            <h4 className="text-xs font-medium">新建配置</h4>

            <div>
              <label className="block text-xs font-medium mb-1">平台</label>
              <select
                value={newConfig.platform}
                onChange={(e) => {
                  const platform = e.target.value as AIPlatform;
                  setNewConfig({
                    ...newConfig,
                    platform,
                    model: AIConfigService.getDefaultModel(platform)
                  });
                }}
                className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">配置名称</label>
              <input
                type="text"
                value={newConfig.name}
                onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                placeholder="例如：我的 OpenAI"
                className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">API Key</label>
              <input
                type="password"
                value={newConfig.apiKey}
                onChange={(e) => setNewConfig({ ...newConfig, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">模型</label>
              <input
                type="text"
                value={newConfig.model}
                onChange={(e) => setNewConfig({ ...newConfig, model: e.target.value })}
                className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleAdd}
                className="px-2.5 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 text-xs border rounded hover:bg-accent transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Config list */}
        <div className="space-y-1.5">
          {configs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-xs">暂无配置</p>
              <p className="text-[10px] mt-1">点击"添加配置"开始使用 AI 助手</p>
            </div>
          ) : (
            configs.map((config) => (
              <div
                key={config.id}
                className={cn(
                  "p-2.5 border rounded space-y-1.5",
                  !config.enabled && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="text-xs font-medium">{config.name}</h4>
                      {config.isDefault && (
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {platforms.find(p => p.id === config.platform)?.name} • {config.model}
                    </p>
                  </div>

                  <div className="flex items-center space-x-0.5">
                    {!config.isDefault && (
                      <button
                        onClick={() => handleSetDefault(config.id)}
                        className="p-1 hover:bg-accent rounded"
                        title="设为默认"
                      >
                        <Star className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleEnabled(config.id, !config.enabled)}
                      className="p-1 hover:bg-accent rounded"
                      title={config.enabled ? '禁用' : '启用'}
                    >
                      <Check className={cn(
                        "w-3 h-3",
                        config.enabled ? "text-green-500" : "text-muted-foreground"
                      )} />
                    </button>

                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-1 hover:bg-accent rounded"
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <input
                    type={showApiKey[config.id] ? 'text' : 'password'}
                    value={config.apiKey}
                    readOnly
                    className="flex-1 px-2 py-1 text-xs border rounded bg-muted"
                  />
                  <button
                    onClick={() => setShowApiKey({
                      ...showApiKey,
                      [config.id]: !showApiKey[config.id]
                    })}
                    className="p-1 hover:bg-accent rounded"
                  >
                    {showApiKey[config.id] ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

