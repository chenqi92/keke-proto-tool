import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { autoVerifyInDevelopment } from './utils/verifyFix'
import { autoTestInDevelopment } from './utils/tcpClientFixTest'
import { runTCPSessionStateIsolationTest, logManualTestInstructions } from './utils/tcpSessionStateIsolationTest'

// 在开发环境中自动验证修复效果
autoVerifyInDevelopment();
autoTestInDevelopment();

// 在开发环境中自动测试TCP会话状态隔离
if (import.meta.env.DEV) {
  setTimeout(() => {
    console.log('🧪 Running TCP Session State Isolation Test...');
    runTCPSessionStateIsolationTest();
    logManualTestInstructions();
  }, 2000);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
