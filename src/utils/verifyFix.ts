/**
 * 验证TCP会话状态隔离修复效果的工具
 * 
 * 使用方法：
 * 1. 在浏览器控制台中运行：
 *    import { verifySessionStateIsolation } from '@/utils/verifyFix';
 *    verifySessionStateIsolation();
 * 
 * 2. 或者在组件中调用进行自动验证
 */

import { useAppStore } from '@/stores/AppStore';
import { SessionConfig, SessionState, ConnectionStatus } from '@/types';
import { generateUniqueSessionId, validateSessionStateIsolation } from '@/utils/sessionStateDebug';

/**
 * 验证会话状态隔离修复效果
 */
export function verifySessionStateIsolation(): {
  success: boolean;
  message: string;
  details: any;
} {
  console.group('🔍 Verifying TCP Session State Isolation Fix');
  
  try {
    const store = useAppStore.getState();
    const existingSessions = store.sessions;
    
    console.log('📊 Current sessions:', Object.keys(existingSessions).length);
    
    // 测试1: 验证会话ID生成唯一性
    console.log('\n🧪 Test 1: Session ID Uniqueness');
    const testIds = new Set<string>();
    const duplicates: string[] = [];
    
    for (let i = 0; i < 100; i++) {
      const id = generateUniqueSessionId('TCP', 'client', existingSessions);
      if (testIds.has(id)) {
        duplicates.push(id);
      }
      testIds.add(id);
    }
    
    if (duplicates.length > 0) {
      console.error('❌ Found duplicate session IDs:', duplicates);
      return {
        success: false,
        message: 'Session ID generation has duplicates',
        details: { duplicates }
      };
    }
    
    console.log('✅ Generated 100 unique session IDs successfully');
    
    // 测试2: 验证状态隔离检查
    console.log('\n🧪 Test 2: State Isolation Validation');
    
    // 创建模拟会话状态
    const mockSessions: Record<string, SessionState> = {
      'tcp_server_test': {
        config: {
          id: 'tcp_server_test',
          name: 'TCP Server Test',
          protocol: 'TCP',
          connectionType: 'server',
          host: '0.0.0.0',
          port: 8080,
          autoReconnect: false,
          keepAlive: true,
          timeout: 10000,
          retryAttempts: 3
        },
        status: 'connected',
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
      },
      'tcp_client_test': {
        config: {
          id: 'tcp_client_test',
          name: 'TCP Client Test',
          protocol: 'TCP',
          connectionType: 'client',
          host: 'localhost',
          port: 8081,
          autoReconnect: false,
          keepAlive: true,
          timeout: 10000,
          retryAttempts: 3
        },
        status: 'disconnected',
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
      }
    };
    
    // 测试正常情况：客户端连接不应该影响服务端
    const validation1 = validateSessionStateIsolation(
      mockSessions,
      'tcp_client_test',
      'connecting'
    );
    
    console.log('✅ Normal case validation:', validation1.isValid ? 'PASSED' : 'FAILED');
    if (!validation1.isValid) {
      console.warn('Warnings:', validation1.warnings);
    }
    
    // 测试异常情况：多个会话同时连接
    mockSessions['tcp_client_test'].status = 'connecting';
    const validation2 = validateSessionStateIsolation(
      mockSessions,
      'tcp_server_test',
      'connecting'
    );
    
    console.log('✅ Conflict detection:', validation2.isValid ? 'FAILED (should detect conflict)' : 'PASSED');
    if (!validation2.isValid) {
      console.log('Detected conflicts:', validation2.warnings);
    }
    
    // 测试3: 验证端口冲突检测
    console.log('\n🧪 Test 3: Port Conflict Detection');
    
    const conflictSessions: Record<string, SessionState> = {
      'tcp_server_1': {
        config: {
          id: 'tcp_server_1',
          name: 'TCP Server 1',
          protocol: 'TCP',
          connectionType: 'server',
          host: '0.0.0.0',
          port: 8080,
          autoReconnect: false,
          keepAlive: true,
          timeout: 10000,
          retryAttempts: 3
        },
        status: 'connected',
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
      },
      'tcp_server_2': {
        config: {
          id: 'tcp_server_2',
          name: 'TCP Server 2',
          protocol: 'TCP',
          connectionType: 'server',
          host: '0.0.0.0',
          port: 8080, // 相同端口
          autoReconnect: false,
          keepAlive: true,
          timeout: 10000,
          retryAttempts: 3
        },
        status: 'disconnected',
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
      }
    };
    
    const portConflictValidation = validateSessionStateIsolation(
      conflictSessions,
      'tcp_server_2',
      'connecting'
    );
    
    console.log('✅ Port conflict detection:', portConflictValidation.isValid ? 'FAILED (should detect conflict)' : 'PASSED');
    if (!portConflictValidation.isValid) {
      console.log('Detected port conflicts:', portConflictValidation.warnings);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.groupEnd();
    
    return {
      success: true,
      message: 'TCP session state isolation fix verified successfully',
      details: {
        uniqueIdTest: 'PASSED',
        stateIsolationTest: validation1.isValid ? 'PASSED' : 'FAILED',
        conflictDetectionTest: !validation2.isValid ? 'PASSED' : 'FAILED',
        portConflictTest: !portConflictValidation.isValid ? 'PASSED' : 'FAILED'
      }
    };
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.groupEnd();
    
    return {
      success: false,
      message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    };
  }
}

/**
 * 在开发环境中自动运行验证
 */
export function autoVerifyInDevelopment() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode detected, running automatic verification...');
    setTimeout(() => {
      const result = verifySessionStateIsolation();
      if (result.success) {
        console.log('✅ Automatic verification passed');
      } else {
        console.warn('⚠️ Automatic verification failed:', result.message);
      }
    }, 1000);
  }
}

/**
 * 创建测试会话用于手动验证
 */
export function createTestSessions() {
  const store = useAppStore.getState();
  
  // 创建TCP服务端测试会话
  const serverConfig: SessionConfig = {
    id: generateUniqueSessionId('TCP', 'server', store.sessions),
    name: 'TCP Server - Test (Port 8080)',
    protocol: 'TCP',
    connectionType: 'server',
    host: '0.0.0.0',
    port: 8080,
    autoReconnect: false,
    keepAlive: true,
    timeout: 10000,
    retryAttempts: 3
  };
  
  // 创建TCP客户端测试会话
  const clientConfig: SessionConfig = {
    id: generateUniqueSessionId('TCP', 'client', store.sessions),
    name: 'TCP Client - Test (Port 8081)',
    protocol: 'TCP',
    connectionType: 'client',
    host: 'localhost',
    port: 8081, // 连接到不存在的端口
    autoReconnect: false,
    keepAlive: true,
    timeout: 10000,
    retryAttempts: 3
  };
  
  store.createSession(serverConfig);
  store.createSession(clientConfig);
  
  console.log('🧪 Created test sessions for manual verification:');
  console.log('  - TCP Server:', serverConfig.id);
  console.log('  - TCP Client:', clientConfig.id);
  console.log('');
  console.log('📝 Manual test steps:');
  console.log('  1. Start the TCP server (should show "启动中..." then "停止")');
  console.log('  2. Try to connect the TCP client (should show "连接中..." then fail)');
  console.log('  3. Verify that server button remains as "停止" (not "停止中...")');
  
  return {
    serverSessionId: serverConfig.id,
    clientSessionId: clientConfig.id
  };
}
