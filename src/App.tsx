import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import './styles/globals.css'

// Layout
import { MainLayout } from '@/components/Layout/MainLayout'

// Pages
import { WorkbenchPage } from '@/pages/WorkbenchPage'
import { SessionPage } from '@/pages/SessionPage'
import { ToolboxPage } from '@/pages/ToolboxPage'
import { LogsPage } from '@/pages/LogsPage'
import { PlaybackPage } from '@/pages/PlaybackPage'
import { PluginsPage } from '@/pages/PluginsPage'
import { SettingsPage } from '@/pages/SettingsPage'

function App() {
  useEffect(() => {
    // 获取应用版本信息
    invoke('get_app_version')
      .then((version: unknown) => console.log('App version:', version))
      .catch((error: unknown) =>
        console.error('Failed to get app version:', error)
      )
  }, [])

  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<WorkbenchPage />} />
          <Route path="/workbench" element={<WorkbenchPage />} />
          <Route path="/sessions" element={<SessionPage />} />
          <Route path="/toolbox" element={<ToolboxPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/playback" element={<PlaybackPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MainLayout>
    </Router>
  )
}

export default App
