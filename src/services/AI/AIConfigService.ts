/**
 * AI 配置管理服务
 * 负责管理 AI 平台配置、API Key 等
 */

import { AIConfig, AIPlatform } from '@/types/ai';
import { AIDbService } from './AIDbService';

export class AIConfigService {
  /**
   * 获取所有配置
   */
  static async getConfigs(): Promise<AIConfig[]> {
    try {
      return await AIDbService.getAllConfigs();
    } catch (error) {
      console.error('Failed to load AI configs:', error);
      return [];
    }
  }

  /**
   * 获取配置
   */
  static async getConfig(id: string): Promise<AIConfig | null> {
    try {
      return await AIDbService.getConfig(id);
    } catch (error) {
      console.error('Failed to get AI config:', error);
      return null;
    }
  }

  /**
   * 获取默认配置
   */
  static async getDefaultConfig(): Promise<AIConfig | null> {
    try {
      const configs = await this.getConfigs();
      const defaultConfig = configs.find(c => c.isDefault && c.enabled);

      if (defaultConfig) {
        return defaultConfig;
      }

      // 如果没有默认配置，返回第一个启用的配置
      return configs.find(c => c.enabled) || null;
    } catch (error) {
      console.error('Failed to get default config:', error);
      return null;
    }
  }

  /**
   * 保存配置
   */
  static async saveConfig(config: Omit<AIConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIConfig> {
    const newConfig: AIConfig = {
      ...config,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await AIDbService.saveConfig(newConfig);

    // 如果标记为默认，清除其他默认配置
    if (config.isDefault) {
      await this.setDefaultConfig(newConfig.id);
    }

    return newConfig;
  }

  /**
   * 更新配置
   */
  static async updateConfig(id: string, updates: Partial<AIConfig>): Promise<AIConfig | null> {
    try {
      const config = await this.getConfig(id);
      if (!config) return null;

      const updatedConfig: AIConfig = {
        ...config,
        ...updates,
        id, // 确保 ID 不被修改
        updatedAt: new Date()
      };

      await AIDbService.updateConfig(updatedConfig);

      if (updates.isDefault) {
        await this.setDefaultConfig(id);
      }

      return updatedConfig;
    } catch (error) {
      console.error('Failed to update config:', error);
      return null;
    }
  }

  /**
   * 删除配置
   */
  static async deleteConfig(id: string): Promise<boolean> {
    try {
      const config = await this.getConfig(id);
      if (!config) return false;

      await AIDbService.deleteConfig(id);

      // 如果删除的是默认配置，设置另一个为默认
      if (config.isDefault) {
        const configs = await this.getConfigs();
        if (configs.length > 0) {
          await this.setDefaultConfig(configs[0].id);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to delete config:', error);
      return false;
    }
  }

  /**
   * 设置默认配置
   */
  static async setDefaultConfig(id: string): Promise<void> {
    try {
      // 清除所有默认配置
      await AIDbService.clearDefaultConfigs();

      // 设置新的默认配置
      const config = await this.getConfig(id);
      if (config) {
        config.isDefault = true;
        await AIDbService.updateConfig(config);
      }
    } catch (error) {
      console.error('Failed to set default config:', error);
    }
  }

  /**
   * 验证配置
   */
  static async validateConfig(config: AIConfig): Promise<{ valid: boolean; error?: string }> {
    try {
      // 基本验证
      if (!config.apiKey && config.platform !== 'local' && config.platform !== 'custom') {
        return { valid: false, error: 'API Key 不能为空' };
      }

      if (!config.model) {
        return { valid: false, error: '模型不能为空' };
      }

      // TODO: 调用 AI 服务进行实际验证
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '验证失败'
      };
    }
  }

  /**
   * 获取平台的默认模型
   */
  static getDefaultModel(platform: AIPlatform): string {
    switch (platform) {
      case 'openai':
        return 'gpt-3.5-turbo';
      case 'anthropic':
        return 'claude-3-sonnet-20240229';
      case 'google':
        return 'gemini-pro';
      case 'azure':
        return 'gpt-35-turbo';
      case 'local':
        return 'llama2';
      case 'custom':
        return '';
      default:
        return '';
    }
  }

  /**
   * 创建默认配置
   */
  static createDefaultConfig(platform: AIPlatform, apiKey: string): Omit<AIConfig, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: `${platform} 配置`,
      platform,
      apiKey,
      model: this.getDefaultModel(platform),
      temperature: 0.7,
      maxTokens: 2000,
      enabled: true,
      isDefault: false
    };
  }

  /**
   * 导出配置（不包含敏感信息）
   */
  static async exportConfig(id: string): Promise<string | null> {
    const config = await this.getConfig(id);
    if (!config) return null;

    const exported = {
      ...config,
      apiKey: '***' // 隐藏 API Key
    };

    return JSON.stringify(exported, null, 2);
  }

  /**
   * 导入配置
   */
  static async importConfig(jsonString: string): Promise<AIConfig | null> {
    try {
      const imported = JSON.parse(jsonString);

      // 验证必需字段
      if (!imported.platform || !imported.model) {
        throw new Error('Invalid config format');
      }

      // 创建新配置（不使用导入的 ID）
      return await this.saveConfig({
        name: imported.name || 'Imported Config',
        platform: imported.platform,
        apiKey: imported.apiKey || '',
        apiEndpoint: imported.apiEndpoint,
        model: imported.model,
        temperature: imported.temperature,
        maxTokens: imported.maxTokens,
        topP: imported.topP,
        frequencyPenalty: imported.frequencyPenalty,
        presencePenalty: imported.presencePenalty,
        enabled: imported.enabled ?? true,
        isDefault: false
      });
    } catch (error) {
      console.error('Failed to import config:', error);
      return null;
    }
  }

  /**
   * 私有方法：生成 ID
   */
  private static generateId(): string {
    return `ai_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

