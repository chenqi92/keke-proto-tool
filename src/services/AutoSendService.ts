/**
 * AutoSendService - 管理所有session的自动发送功能
 * 
 * 这个服务在后台运行，不依赖于UI组件的生命周期
 * 当session的autoSendEnabled状态改变时，自动启动或停止定时器
 */

import { useAppStore } from '@/stores/AppStore';
import { networkService } from './NetworkService';
import { formatData, validateFormat } from '@/components/DataFormatSelector';

class AutoSendService {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  /**
   * 初始化服务，开始监听store变化
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('AutoSendService: Already initialized');
      return;
    }

    console.log('AutoSendService: Initializing...');
    this.isInitialized = true;

    // 订阅store变化
    useAppStore.subscribe((state, prevState) => {
      // 检查每个session的autoSendEnabled状态
      Object.keys(state.sessions).forEach(sessionId => {
        const session = state.sessions[sessionId];
        const prevSession = prevState.sessions[sessionId];

        // 如果session不存在了，停止其定时器
        if (!session && this.timers.has(sessionId)) {
          this.stopAutoSend(sessionId);
          return;
        }

        if (!session) return;

        // 检查autoSendEnabled或autoSendInterval是否改变
        const enabledChanged = session.autoSendEnabled !== prevSession?.autoSendEnabled;
        const intervalChanged = session.autoSendInterval !== prevSession?.autoSendInterval;
        const statusChanged = session.status !== prevSession?.status;

        if (enabledChanged || intervalChanged || statusChanged) {
          // 如果启用了自动发送且已连接，启动定时器
          if (session.autoSendEnabled && session.status === 'connected') {
            this.startAutoSend(sessionId);
          } else {
            // 否则停止定时器
            this.stopAutoSend(sessionId);
          }
        }
      });

      // 清理已删除session的定时器
      this.timers.forEach((_, sessionId) => {
        if (!state.sessions[sessionId]) {
          this.stopAutoSend(sessionId);
        }
      });
    });

    console.log('AutoSendService: Initialized successfully');
  }

  /**
   * 启动指定session的自动发送
   */
  private startAutoSend(sessionId: string) {
    // 先停止现有的定时器
    this.stopAutoSend(sessionId);

    const session = useAppStore.getState().sessions[sessionId];
    if (!session) {
      console.warn(`AutoSendService: Session ${sessionId} not found`);
      return;
    }

    const interval = session.autoSendInterval || 1000;
    console.log(`AutoSendService: Starting auto-send for session ${sessionId} with interval ${interval}ms`);

    const timer = setInterval(() => {
      this.performAutoSend(sessionId);
    }, interval);

    this.timers.set(sessionId, timer);
  }

  /**
   * 停止指定session的自动发送
   */
  private stopAutoSend(sessionId: string) {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(sessionId);
      console.log(`AutoSendService: Stopped auto-send for session ${sessionId}`);
    }
  }

  /**
   * 执行自动发送
   */
  private async performAutoSend(sessionId: string) {
    const session = useAppStore.getState().sessions[sessionId];
    
    // 检查session是否存在且已连接
    if (!session || session.status !== 'connected') {
      console.log(`AutoSendService: Session ${sessionId} not connected, skipping auto-send`);
      return;
    }

    // 检查是否启用了自动发送
    if (!session.autoSendEnabled) {
      console.log(`AutoSendService: Auto-send disabled for session ${sessionId}, stopping timer`);
      this.stopAutoSend(sessionId);
      return;
    }

    // 检查是否有数据要发送
    const sendData = session.sendData;
    if (!sendData || !sendData.trim()) {
      console.log(`AutoSendService: No data to send for session ${sessionId}`);
      return;
    }

    const sendFormat = session.sendFormat || 'ascii';

    // 验证数据格式
    if (!validateFormat[sendFormat](sendData)) {
      console.warn(`AutoSendService: Invalid ${sendFormat} format for session ${sessionId}`);
      return;
    }

    try {
      // 转换数据格式
      const dataBytes = formatData.from[sendFormat](sendData);

      // 根据连接类型发送数据
      const config = session.config;
      let success = false;

      if (config.connectionType === 'server') {
        // 服务端模式：根据broadcastMode和selectedClientId决定发送目标
        const broadcastMode = session.broadcastMode || false;
        const selectedClientId = session.selectedClientId;

        if (broadcastMode) {
          // 广播到所有客户端
          console.log(`AutoSendService: Broadcasting message for session ${sessionId}`);
          success = await networkService.broadcastMessage(sessionId, dataBytes);
        } else if (selectedClientId) {
          // 发送到指定客户端
          console.log(`AutoSendService: Sending message to client ${selectedClientId} for session ${sessionId}`);
          success = await networkService.sendToClient(sessionId, selectedClientId, dataBytes);
        } else {
          // 没有选择目标，跳过发送
          console.log(`AutoSendService: No target selected for server session ${sessionId}, skipping auto-send`);
          return;
        }
      } else {
        // 客户端模式：直接发送
        success = await networkService.sendMessage(sessionId, dataBytes);
      }

      if (success) {
        console.log(`AutoSendService: Successfully auto-sent message for session ${sessionId}`);
        
        // 更新统计信息
        const currentSession = useAppStore.getState().sessions[sessionId];
        if (currentSession) {
          const autoSentMessages = (currentSession.statistics.autoSentMessages || 0) + 1;
          useAppStore.getState().updateStatistics(sessionId, {
            autoSentMessages
          });
        }
      } else {
        console.error(`AutoSendService: Failed to auto-send message for session ${sessionId}`);
        
        // 更新错误统计
        const currentSession = useAppStore.getState().sessions[sessionId];
        if (currentSession) {
          const autoSendErrors = (currentSession.statistics.autoSendErrors || 0) + 1;
          useAppStore.getState().updateStatistics(sessionId, {
            autoSendErrors
          });
        }
      }
    } catch (error) {
      console.error(`AutoSendService: Error during auto-send for session ${sessionId}:`, error);
      
      // 更新错误统计
      const currentSession = useAppStore.getState().sessions[sessionId];
      if (currentSession) {
        const autoSendErrors = (currentSession.statistics.autoSendErrors || 0) + 1;
        useAppStore.getState().updateStatistics(sessionId, {
          autoSendErrors
        });
      }
    }
  }

  /**
   * 清理所有定时器
   */
  cleanup() {
    console.log('AutoSendService: Cleaning up all timers');
    this.timers.forEach((timer, sessionId) => {
      clearInterval(timer);
      console.log(`AutoSendService: Cleared timer for session ${sessionId}`);
    });
    this.timers.clear();
    this.isInitialized = false;
  }

  /**
   * 获取当前运行的自动发送session数量
   */
  getActiveCount(): number {
    return this.timers.size;
  }

  /**
   * 检查指定session是否正在自动发送
   */
  isAutoSending(sessionId: string): boolean {
    return this.timers.has(sessionId);
  }
}

// 导出单例
export const autoSendService = new AutoSendService();

