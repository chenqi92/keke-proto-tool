import { useEffect, useState } from 'react'
import React from 'react'
import { invoke } from '@tauri-apps/api/core'
import './styles/globals.css'

// Layout
import { MainLayout } from '@/components/Layout/MainLayout'

// Pages
import { SessionPage } from '@/pages/SessionPage'
import { PlaybackPage } from '@/pages/PlaybackPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AboutPage } from '@/pages/AboutPage'
import { UserGuidePage } from '@/pages/UserGuidePage'

// Layout Components
import { MainContent } from '@/components/Layout/MainContent'

// Components
import { WelcomeDialog } from '@/components/WelcomeDialog'
import { Modal } from '@/components/Modal'
import { NewSessionModal, SessionData } from '@/components/NewSessionModal'
import { UpdateNotification } from '@/components/UpdateNotification'
import { MenuUpdateNotification } from '@/components/MenuUpdateNotification'
import { UpdateModal } from '@/components/UpdateModal'
import { ProtocolEditorModal } from '@/components/ProtocolEditorModal'

// Context
import { SessionProvider } from '@/contexts/SessionContext'
import { useAppStore } from '@/stores/AppStore'

// Services
import { statusBarService } from '@/services/StatusBarService'
import { backendLogService } from '@/services/BackendLogService'

// Hooks
import { useTheme } from '@/hooks/useTheme'
import { useNativeMenu } from '@/hooks/useNativeMenu'
import { useUpdateCheck } from '@/hooks/useUpdateCheck'





// Services
import { toolboxService } from '@/services/ToolboxService'
import { performanceMonitor } from '@/services/PerformanceMonitor'
import { keyboardShortcutManager } from '@/services/KeyboardShortcutManager'
import { initializeLazyLoading } from '@/services/ToolLazyLoader'
import { initializeTools } from '@/tools'
import { versionUpdateService } from '@/services/VersionUpdateService'

// Components
import { ShortcutHelp, useShortcutHelp } from '@/components/ShortcutHelp'



function App() {
  const [showWelcome, setShowWelcome] = useState(false)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showMenuUpdateNotification, setShowMenuUpdateNotification] = useState(false)
  const createSession = useAppStore(state => state.createSession)
  const shortcutHelp = useShortcutHelp()

  // Initialize update check hook
  const updateCheck = useUpdateCheck()

  // Initialize theme system at app level
  useTheme()

  // Initialize status bar service
  useEffect(() => {
    // Status bar service is automatically initialized as a singleton
    // No explicit initialization needed, but we can add cleanup on unmount
    return () => {
      // Cleanup will be handled by the service itself
    }
  }, [])

  // Modal handling functions (defined before useNativeMenu)
  const openModal = (modalType: string) => {
    setActiveModal(modalType)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  // Handle menu-triggered update check
  const handleMenuUpdateCheck = async () => {
    setShowMenuUpdateNotification(true)
    await updateCheck.checkForUpdates()
  }

  // Initialize native menu handling
  useNativeMenu({
    onOpenModal: openModal,
    onCheckUpdates: handleMenuUpdateCheck
  })

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize backend logging service first
        await backendLogService.addLog(
          'info',
          'Application',
          'ProtoTool application starting up',
          undefined,
          undefined,
          {
            category: 'system',
            details: {
              version: '0.0.12',
              timestamp: new Date().toISOString(),
              platform: navigator.platform
            }
          }
        ).catch(err => console.error('Failed to log application startup:', err));

        // Start performance monitoring
        performanceMonitor.start()

        // Initialize tools first
        await initializeTools()

        // Skip lazy loading for now to avoid conflicts
        // await initializeLazyLoading()

        // Initialize toolbox service
        await toolboxService.initialize()

        // Initialize keyboard shortcuts
        keyboardShortcutManager.setEnabled(true)

        // Initialize version update service
        versionUpdateService.startAutomaticChecking()

        setIsInitialized(true)
        console.log('App initialized successfully')
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }

    // 获取应用版本信息 - 跳过测试环境
    if (typeof window !== 'undefined' && !(window as any).__VITEST__) {
      invoke('get_app_version')
        .then((version: unknown) => console.log('App version:', version))
        .catch((error: unknown) =>
          console.error('Failed to get app version:', error)
        )
    }

    // 检查是否是首次启动
    const hasSeenWelcome = localStorage.getItem('prototool-welcome-completed')
    if (!hasSeenWelcome) {
      setShowWelcome(true)
    }

    // Initialize app
    initializeApp()
  }, [])

  const handleWelcomeComplete = () => {
    setShowWelcome(false)
  }

  const handleNewSession = (sessionData: SessionData) => {
    console.log('Creating new session:', sessionData)

    // Create session config from session data
    const sessionConfig = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: sessionData.name,
      protocol: sessionData.protocol,
      connectionType: sessionData.connectionType,
      host: sessionData.host,
      port: sessionData.port,
      autoReconnect: sessionData.autoReconnect || false,
      keepAlive: sessionData.keepAlive || true,
      timeout: sessionData.timeout || 10000, // 10 seconds default
      retryAttempts: sessionData.retryAttempts || 3,
      // Protocol-specific properties
      ...(sessionData.protocol === 'WebSocket' && { websocketSubprotocol: sessionData.websocketSubprotocol }),
      ...(sessionData.protocol === 'MQTT' && { mqttTopic: sessionData.mqttTopic }),
      ...(sessionData.protocol === 'SSE' && { sseEventTypes: sessionData.sseEventTypes })
    }

    // Create the session in the store
    createSession(sessionConfig)
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
      case 'settings':
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="设置"
            size="lg"
            fixedHeight={true}
          >
            <SettingsPage />
          </Modal>
        )
      case 'about':
        return <AboutPage onClose={closeModal} />
      case 'settings-about':
        return <AboutPage onClose={closeModal} />
      case 'user-guide':
        return <UserGuidePage onClose={closeModal} />
      case 'update-modal':
        return (
          <UpdateModal
            isOpen={true}
            onClose={closeModal}
            updateInfo={updateCheck.updateInfo}
          />
        )
      case 'edit-protocol':
        return (
          <ProtocolEditorModal
            isOpen={true}
            onClose={closeModal}
          />
        )
      default:
        return null
    }
  }

  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">正在初始化应用...</p>
        </div>
      </div>
    )
  }

  return (
    <SessionProvider>
      <MainLayout onOpenModal={openModal}>
        <MainContent />
      </MainLayout>

      <WelcomeDialog
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
        onComplete={handleWelcomeComplete}
      />

      <ShortcutHelp
        isOpen={shortcutHelp.isOpen}
        onClose={shortcutHelp.close}
      />

      {activeModal && renderModal()}

      <UpdateNotification />

      <MenuUpdateNotification
        isVisible={showMenuUpdateNotification}
        isChecking={updateCheck.isChecking}
        updateInfo={updateCheck.updateInfo}
        error={updateCheck.error}
        onClose={() => setShowMenuUpdateNotification(false)}
        onOpenModal={() => openModal('update-modal')}
        onUpdateNow={() => {
          // TODO: Implement actual update process
          console.log('Update now clicked');
        }}
      />
    </SessionProvider>
  )
}

export default App
