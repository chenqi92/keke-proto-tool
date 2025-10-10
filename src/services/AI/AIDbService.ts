/**
 * AI Database Service
 * Handles communication with Tauri backend for AI data persistence
 */

import { invoke } from '@tauri-apps/api/core';
import type { AIConfig, AIConversation, AIMessage } from '@/types/ai';

// Database types matching Rust backend
interface DbAIConfig {
  id: string;
  name: string;
  platform: string;
  api_key: string;
  api_endpoint: string | null;
  model: string;
  temperature: number | null;
  max_tokens: number | null;
  top_p: number | null;
  frequency_penalty: number | null;
  presence_penalty: number | null;
  is_default: boolean;
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

interface DbAIConversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  pinned: boolean;
  tags: string | null; // JSON string
  context: string | null; // JSON string
}

interface DbAIMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  timestamp: number;
  function_call: string | null; // JSON string
  tool_calls: string | null; // JSON string
  metadata: string | null; // JSON string
}

export class AIDbService {
  // ==================== Config Operations ====================

  static async saveConfig(config: AIConfig): Promise<void> {
    const dbConfig: DbAIConfig = {
      id: config.id,
      name: config.name,
      platform: config.platform,
      api_key: config.apiKey,
      api_endpoint: config.apiEndpoint || null,
      model: config.model,
      temperature: config.temperature ?? null,
      max_tokens: config.maxTokens ?? null,
      top_p: config.topP ?? null,
      frequency_penalty: config.frequencyPenalty ?? null,
      presence_penalty: config.presencePenalty ?? null,
      is_default: config.isDefault ?? false,
      enabled: config.enabled ?? true,
      created_at: config.createdAt.getTime(),
      updated_at: config.updatedAt.getTime(),
    };

    await invoke('ai_save_config', { config: dbConfig });
  }

  static async getConfig(id: string): Promise<AIConfig | null> {
    const dbConfig = await invoke<DbAIConfig | null>('ai_get_config', { id });
    if (!dbConfig) return null;

    return this.dbConfigToAIConfig(dbConfig);
  }

  static async getAllConfigs(): Promise<AIConfig[]> {
    const dbConfigs = await invoke<DbAIConfig[]>('ai_get_all_configs');
    return dbConfigs.map(this.dbConfigToAIConfig);
  }

  static async updateConfig(config: AIConfig): Promise<void> {
    const dbConfig: DbAIConfig = {
      id: config.id,
      name: config.name,
      platform: config.platform,
      api_key: config.apiKey,
      api_endpoint: config.apiEndpoint || null,
      model: config.model,
      temperature: config.temperature ?? null,
      max_tokens: config.maxTokens ?? null,
      top_p: config.topP ?? null,
      frequency_penalty: config.frequencyPenalty ?? null,
      presence_penalty: config.presencePenalty ?? null,
      is_default: config.isDefault ?? false,
      enabled: config.enabled ?? true,
      created_at: config.createdAt.getTime(),
      updated_at: config.updatedAt.getTime(),
    };

    await invoke('ai_update_config', { config: dbConfig });
  }

  static async deleteConfig(id: string): Promise<void> {
    await invoke('ai_delete_config', { id });
  }

  static async clearDefaultConfigs(): Promise<void> {
    await invoke('ai_clear_default_configs');
  }

  // ==================== Conversation Operations ====================

  static async saveConversation(conversation: AIConversation): Promise<void> {
    const dbConversation: DbAIConversation = {
      id: conversation.id,
      title: conversation.title,
      created_at: conversation.createdAt.getTime(),
      updated_at: conversation.updatedAt.getTime(),
      pinned: conversation.pinned ?? false,
      tags: conversation.tags ? JSON.stringify(conversation.tags) : null,
      context: conversation.context ? JSON.stringify(conversation.context) : null,
    };

    await invoke('ai_save_conversation', { conversation: dbConversation });
  }

  static async getConversation(id: string): Promise<AIConversation | null> {
    const dbConv = await invoke<DbAIConversation | null>('ai_get_conversation', { id });
    if (!dbConv) return null;

    // Get messages for this conversation
    const messages = await this.getMessagesByConversation(id);

    return this.dbConversationToAIConversation(dbConv, messages);
  }

  static async getAllConversations(): Promise<AIConversation[]> {
    const dbConvs = await invoke<DbAIConversation[]>('ai_get_all_conversations');
    
    // Get messages for all conversations
    const conversations = await Promise.all(
      dbConvs.map(async (dbConv) => {
        const messages = await this.getMessagesByConversation(dbConv.id);
        return this.dbConversationToAIConversation(dbConv, messages);
      })
    );

    return conversations;
  }

  static async updateConversation(conversation: AIConversation): Promise<void> {
    const dbConversation: DbAIConversation = {
      id: conversation.id,
      title: conversation.title,
      created_at: conversation.createdAt.getTime(),
      updated_at: conversation.updatedAt.getTime(),
      pinned: conversation.pinned ?? false,
      tags: conversation.tags ? JSON.stringify(conversation.tags) : null,
      context: conversation.context ? JSON.stringify(conversation.context) : null,
    };

    await invoke('ai_update_conversation', { conversation: dbConversation });
  }

  static async deleteConversation(id: string): Promise<void> {
    await invoke('ai_delete_conversation', { id });
  }

  // ==================== Message Operations ====================

  static async saveMessage(message: AIMessage): Promise<void> {
    const dbMessage: DbAIMessage = {
      id: message.id,
      conversation_id: message.conversationId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.getTime(),
      function_call: message.functionCall ? JSON.stringify(message.functionCall) : null,
      tool_calls: message.toolCalls ? JSON.stringify(message.toolCalls) : null,
      metadata: message.metadata ? JSON.stringify(message.metadata) : null,
    };

    await invoke('ai_save_message', { message: dbMessage });
  }

  static async getMessagesByConversation(conversationId: string): Promise<AIMessage[]> {
    const dbMessages = await invoke<DbAIMessage[]>('ai_get_messages_by_conversation', {
      conversationId,
    });

    return dbMessages.map(this.dbMessageToAIMessage);
  }

  static async deleteMessage(id: string): Promise<void> {
    await invoke('ai_delete_message', { id });
  }

  static async deleteMessagesByConversation(conversationId: string): Promise<void> {
    await invoke('ai_delete_messages_by_conversation', { conversationId });
  }

  // ==================== Helper Methods ====================

  private static dbConfigToAIConfig(dbConfig: DbAIConfig): AIConfig {
    return {
      id: dbConfig.id,
      name: dbConfig.name,
      platform: dbConfig.platform as any,
      apiKey: dbConfig.api_key,
      apiEndpoint: dbConfig.api_endpoint || undefined,
      model: dbConfig.model,
      temperature: dbConfig.temperature ?? undefined,
      maxTokens: dbConfig.max_tokens ?? undefined,
      topP: dbConfig.top_p ?? undefined,
      frequencyPenalty: dbConfig.frequency_penalty ?? undefined,
      presencePenalty: dbConfig.presence_penalty ?? undefined,
      isDefault: dbConfig.is_default,
      enabled: dbConfig.enabled,
      createdAt: new Date(dbConfig.created_at),
      updatedAt: new Date(dbConfig.updated_at),
    };
  }

  private static dbConversationToAIConversation(
    dbConv: DbAIConversation,
    messages: AIMessage[]
  ): AIConversation {
    return {
      id: dbConv.id,
      title: dbConv.title,
      messages,
      createdAt: new Date(dbConv.created_at),
      updatedAt: new Date(dbConv.updated_at),
      pinned: dbConv.pinned,
      tags: dbConv.tags ? JSON.parse(dbConv.tags) : undefined,
      context: dbConv.context ? JSON.parse(dbConv.context) : undefined,
    };
  }

  private static dbMessageToAIMessage(dbMessage: DbAIMessage): AIMessage {
    return {
      id: dbMessage.id,
      conversationId: dbMessage.conversation_id,
      role: dbMessage.role as any,
      content: dbMessage.content,
      timestamp: new Date(dbMessage.timestamp),
      functionCall: dbMessage.function_call ? JSON.parse(dbMessage.function_call) : undefined,
      toolCalls: dbMessage.tool_calls ? JSON.parse(dbMessage.tool_calls) : undefined,
      metadata: dbMessage.metadata ? JSON.parse(dbMessage.metadata) : undefined,
    };
  }
}

