/**
 * AI 服务基类
 * 提供通用的功能和工具
 */

import {
  AIConfig,
  AIService,
  AIMessage,
  AIResponse,
  AIRequestOptions,
  AIStreamChunk,
  AIPlatform,
  AIModel
} from '@/types/ai';

export abstract class BaseAIService implements AIService {
  protected config: AIConfig;
  
  constructor(config: AIConfig) {
    this.config = config;
  }

  abstract get platform(): AIPlatform;

  /**
   * 发送消息（非流式）
   */
  abstract sendMessage(
    messages: AIMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse>;

  /**
   * 发送消息（流式）
   */
  abstract sendMessageStream(
    messages: AIMessage[],
    options?: AIRequestOptions,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse>;

  /**
   * 列出可用模型
   */
  abstract listModels(): Promise<AIModel[]>;

  /**
   * 验证配置
   */
  async validateConfig(config: AIConfig): Promise<boolean> {
    try {
      // 尝试发送一个简单的测试消息
      const testMessage: AIMessage = {
        id: 'test',
        conversationId: 'test',
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      await this.sendMessage([testMessage], { maxTokens: 10 });
      return true;
    } catch (error) {
      console.error('Config validation failed:', error);
      return false;
    }
  }

  /**
   * 构建系统提示
   */
  protected buildSystemPrompt(options?: AIRequestOptions): string {
    const basePrompt = `你是 ProtoTool 的 AI 助手，一个专业的网络协议分析工具。你可以帮助用户：
- 分析网络消息和协议
- 诊断连接问题
- 转换数据格式
- 生成协议规则
- 提供技术建议

请用专业、准确、简洁的方式回答问题。`;

    if (options?.systemPrompt) {
      return `${basePrompt}\n\n${options.systemPrompt}`;
    }

    return basePrompt;
  }

  /**
   * 构建上下文信息
   */
  protected buildContextInfo(options?: AIRequestOptions): string {
    if (!options?.context) {
      return '';
    }

    const ctx = options.context;
    const parts: string[] = [];

    if (ctx.sessionName) {
      parts.push(`当前会话: ${ctx.sessionName}`);
    }

    if (ctx.protocol) {
      parts.push(`协议: ${ctx.protocol}`);
    }

    if (ctx.selectedMessage) {
      parts.push(`选中消息: ID=${ctx.selectedMessage.id}, 方向=${ctx.selectedMessage.direction}, 大小=${ctx.selectedMessage.size}字节`);
      parts.push(`数据: ${ctx.selectedMessage.data}`);
    }

    if (ctx.statistics) {
      parts.push(`统计: 总消息=${ctx.statistics.totalMessages}, 错误=${ctx.statistics.errorCount}`);
    }

    if (parts.length === 0) {
      return '';
    }

    return `\n\n当前上下文:\n${parts.join('\n')}`;
  }

  /**
   * 生成消息 ID
   */
  protected generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 处理错误
   */
  protected handleError(error: any): never {
    console.error('AI Service Error:', error);
    
    if (error.response) {
      // HTTP 错误
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;
      
      if (status === 401) {
        throw new Error('API Key 无效或已过期');
      } else if (status === 429) {
        throw new Error('请求过于频繁，请稍后再试');
      } else if (status === 500) {
        throw new Error('AI 服务暂时不可用');
      } else {
        throw new Error(`AI 服务错误: ${message}`);
      }
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('未知错误');
    }
  }

  /**
   * 估算 token 数量（简单估算）
   */
  protected estimateTokens(text: string): number {
    // 简单估算：英文约 4 字符 = 1 token，中文约 1.5 字符 = 1 token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 格式化工具定义为 OpenAI 格式
   */
  protected formatToolsForOpenAI(options?: AIRequestOptions) {
    if (!options?.tools || options.tools.length === 0) {
      return undefined;
    }

    return options.tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * 格式化消息为 OpenAI 格式
   */
  protected formatMessagesForOpenAI(messages: AIMessage[]) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.functionCall && { function_call: msg.functionCall }),
      ...(msg.toolCalls && { tool_calls: msg.toolCalls })
    }));
  }
}

