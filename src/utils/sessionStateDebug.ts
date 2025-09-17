/**
 * Session State Debug Utilities
 * 用于调试和验证会话状态隔离的工具函数
 */

import { SessionState, ConnectionStatus } from '@/types';

export interface SessionStateSnapshot {
  sessionId: string;
  name: string;
  protocol: string;
  connectionType: string;
  host: string;
  port: number;
  status: ConnectionStatus;
  timestamp: number;
}

/**
 * 创建会话状态快照
 */
export function createSessionSnapshot(sessionId: string, session: SessionState): SessionStateSnapshot {
  return {
    sessionId,
    name: session.config.name,
    protocol: session.config.protocol,
    connectionType: session.config.connectionType,
    host: session.config.host,
    port: session.config.port,
    status: session.status,
    timestamp: Date.now()
  };
}

/**
 * 验证会话状态隔离
 * 检查是否有多个会话同时处于连接中状态（这通常是异常的）
 */
export function validateSessionStateIsolation(
  sessions: Record<string, SessionState>,
  targetSessionId: string,
  newStatus: ConnectionStatus
): {
  isValid: boolean;
  warnings: string[];
  conflictingSessions: string[];
} {
  const warnings: string[] = [];
  const conflictingSessions: string[] = [];
  
  // 如果目标会话要设置为连接中状态，检查是否有其他会话也在连接中
  if (newStatus === 'connecting') {
    Object.keys(sessions).forEach(sessionId => {
      if (sessionId !== targetSessionId) {
        const session = sessions[sessionId];
        if (session.status === 'connecting') {
          warnings.push(`Session ${sessionId} (${session.config.name}) is also in connecting state`);
          conflictingSessions.push(sessionId);
        }
      }
    });
  }
  
  // 检查是否有相同协议和端口的会话冲突
  const targetSession = sessions[targetSessionId];
  if (targetSession) {
    Object.keys(sessions).forEach(sessionId => {
      if (sessionId !== targetSessionId) {
        const session = sessions[sessionId];
        
        // 检查TCP服务端端口冲突
        if (
          targetSession.config.protocol === 'TCP' &&
          session.config.protocol === 'TCP' &&
          targetSession.config.connectionType === 'server' &&
          session.config.connectionType === 'server' &&
          targetSession.config.port === session.config.port &&
          targetSession.config.host === session.config.host &&
          session.status === 'connected' &&
          newStatus === 'connecting'
        ) {
          warnings.push(`TCP Server port conflict: Session ${sessionId} is already listening on ${session.config.host}:${session.config.port}`);
          conflictingSessions.push(sessionId);
        }
      }
    });
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    conflictingSessions
  };
}

/**
 * 记录会话状态变化
 */
export function logSessionStateChange(
  sessionId: string,
  oldStatus: ConnectionStatus,
  newStatus: ConnectionStatus,
  session: SessionState,
  allSessions: Record<string, SessionState>
) {
  console.group(`🔄 Session State Change: ${sessionId}`);
  
  console.log(`📊 Session Details:`, {
    id: sessionId,
    name: session.config.name,
    protocol: session.config.protocol,
    connectionType: session.config.connectionType,
    host: session.config.host,
    port: session.config.port,
    statusChange: `${oldStatus} → ${newStatus}`
  });
  
  // 验证状态隔离
  const validation = validateSessionStateIsolation(allSessions, sessionId, newStatus);
  if (!validation.isValid) {
    console.warn(`⚠️ State Isolation Issues Detected:`);
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  } else {
    console.log(`✅ State isolation validated - no conflicts detected`);
  }
  
  // 显示所有会话的当前状态
  console.log(`📋 All Sessions Status:`);
  Object.keys(allSessions).forEach(sid => {
    const s = allSessions[sid];
    const marker = sid === sessionId ? '👉' : '  ';
    console.log(`${marker} ${sid}: ${s.config.name} (${s.config.protocol} ${s.config.connectionType}) - ${s.status}`);
  });
  
  console.groupEnd();
}

/**
 * 检查会话ID唯一性
 */
export function validateSessionIdUniqueness(
  sessions: Record<string, SessionState>,
  newSessionId: string
): {
  isUnique: boolean;
  conflictingSession?: SessionState;
} {
  const existingSession = sessions[newSessionId];
  return {
    isUnique: !existingSession,
    conflictingSession: existingSession
  };
}

/**
 * 生成强唯一会话ID
 */
export function generateUniqueSessionId(
  protocol: string,
  connectionType: string,
  existingSessions: Record<string, SessionState>
): string {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const counter = Math.floor(Math.random() * 10000);
    const sessionId = `${protocol.toLowerCase()}_${connectionType}_${timestamp}_${random}_${counter}`;
    
    const validation = validateSessionIdUniqueness(existingSessions, sessionId);
    if (validation.isUnique) {
      console.log(`🆔 Generated unique session ID: ${sessionId} (attempt ${attempts + 1})`);
      return sessionId;
    }
    
    attempts++;
    console.warn(`⚠️ Session ID collision detected: ${sessionId} (attempt ${attempts})`);
  }
  
  // 如果所有尝试都失败了，使用UUID作为后备
  const fallbackId = `${protocol.toLowerCase()}_${connectionType}_${Date.now()}_${crypto.randomUUID()}`;
  console.warn(`⚠️ Using fallback UUID-based session ID: ${fallbackId}`);
  return fallbackId;
}
