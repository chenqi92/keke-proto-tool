/**
 * 本地模型服务实现
 * 支持 Ollama、LM Studio 等本地 AI 服务
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

export class LocalService extends BaseAIService {
  get platform(): AIPlatform {
    return 'local';
  }

  private getEndpoint(): string {
    // 默认 Ollama 端点
    return this.config.apiEndpoint || 'http://localhost:11434';
  }

  async sendMessage(
    messages: AIMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(options);
      const contextInfo = this.buildContextInfo(options);

      // Ollama API 格式
      const requestBody = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt + contextInfo
          },
          ...this.formatMessagesForOpenAI(messages)
        ],
        stream: false,
        options: {
          temperature: options?.temperature ?? this.config.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? this.config.maxTokens ?? 2000
        }
      };

      const response = await fetch(`${this.getEndpoint()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Local AI service request failed');
      }

      const data = await response.json();

      const aiMessage: AIMessage = {
        id: this.generateMessageId(),
        conversationId: messages[0]?.conversationId || '',
        role: 'assistant',
        content: data.message.content,
        timestamp: new Date(),
        metadata: {
          model: data.model,
          finishReason: data.done ? 'stop' : undefined
        }
      };

      return {
        message: aiMessage,
        finishReason: 'stop'
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async sendMessageStream(
    messages: AIMessage[],
    options?: AIRequestOptions,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(options);
      const contextInfo = this.buildContextInfo(options);

      const requestBody = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt + contextInfo
          },
          ...this.formatMessagesForOpenAI(messages)
        ],
        stream: true,
        options: {
          temperature: options?.temperature ?? this.config.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? this.config.maxTokens ?? 2000
        }
      };

      const response = await fetch(`${this.getEndpoint()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Local AI service request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      const messageId = this.generateMessageId();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.message?.content) {
              const delta = parsed.message.content;
              fullContent += delta;
              
              if (onChunk) {
                onChunk({
                  id: messageId,
                  content: fullContent,
                  delta,
                  finishReason: parsed.done ? 'stop' : undefined
                });
              }
            }
          } catch (e) {
            console.error('Failed to parse stream data:', e);
          }
        }
      }

      const aiMessage: AIMessage = {
        id: messageId,
        conversationId: messages[0]?.conversationId || '',
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        metadata: {
          model: this.config.model,
          finishReason: 'stop'
        }
      };

      return {
        message: aiMessage,
        finishReason: 'stop'
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${this.getEndpoint()}/api/tags`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch local models');
      }

      const data = await response.json();
      
      return data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
        platform: 'local' as AIPlatform,
        maxTokens: 4096, // 默认值
        supportsStreaming: true,
        supportsFunctionCalling: false,
        supportsVision: false
      }));
    } catch (error) {
      console.error('Failed to list local models:', error);
      return [];
    }
  }
}

