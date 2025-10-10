/**
 * Google (Gemini) 服务实现
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

export class GoogleService extends BaseAIService {
  get platform(): AIPlatform {
    return 'google';
  }

  async sendMessage(
    messages: AIMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    // TODO: 实现 Google Gemini API 调用
    throw new Error('Google service not yet implemented');
  }

  async sendMessageStream(
    messages: AIMessage[],
    options?: AIRequestOptions,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    // TODO: 实现 Google 流式 API 调用
    throw new Error('Google streaming not yet implemented');
  }

  async listModels(): Promise<AIModel[]> {
    return [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        platform: 'google',
        maxTokens: 32768,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsVision: false
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        platform: 'google',
        maxTokens: 16384,
        supportsStreaming: true,
        supportsFunctionCalling: false,
        supportsVision: true
      }
    ];
  }
}

