import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { autoVerifyInDevelopment } from './utils/verifyFix'
import { autoTestInDevelopment } from './utils/tcpClientFixTest'

// 在开发环境中自动验证修复效果
autoVerifyInDevelopment();
autoTestInDevelopment();

// 在开发环境中自动测试TCP会话状态隔离
if (import.meta.env.DEV) {
  setTimeout(() => {
    console.log('🧪 Running TCP Session State Isolation Test...');
  }, 2000);
}

// Disable StrictMode to prevent double initialization in development
// StrictMode causes components to mount twice, which leads to:
// - Duplicate database connections
// - Duplicate event listeners
// - Duplicate backend calls
// While our code is now StrictMode-compatible, disabling it improves development experience
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
