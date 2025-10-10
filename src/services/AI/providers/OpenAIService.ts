/**
 * OpenAI 服务实现
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

export class OpenAIService extends BaseAIService {
  get platform(): AIPlatform {
    return this.config.platform === 'azure' ? 'azure' : 'openai';
  }

  private getEndpoint(): string {
    if (this.config.apiEndpoint) {
      return this.config.apiEndpoint;
    }
    
    if (this.config.platform === 'azure') {
      // Azure OpenAI 端点格式
      return `https://${this.config.model}.openai.azure.com`;
    }
    
    return 'https://api.openai.com/v1';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.platform === 'azure') {
      headers['api-key'] = this.config.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  async sendMessage(
    messages: AIMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(options);
      const contextInfo = this.buildContextInfo(options);

      const allMessages = [
        {
          role: 'system',
          content: systemPrompt + contextInfo
        },
        ...this.formatMessagesForOpenAI(messages)
      ];

      const requestBody: any = {
        model: this.config.model,
        messages: allMessages,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 2000
      };

      // 添加工具定义
      const tools = this.formatToolsForOpenAI(options);
      if (tools) {
        requestBody.tools = tools;
        requestBody.tool_choice = 'auto';
      }

      const response = await fetch(`${this.getEndpoint()}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const data = await response.json();
      const choice = data.choices[0];

      const aiMessage: AIMessage = {
        id: this.generateMessageId(),
        conversationId: messages[0]?.conversationId || '',
        role: 'assistant',
        content: choice.message.content || '',
        timestamp: new Date(),
        toolCalls: choice.message.tool_calls,
        metadata: {
          model: data.model,
          tokens: {
            prompt: data.usage.prompt_tokens,
            completion: data.usage.completion_tokens,
            total: data.usage.total_tokens
          },
          finishReason: choice.finish_reason
        }
      };

      return {
        message: aiMessage,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        },
        finishReason: choice.finish_reason
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

      const allMessages = [
        {
          role: 'system',
          content: systemPrompt + contextInfo
        },
        ...this.formatMessagesForOpenAI(messages)
      ];

      const requestBody: any = {
        model: this.config.model,
        messages: allMessages,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 2000,
        stream: true
      };

      const tools = this.formatToolsForOpenAI(options);
      if (tools) {
        requestBody.tools = tools;
        requestBody.tool_choice = 'auto';
      }

      const response = await fetch(`${this.getEndpoint()}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let finishReason = '';
      const messageId = this.generateMessageId();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta;
              
              if (delta?.content) {
                fullContent += delta.content;
                
                if (onChunk) {
                  onChunk({
                    id: messageId,
                    content: fullContent,
                    delta: delta.content,
                    finishReason: parsed.choices[0]?.finish_reason
                  });
                }
              }

              if (parsed.choices[0]?.finish_reason) {
                finishReason = parsed.choices[0].finish_reason;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
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
          finishReason
        }
      };

      return {
        message: aiMessage,
        finishReason: finishReason as any
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async listModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${this.getEndpoint()}/models`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      
      return data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          platform: 'openai' as AIPlatform,
          maxTokens: this.getModelMaxTokens(model.id),
          supportsStreaming: true,
          supportsFunctionCalling: model.id.includes('gpt-4') || model.id.includes('gpt-3.5'),
          supportsVision: model.id.includes('vision')
        }));
    } catch (error) {
      console.error('Failed to list models:', error);
      return this.getDefaultModels();
    }
  }

  private getModelMaxTokens(modelId: string): number {
    if (modelId.includes('gpt-4-turbo') || modelId.includes('gpt-4-1106')) {
      return 128000;
    } else if (modelId.includes('gpt-4-32k')) {
      return 32768;
    } else if (modelId.includes('gpt-4')) {
      return 8192;
    } else if (modelId.includes('gpt-3.5-turbo-16k')) {
      return 16384;
    } else if (modelId.includes('gpt-3.5')) {
      return 4096;
    }
    return 4096;
  }

  private getDefaultModels(): AIModel[] {
    return [
      {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        platform: 'openai',
        maxTokens: 128000,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsVision: false
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        platform: 'openai',
        maxTokens: 8192,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsVision: false
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        platform: 'openai',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsFunctionCalling: true,
        supportsVision: false
      }
    ];
  }
}

