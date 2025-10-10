/**
 * AI 助手系统类型定义
 */

// AI 平台类型
export type AIPlatform = 'openai' | 'anthropic' | 'google' | 'azure' | 'local' | 'custom';

// AI 模型配置
export interface AIModel {
  id: string;
  name: string;
  platform: AIPlatform;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
}

// AI 配置
export interface AIConfig {
  id: string;
  name: string;
  platform: AIPlatform;
  apiKey: string;
  apiEndpoint?: string; // 自定义端点
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  isDefault?: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 消息角色
export type MessageRole = 'system' | 'user' | 'assistant' | 'function' | 'tool';

// AI 消息
export interface AIMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  functionCall?: AIFunctionCall;
  toolCalls?: AIToolCall[];
  metadata?: {
    model?: string;
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
    finishReason?: string;
    error?: string;
  };
}

// 函数调用
export interface AIFunctionCall {
  name: string;
  arguments: string; // JSON string
}

// 工具调用
export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// 对话会话
export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  context?: AIContext;
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
  tags?: string[];
}

// AI 上下文
export interface AIContext {
  sessionId?: string;
  sessionName?: string;
  protocol?: string;
  selectedMessage?: {
    id: string;
    timestamp: Date;
    direction: string;
    size: number;
    data: string; // hex string
  };
  recentMessages?: Array<{
    id: string;
    timestamp: Date;
    direction: string;
    size: number;
  }>;
  statistics?: {
    totalMessages: number;
    errorCount: number;
    bytesReceived: number;
    bytesSent: number;
  };
  customData?: Record<string, any>;
}

// AI 工具定义
export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: any;
    }>;
    required?: string[];
  };
  handler: (args: any, context: AIContext) => Promise<any>;
}

// AI 工具调用结果
export interface AIToolResult {
  toolCallId: string;
  result: any;
  error?: string;
}

// AI 请求选项
export interface AIRequestOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  tools?: AITool[];
  systemPrompt?: string;
  context?: AIContext;
}

// AI 响应
export interface AIResponse {
  message: AIMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter';
}

// 流式响应块
export interface AIStreamChunk {
  id: string;
  content: string;
  delta: string;
  finishReason?: string;
  toolCalls?: AIToolCall[];
}

// AI 服务接口
export interface AIService {
  platform: AIPlatform;
  sendMessage(
    messages: AIMessage[],
    options?: AIRequestOptions
  ): Promise<AIResponse>;
  sendMessageStream(
    messages: AIMessage[],
    options: AIRequestOptions | undefined,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<AIResponse>;
  listModels(): Promise<AIModel[]>;
  validateConfig(config: AIConfig): Promise<boolean>;
}

// AI 助手状态
export interface AIAssistantState {
  isOpen: boolean;
  currentConversation: AIConversation | null;
  conversations: AIConversation[];
  activeConfig: AIConfig | null;
  availableConfigs: AIConfig[];
  isProcessing: boolean;
  error: string | null;
  context: AIContext | null;
}

// AI 功能类型
export type AIFeature = 
  | 'message_analysis'      // 消息分析
  | 'protocol_detection'    // 协议检测
  | 'error_diagnosis'       // 错误诊断
  | 'data_conversion'       // 数据转换
  | 'pattern_recognition'   // 模式识别
  | 'session_summary'       // 会话摘要
  | 'code_generation'       // 代码生成
  | 'documentation'         // 文档查询
  | 'troubleshooting';      // 故障排查

// AI 快捷命令
export interface AIQuickCommand {
  id: string;
  name: string;
  description: string;
  prompt: string;
  feature: AIFeature;
  icon?: string;
  requiresContext?: boolean;
}

// AI 设置
export interface AISettings {
  defaultPlatform: AIPlatform;
  defaultModel: string;
  autoContext: boolean; // 自动收集上下文
  streamResponse: boolean; // 流式响应
  saveHistory: boolean; // 保存对话历史
  maxHistoryLength: number;
  quickCommands: AIQuickCommand[];
}

// 预设的快捷命令
export const DEFAULT_QUICK_COMMANDS: AIQuickCommand[] = [
  {
    id: 'analyze-message',
    name: '分析消息',
    description: '分析选中的消息内容',
    prompt: '请分析这条消息的内容和结构',
    feature: 'message_analysis',
    requiresContext: true
  },
  {
    id: 'detect-protocol',
    name: '检测协议',
    description: '自动检测消息使用的协议',
    prompt: '请根据消息数据检测使用的通信协议',
    feature: 'protocol_detection',
    requiresContext: true
  },
  {
    id: 'diagnose-error',
    name: '诊断错误',
    description: '诊断连接或通信错误',
    prompt: '请帮我诊断当前会话中的错误',
    feature: 'error_diagnosis',
    requiresContext: true
  },
  {
    id: 'convert-data',
    name: '转换数据',
    description: '转换数据格式',
    prompt: '请帮我转换这个数据的格式',
    feature: 'data_conversion',
    requiresContext: true
  },
  {
    id: 'summarize-session',
    name: '会话摘要',
    description: '生成会话摘要报告',
    prompt: '请生成当前会话的摘要报告',
    feature: 'session_summary',
    requiresContext: true
  }
];

