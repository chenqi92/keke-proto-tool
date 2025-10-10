/**
 * AI 助手服务
 * 管理对话、上下文和工具调用
 */

import {
  AIConversation,
  AIMessage,
  AIContext,
  AIRequestOptions,
  AIResponse,
  AIStreamChunk,
  AIConfig
} from '@/types/ai';
import { AIServiceFactory } from './AIServiceFactory';
import { AIConfigService } from './AIConfigService';
import { AIToolRegistry } from './AIToolRegistry';
import { AIDbService } from './AIDbService';

const MAX_CONVERSATIONS = 50;

export class AIAssistantService {
  /**
   * 发送消息
   */
  static async sendMessage(
    conversationId: string,
    content: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const config = options?.context?.customData?.config as AIConfig | undefined
      || await AIConfigService.getDefaultConfig();

    if (!config) {
      throw new Error('No AI configuration available');
    }

    // 添加用户消息
    const userMessage: AIMessage = {
      id: this.generateMessageId(),
      conversationId,
      role: 'user',
      content,
      timestamp: new Date()
    };

    conversation.messages.push(userMessage);
    await AIDbService.saveMessage(userMessage);
    conversation.updatedAt = new Date();
    await AIDbService.updateConversation(conversation);

    // 获取 AI 服务
    const service = AIServiceFactory.getService(config);

    // 准备请求选项
    const requestOptions: AIRequestOptions = {
      ...options,
      tools: AIToolRegistry.getAllTools(),
      context: conversation.context
    };

    // 发送消息
    const response = await service.sendMessage(
      conversation.messages,
      requestOptions
    );

    // 保存 AI 响应
    response.message.conversationId = conversationId;
    conversation.messages.push(response.message);
    await AIDbService.saveMessage(response.message);
    conversation.updatedAt = new Date();
    await AIDbService.updateConversation(conversation);

    // 处理工具调用
    if (response.message.toolCalls && response.message.toolCalls.length > 0) {
      await this.handleToolCalls(conversationId, response.message.toolCalls, conversation.context);
    }

    return response;
  }

  /**
   * 发送消息（流式）
   */
  static async sendMessageStream(
    conversationId: string,
    content: string,
    onChunk: (chunk: AIStreamChunk) => void,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const config = options?.context?.customData?.config as AIConfig | undefined
      || await AIConfigService.getDefaultConfig();

    if (!config) {
      throw new Error('No AI configuration available');
    }

    // 添加用户消息
    const userMessage: AIMessage = {
      id: this.generateMessageId(),
      conversationId,
      role: 'user',
      content,
      timestamp: new Date()
    };

    conversation.messages.push(userMessage);
    await AIDbService.saveMessage(userMessage);
    conversation.updatedAt = new Date();
    await AIDbService.updateConversation(conversation);

    // 获取 AI 服务
    const service = AIServiceFactory.getService(config);

    // 准备请求选项
    const requestOptions: AIRequestOptions = {
      ...options,
      stream: true,
      tools: AIToolRegistry.getAllTools(),
      context: conversation.context
    };

    // 发送消息
    const response = await service.sendMessageStream(
      conversation.messages,
      requestOptions,
      onChunk
    );

    // 保存 AI 响应
    response.message.conversationId = conversationId;
    conversation.messages.push(response.message);
    await AIDbService.saveMessage(response.message);
    conversation.updatedAt = new Date();
    await AIDbService.updateConversation(conversation);

    return response;
  }

  /**
   * 创建新对话
   */
  static async createConversation(title?: string, context?: AIContext): Promise<AIConversation> {
    const conversation: AIConversation = {
      id: this.generateConversationId(),
      title: title || '新对话',
      messages: [],
      context,
      createdAt: new Date(),
      updatedAt: new Date(),
      pinned: false
    };

    await AIDbService.saveConversation(conversation);
    return conversation;
  }

  /**
   * 获取对话
   */
  static async getConversation(id: string): Promise<AIConversation | null> {
    try {
      return await AIDbService.getConversation(id);
    } catch (error) {
      console.error('Failed to get conversation:', error);
      return null;
    }
  }

  /**
   * 获取所有对话
   */
  static async getConversations(): Promise<AIConversation[]> {
    try {
      return await AIDbService.getAllConversations();
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  }

  /**
   * 更新对话
   */
  static async updateConversation(id: string, updates: Partial<AIConversation>): Promise<AIConversation | null> {
    try {
      const conversation = await this.getConversation(id);
      if (!conversation) return null;

      const updated: AIConversation = {
        ...conversation,
        ...updates,
        id, // 确保 ID 不被修改
        updatedAt: new Date()
      };

      await AIDbService.updateConversation(updated);
      return updated;
    } catch (error) {
      console.error('Failed to update conversation:', error);
      return null;
    }
  }

  /**
   * 删除对话
   */
  static async deleteConversation(id: string): Promise<boolean> {
    try {
      await AIDbService.deleteConversation(id);
      return true;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }
  }

  /**
   * 清空对话消息
   */
  static async clearConversationMessages(id: string): Promise<boolean> {
    try {
      const conversation = await this.getConversation(id);
      if (!conversation) return false;

      await AIDbService.deleteMessagesByConversation(id);
      conversation.messages = [];
      conversation.updatedAt = new Date();
      await AIDbService.updateConversation(conversation);
      return true;
    } catch (error) {
      console.error('Failed to clear messages:', error);
      return false;
    }
  }

  /**
   * 更新对话上下文
   */
  static async updateContext(conversationId: string, context: AIContext): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return;

    conversation.context = context;
    conversation.updatedAt = new Date();
    await AIDbService.updateConversation(conversation);
  }

  /**
   * 处理工具调用
   */
  private static async handleToolCalls(
    conversationId: string,
    toolCalls: any[],
    context?: AIContext
  ): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return;

    for (const toolCall of toolCalls) {
      try {
        const result = await AIToolRegistry.executeTool(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments),
          context || {}
        );

        // 添加工具结果消息
        const toolResultMessage: AIMessage = {
          id: this.generateMessageId(),
          conversationId,
          role: 'tool',
          content: JSON.stringify(result),
          timestamp: new Date()
        };

        conversation.messages.push(toolResultMessage);
        await AIDbService.saveMessage(toolResultMessage);
      } catch (error) {
        console.error('Tool execution failed:', error);

        const errorMessage: AIMessage = {
          id: this.generateMessageId(),
          conversationId,
          role: 'tool',
          content: JSON.stringify({
            error: error instanceof Error ? error.message : 'Tool execution failed'
          }),
          timestamp: new Date()
        };

        conversation.messages.push(errorMessage);
        await AIDbService.saveMessage(errorMessage);
      }
    }

    conversation.updatedAt = new Date();
    await AIDbService.updateConversation(conversation);
  }

  /**
   * 生成消息 ID
   */
  private static generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成对话 ID
   */
  private static generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

