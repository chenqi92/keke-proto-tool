/**
 * Anthropic (Claude) 服务实现
 */

import {
  AIMessage,
  AIResponse,
  AIRequestOptions,
  AIStreamChunk,
  AIPlatform,
  AIModel
} from '@/types/ai';
import { BaseAIService } from '../BaseAIService';

export class AnthropicService extends BaseAIService {
  get platform(): AIPlatform {
    return 'anthropic';
  }

  private getEndpoint(): string {
    return this.config.apiEndpoint || 'https://api.anthropic.com/v1';
  }

  async sendMessage(
    messages: AIMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    // TODO: 实现 Anthropic API 调用
    throw new Error('Anthropic service not yet implemented');
  }

  async sendMessageStream(
    messages: AIMessage[],
    options?: AIRequestOptions,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    // TODO: 实现 Anthropic 流式 API 调用
    throw new Error('Anthropic streaming not yet implemented');
  }

  async listModels(): Promise<AIModel[]> {
    return [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        platform: 'anthropic',
        maxTokens: 200000,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsVision: true
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        platform: 'anthropic',
        maxTokens: 200000,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsVision: true
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        platform: 'anthropic',
        maxTokens: 200000,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsVision: true
      }
    ];
  }
}

