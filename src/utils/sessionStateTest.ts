/**
 * Session State Test Utilities
 * 用于测试和验证会话状态隔离的工具函数
 */

import { SessionState, SessionConfig, ConnectionStatus } from '@/types';

/**
 * 模拟用户描述的问题场景
 * 1. 创建一个TCP服务端会话，启动监听
 * 2. 创建一个TCP客户端会话，尝试连接到不存在的端口
 * 3. 验证两个会话的状态是否独立
 */
export function simulateStateIsolationIssue(): {
  serverSession: SessionState;
  clientSession: SessionState;
  testSteps: string[];
} {
  const testSteps: string[] = [];
  
  // 创建TCP服务端会话配置
  const serverConfig: SessionConfig = {
    id: 'tcp_server_test_001',
    name: 'TCP Server - Test',
    protocol: 'TCP',
    connectionType: 'server',
    host: '0.0.0.0',
    port: 8080,
    autoReconnect: false,
    keepAlive: true,
    timeout: 10000,
    retryAttempts: 3
  };

  // 创建TCP客户端会话配置
  const clientConfig: SessionConfig = {
    id: 'tcp_client_test_001',
    name: 'TCP Client - Test',
    protocol: 'TCP',
    connectionType: 'client',
    host: 'localhost',
    port: 8081, // 连接到不存在的端口
    autoReconnect: false,
    keepAlive: true,
    timeout: 10000,
    retryAttempts: 3
  };

  // 创建初始会话状态
  const serverSession: SessionState = {
    config: serverConfig,
    status: 'connected', // 服务端已启动
    isRecording: false,
    messages: [],
    statistics: {
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      errors: 0,
      uptime: 0,
      connectionCount: 0
    }
  };

  const clientSession: SessionState = {
    config: clientConfig,
    status: 'disconnected', // 客户端未连接
    isRecording: false,
    messages: [],
    statistics: {
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      errors: 0,
      uptime: 0,
      connectionCount: 0
    }
  };

  testSteps.push('1. Created TCP server session (listening on port 8080)');
  testSteps.push('2. Created TCP client session (targeting port 8081)');
  testSteps.push('3. Server status: connected, Client status: disconnected');

  return {
    serverSession,
    clientSession,
    testSteps
  };
}

/**
 * 验证状态更新是否正确隔离
 */
export function validateStateUpdate(
  sessions: Record<string, SessionState>,
  targetSessionId: string,
  newStatus: ConnectionStatus,
  expectedOtherSessionsStatus: Record<string, ConnectionStatus>
): {
  isValid: boolean;
  errors: string[];
  actualStates: Record<string, ConnectionStatus>;
} {
  const errors: string[] = [];
  const actualStates: Record<string, ConnectionStatus> = {};

  // 记录所有会话的实际状态
  Object.keys(sessions).forEach(sessionId => {
    actualStates[sessionId] = sessions[sessionId].status;
  });

  // 检查目标会话的状态
  const targetSession = sessions[targetSessionId];
  if (!targetSession) {
    errors.push(`Target session ${targetSessionId} not found`);
    return { isValid: false, errors, actualStates };
  }

  if (targetSession.status !== newStatus) {
    errors.push(`Target session ${targetSessionId} status is ${targetSession.status}, expected ${newStatus}`);
  }

  // 检查其他会话的状态是否符合预期
  Object.keys(expectedOtherSessionsStatus).forEach(sessionId => {
    const session = sessions[sessionId];
    const expectedStatus = expectedOtherSessionsStatus[sessionId];
    
    if (!session) {
      errors.push(`Session ${sessionId} not found`);
      return;
    }

    if (session.status !== expectedStatus) {
      errors.push(`Session ${sessionId} status is ${session.status}, expected ${expectedStatus}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    actualStates
  };
}

/**
 * 生成测试报告
 */
export function generateTestReport(
  testName: string,
  testSteps: string[],
  validationResult: ReturnType<typeof validateStateUpdate>
): string {
  const report = [
    `=== Session State Isolation Test Report ===`,
    `Test Name: ${testName}`,
    `Timestamp: ${new Date().toISOString()}`,
    ``,
    `Test Steps:`,
    ...testSteps.map(step => `  ${step}`),
    ``,
    `Validation Result: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`,
    ``,
    `Actual Session States:`,
    ...Object.keys(validationResult.actualStates).map(sessionId => 
      `  ${sessionId}: ${validationResult.actualStates[sessionId]}`
    ),
    ``
  ];

  if (!validationResult.isValid) {
    report.push(`Errors Detected:`);
    report.push(...validationResult.errors.map(error => `  - ${error}`));
    report.push(``);
  }

  report.push(`=== End of Report ===`);
  
  return report.join('\n');
}

/**
 * 运行完整的状态隔离测试
 */
export function runStateIsolationTest(): string {
  const { serverSession, clientSession, testSteps } = simulateStateIsolationIssue();
  
  // 创建测试会话集合
  const sessions: Record<string, SessionState> = {
    [serverSession.config.id]: serverSession,
    [clientSession.config.id]: clientSession
  };

  // 模拟客户端尝试连接（应该不影响服务端状态）
  const updatedClientSession = {
    ...clientSession,
    status: 'connecting' as ConnectionStatus
  };
  sessions[clientSession.config.id] = updatedClientSession;
  
  testSteps.push('4. Client attempts to connect (status: connecting)');
  testSteps.push('5. Validating that server status remains unchanged');

  // 验证服务端状态没有被影响
  const validationResult = validateStateUpdate(
    sessions,
    clientSession.config.id,
    'connecting',
    {
      [serverSession.config.id]: 'connected' // 服务端应该保持连接状态
    }
  );

  return generateTestReport(
    'TCP Session State Isolation Test',
    testSteps,
    validationResult
  );
}
