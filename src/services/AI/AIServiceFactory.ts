/**
 * AI 服务工厂
 * 根据配置创建对应平台的 AI 服务实例
 */

import { AIConfig, AIService, AIPlatform } from '@/types/ai';
import { OpenAIService } from './providers/OpenAIService';
import { AnthropicService } from './providers/AnthropicService';
import { GoogleService } from './providers/GoogleService';
import { LocalService } from './providers/LocalService';

export class AIServiceFactory {
  private static instances: Map<string, AIService> = new Map();

  /**
   * 获取 AI 服务实例
   */
  static getService(config: AIConfig): AIService {
    const cacheKey = `${config.platform}-${config.id}`;
    
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    const service = this.createService(config);
    this.instances.set(cacheKey, service);
    return service;
  }

  /**
   * 创建 AI 服务实例
   */
  private static createService(config: AIConfig): AIService {
    switch (config.platform) {
      case 'openai':
        return new OpenAIService(config);
      
      case 'anthropic':
        return new AnthropicService(config);
      
      case 'google':
        return new GoogleService(config);
      
      case 'azure':
        // Azure OpenAI 使用 OpenAI 服务但配置不同
        return new OpenAIService(config);
      
      case 'local':
        return new LocalService(config);
      
      case 'custom':
        // 自定义端点，尝试使用 OpenAI 兼容接口
        return new OpenAIService(config);
      
      default:
        throw new Error(`Unsupported AI platform: ${config.platform}`);
    }
  }

  /**
   * 清除缓存的服务实例
   */
  static clearCache(configId?: string) {
    if (configId) {
      // 清除特定配置的实例
      for (const [key, _] of this.instances) {
        if (key.includes(configId)) {
          this.instances.delete(key);
        }
      }
    } else {
      // 清除所有实例
      this.instances.clear();
    }
  }

  /**
   * 获取支持的平台列表
   */
  static getSupportedPlatforms(): Array<{
    id: AIPlatform;
    name: string;
    description: string;
    requiresApiKey: boolean;
  }> {
    return [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'GPT-4, GPT-3.5 等模型',
        requiresApiKey: true
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'Claude 系列模型',
        requiresApiKey: true
      },
      {
        id: 'google',
        name: 'Google',
        description: 'Gemini 系列模型',
        requiresApiKey: true
      },
      {
        id: 'azure',
        name: 'Azure OpenAI',
        description: 'Azure 托管的 OpenAI 模型',
        requiresApiKey: true
      },
      {
        id: 'local',
        name: '本地模型',
        description: 'Ollama、LM Studio 等本地模型',
        requiresApiKey: false
      },
      {
        id: 'custom',
        name: '自定义端点',
        description: '兼容 OpenAI API 的自定义服务',
        requiresApiKey: false
      }
    ];
  }
}

