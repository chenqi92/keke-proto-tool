import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import './styles/globals.css'

// Layout
import { MainLayout } from '@/components/Layout/MainLayout'

// Pages
import { SessionPage } from '@/pages/SessionPage'
import { ToolboxPage } from '@/pages/ToolboxPage'
import { LogsPage } from '@/pages/LogsPage'
import { PlaybackPage } from '@/pages/PlaybackPage'
import { PluginsPage } from '@/pages/PluginsPage'
import { SettingsPage } from '@/pages/SettingsPage'

// Components
import { WelcomeDialog } from '@/components/WelcomeDialog'
import { Modal } from '@/components/Modal'
import { NewSessionModal, SessionData } from '@/components/NewSessionModal'

// Context
import { SessionProvider } from '@/contexts/SessionContext'

function App() {
  const [showWelcome, setShowWelcome] = useState(false)
  const [activeModal, setActiveModal] = useState<string | null>(null)

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

  const handleWelcomeComplete = () => {
    setShowWelcome(false)
  }

  const openModal = (modalType: string) => {
    setActiveModal(modalType)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  const handleNewSession = (sessionData: SessionData) => {
    console.log('Creating new session:', sessionData)
    // TODO: 实际创建会话的逻辑
    closeModal()
  }

  const renderModal = () => {
    switch (activeModal) {
      case 'new-session':
        return (
          <NewSessionModal
            isOpen={true}
            onClose={closeModal}
            onConfirm={handleNewSession}
          />
        )
      case 'toolbox':
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="工具箱"
            size="xl"
          >
            <ToolboxPage />
          </Modal>
        )
      case 'logs':
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="日志管理"
            size="xl"
          >
            <LogsPage />
          </Modal>
        )
      case 'playback':
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="会话回放"
            size="xl"
          >
            <PlaybackPage />
          </Modal>
        )
      case 'plugins':
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="插件管理"
            size="xl"
          >
            <PluginsPage />
          </Modal>
        )
      case 'settings':
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="设置"
            size="lg"
          >
            <SettingsPage />
          </Modal>
        )
      default:
        return null
    }
  }

  return (
    <SessionProvider>
      <MainLayout onOpenModal={openModal}>
        <SessionPage />
      </MainLayout>

      <WelcomeDialog
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
        onComplete={handleWelcomeComplete}
      />

      {activeModal && renderModal()}
    </SessionProvider>
  )
}

export default App
