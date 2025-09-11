import { 
  ToolExecutor as IToolExecutor,
  ToolInput,
  ToolOutput,
  ToolContext,
  ToolExecutionResult,
  BaseTool
} from '@/types/toolbox';
import { toolRegistry } from './ToolRegistry';
import { generateId } from '@/utils';

interface ExecutionTask {
  id: string;
  toolId: string;
  input: ToolInput;
  context: ToolContext;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  result?: ToolExecutionResult;
  promise?: Promise<ToolExecutionResult>;
  cancelFn?: () => void;
}

export class ToolExecutor implements IToolExecutor {
  private executions = new Map<string, ExecutionTask>();
  private maxConcurrentExecutions = 5;

  constructor(maxConcurrentExecutions = 5) {
    this.maxConcurrentExecutions = maxConcurrentExecutions;
  }

  async execute(toolId: string, input: ToolInput, context: ToolContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Get tool registration
      const registration = toolRegistry.getById(toolId);
      if (!registration) {
        throw new Error(`Tool ${toolId} is not registered`);
      }

      if (!registration.enabled) {
        throw new Error(`Tool ${toolId} is disabled`);
      }

      const tool = registration.tool;

      // Validate input
      this.validateInput(tool, input);

      // Check if tool supports the current context
      this.validateContext(tool, context);

      // Initialize tool if needed
      await this.initializeTool(tool, context);

      // Execute the tool
      const output = await tool.execute(input);

      // Mark tool as used
      toolRegistry.markUsed(toolId);

      const executionTime = Date.now() - startTime;
      const result: ToolExecutionResult = {
        success: true,
        output,
        executionTime,
        toolId
      };

      // Emit execution event
      this.emitExecutionEvent('tool-executed', toolId, result);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const result: ToolExecutionResult = {
        success: false,
        error: errorMessage,
        executionTime,
        toolId
      };

      // Emit error event
      this.emitExecutionEvent('tool-error', toolId, result, errorMessage);

      return result;
    }
  }

  async executeInBackground(toolId: string, input: ToolInput, context: ToolContext): Promise<string> {
    // Check concurrent execution limit
    const runningTasks = Array.from(this.executions.values()).filter(task => task.status === 'running');
    if (runningTasks.length >= this.maxConcurrentExecutions) {
      throw new Error(`Maximum concurrent executions (${this.maxConcurrentExecutions}) reached`);
    }

    const executionId = generateId();
    const task: ExecutionTask = {
      id: executionId,
      toolId,
      input,
      context,
      status: 'running',
      startTime: new Date()
    };

    // Create cancellation mechanism
    let cancelled = false;
    task.cancelFn = () => {
      cancelled = true;
      task.status = 'cancelled';
    };

    // Start execution
    task.promise = this.executeWithCancellation(toolId, input, context, () => cancelled);
    
    // Handle completion
    task.promise.then(
      (result) => {
        task.status = 'completed';
        task.endTime = new Date();
        task.result = result;
      },
      (error) => {
        task.status = 'failed';
        task.endTime = new Date();
        task.result = {
          success: false,
          error: error.message,
          executionTime: Date.now() - task.startTime.getTime(),
          toolId
        };
      }
    );

    this.executions.set(executionId, task);

    // Clean up completed tasks after 5 minutes
    setTimeout(() => {
      this.executions.delete(executionId);
    }, 5 * 60 * 1000);

    return executionId;
  }

  getExecutionStatus(executionId: string): 'running' | 'completed' | 'failed' | 'cancelled' {
    const task = this.executions.get(executionId);
    return task?.status || 'failed';
  }

  cancelExecution(executionId: string): void {
    const task = this.executions.get(executionId);
    if (task && task.status === 'running' && task.cancelFn) {
      task.cancelFn();
    }
  }

  // Get execution result for background tasks
  async getExecutionResult(executionId: string): Promise<ToolExecutionResult | null> {
    const task = this.executions.get(executionId);
    if (!task) {
      return null;
    }

    if (task.promise) {
      await task.promise;
    }

    return task.result || null;
  }

  // Private methods
  private async executeWithCancellation(
    toolId: string, 
    input: ToolInput, 
    context: ToolContext, 
    isCancelled: () => boolean
  ): Promise<ToolExecutionResult> {
    // Check cancellation before starting
    if (isCancelled()) {
      throw new Error('Execution was cancelled');
    }

    return this.execute(toolId, input, context);
  }

  private validateInput(tool: BaseTool, input: ToolInput): void {
    // Validate data format if provided
    if (input.format && !tool.supportedFormats.includes(input.format)) {
      throw new Error(`Tool ${tool.id} does not support format ${input.format}`);
    }

    // Additional validation can be added here
  }

  private validateContext(tool: BaseTool, context: ToolContext): void {
    // Check if tool requires connection
    if (tool.requiresConnection && context.connectionStatus !== 'connected') {
      throw new Error(`Tool ${tool.id} requires an active connection`);
    }

    // Check protocol support
    if (context.protocol && !tool.supportedProtocols.includes(context.protocol) && !tool.supportedProtocols.includes('Custom')) {
      throw new Error(`Tool ${tool.id} does not support protocol ${context.protocol}`);
    }
  }

  private async initializeTool(tool: BaseTool, context: ToolContext): Promise<void> {
    try {
      await tool.initialize(context);
    } catch (error) {
      throw new Error(`Failed to initialize tool ${tool.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private emitExecutionEvent(event: string, toolId: string, result: ToolExecutionResult, error?: string): void {
    // This would integrate with the event bus
    console.log(`Tool execution event: ${event}`, { toolId, result, error });
  }

  // Utility methods
  getRunningExecutions(): ExecutionTask[] {
    return Array.from(this.executions.values()).filter(task => task.status === 'running');
  }

  getExecutionHistory(limit = 50): ExecutionTask[] {
    return Array.from(this.executions.values())
      .filter(task => task.status !== 'running')
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  clearExecutionHistory(): void {
    const runningTasks = Array.from(this.executions.entries()).filter(([_, task]) => task.status === 'running');
    this.executions.clear();
    runningTasks.forEach(([id, task]) => this.executions.set(id, task));
  }

  // Statistics
  getExecutionStats() {
    const tasks = Array.from(this.executions.values());
    return {
      total: tasks.length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      averageExecutionTime: this.calculateAverageExecutionTime(tasks)
    };
  }

  getConfig(): { executionTimeout: number; maxConcurrentExecutions: number } {
    return {
      executionTimeout: 30000, // 30 seconds default
      maxConcurrentExecutions: this.maxConcurrentExecutions
    };
  }

  private calculateAverageExecutionTime(tasks: ExecutionTask[]): number {
    const completedTasks = tasks.filter(t => t.result && t.result.success);
    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => sum + (task.result?.executionTime || 0), 0);
    return totalTime / completedTasks.length;
  }
}

// Singleton instance
export const toolExecutor = new ToolExecutor();
