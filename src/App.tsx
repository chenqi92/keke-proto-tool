import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import './styles/globals.css'

// Layout
import { MainLayout } from '@/components/Layout/MainLayout'

// Pages
import { ConnectionPage } from '@/pages/ConnectionPage'
import { SessionPage } from '@/pages/SessionPage'
import { ToolboxPage } from '@/pages/ToolboxPage'
import { LogsPage } from '@/pages/LogsPage'
import { PlaybackPage } from '@/pages/PlaybackPage'
import { PluginsPage } from '@/pages/PluginsPage'
import { SettingsPage } from '@/pages/SettingsPage'

// Components
import { WelcomeDialog } from '@/components/WelcomeDialog'

function App() {
  const [currentPage, setCurrentPage] = useState('sessions') // 默认显示连接页面
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    // 获取应用版本信息
    invoke('get_app_version')
      .then((version: unknown) => console.log('App version:', version))
      .catch((error: unknown) =>
        console.error('Failed to get app version:', error)
      )

    // 检查是否是首次启动
    const hasSeenWelcome = localStorage.getItem('prototool-welcome-completed')
    if (!hasSeenWelcome) {
      setShowWelcome(true)
    }
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'sessions':
        return <ConnectionPage />
      case 'toolbox':
        return <ToolboxPage />
      case 'logs':
        return <LogsPage />
      case 'playback':
        return <PlaybackPage />
      case 'plugins':
        return <PluginsPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <ConnectionPage />
    }
  }

  const handleWelcomeComplete = () => {
    setShowWelcome(false)
    // 引导完成后可以跳转到特定页面或保持当前页面
  }

  return (
    <>
      <MainLayout
        activeView={currentPage}
        onViewChange={setCurrentPage}
      >
        {renderPage()}
      </MainLayout>

      <WelcomeDialog
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
        onComplete={handleWelcomeComplete}
      />
    </>
  )
}

export default App
