import { useEffect, useState, useCallback } from 'react'
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
import { ReleaseNotesPage } from '@/pages/ReleaseNotesPage'
import { ReportIssuePage } from '@/pages/ReportIssuePage'
import { LogsPage } from '@/pages/LogsPage'
import { PluginsPage } from '@/pages/PluginsPage'
import { StoragePage } from '@/pages/StoragePage'

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
import { ProtoShellModal } from '@/components/ProtoShell'
import { ToolboxInterface } from '@/components/Toolbox/ToolboxInterface'
import { useToast, useConfirmDialog } from '@/components/Common'

// Context
import { SessionProvider } from '@/contexts/SessionContext'
import { useAppStore } from '@/stores/AppStore'

// Services
import { statusBarService } from '@/services/StatusBarService'
import { backendLogService } from '@/services/BackendLogService'
import { notificationService } from '@/services/NotificationService'

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

// Internal component that uses SessionContext
function AppWithSession({
  openModal,
  handleMenuUpdateCheck
}: {
  openModal: (modalType: string) => void;
  handleMenuUpdateCheck: () => Promise<void>;
}) {
  // Initialize native menu handling (needs SessionContext)
  useNativeMenu({
    onOpenModal: openModal,
    onCheckUpdates: handleMenuUpdateCheck
  })

  return null
}

function App() {
  const [showWelcome, setShowWelcome] = useState(false)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showMenuUpdateNotification, setShowMenuUpdateNotification] = useState(false)
  const [logsModalParams, setLogsModalParams] = useState<{ sessionId?: string; sessionName?: string } | null>(null)
  const createSession = useAppStore(state => state.createSession)
  const shortcutHelp = useShortcutHelp()

  // Initialize update check hook
  const updateCheck = useUpdateCheck()

  // Initialize theme system at app level
  useTheme()

  // Initialize global toast and confirm dialog
  const toast = useToast()
  const confirmDialog = useConfirmDialog()

  // Register global notification service
  useEffect(() => {
    notificationService.registerToast(toast.addToast)
    notificationService.registerConfirm(confirmDialog.confirm)
  }, [toast.addToast, confirmDialog.confirm])

  // Initialize status bar service
  useEffect(() => {
    // Status bar service is automatically initialized as a singleton
    // No explicit initialization needed, but we can add cleanup on unmount
    return () => {
      // Cleanup will be handled by the service itself
    }
  }, [])

  // Initialize zoom level from store
  useEffect(() => {
    const zoomLevel = useAppStore.getState().zoomLevel;
    document.documentElement.style.fontSize = `${zoomLevel}%`;
    console.log('[App] Initialized zoom level:', zoomLevel);
  }, [])

  // Initialize menu states from store and localStorage
  useEffect(() => {
    const initMenuStates = async () => {
      try {
        // 等待一小段时间确保菜单已经完全创建
        await new Promise(resolve => setTimeout(resolve, 100));

        // 获取当前状态
        const { showSidebar, showInspector, showStatusBar } = useAppStore.getState();
        const theme = localStorage.getItem('keke-proto-tool-theme') || 'system';
        const colorTheme = localStorage.getItem('keke-proto-tool-color-theme') || 'default';

        console.log('[App] Initializing menu states:', { theme, colorTheme, showSidebar, showInspector, showStatusBar });

        // 更新菜单状态
        await invoke('update_theme_menu_state', { theme });
        await invoke('update_color_theme_menu_state', { color: colorTheme });
        await invoke('update_sidebar_menu_state', { visible: showSidebar });
        await invoke('update_inspector_menu_state', { visible: showInspector });
        await invoke('update_statusbar_menu_state', { visible: showStatusBar });

        console.log('[App] Menu states initialized successfully');
      } catch (error) {
        console.error('[App] Failed to initialize menu states:', error);
      }
    };

    initMenuStates();
  }, [])

  // Modal handling functions (defined before useNativeMenu)
  const openModal = useCallback((modalType: string) => {
    console.log('[App] openModal called with:', modalType)
    // Handle keyboard shortcuts modal specially since it uses useShortcutHelp
    if (modalType === 'keyboard-shortcuts') {
      console.log('[App] Opening keyboard shortcuts via shortcutHelp.open()')
      shortcutHelp.open()
    } else {
      console.log('[App] Setting activeModal to:', modalType)
      setActiveModal(modalType)
    }
  }, [shortcutHelp])

  const closeModal = () => {
    setActiveModal(null)
    setLogsModalParams(null)
  }

  // Handle menu-triggered update check
  const handleMenuUpdateCheck = useCallback(async () => {
    console.log('[App] handleMenuUpdateCheck called')
    setShowMenuUpdateNotification(true)
    await updateCheck.checkForUpdates()
  }, [updateCheck])

  // Listen for open-logs-modal event
  useEffect(() => {
    const handleOpenLogsModal = (event: CustomEvent) => {
      const { sessionId, sessionName } = event.detail;
      setLogsModalParams({ sessionId, sessionName });
      setActiveModal('logs');
    };

    window.addEventListener('open-logs-modal', handleOpenLogsModal as EventListener);

    return () => {
      window.removeEventListener('open-logs-modal', handleOpenLogsModal as EventListener);
    };
  }, []);

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
      case 'release-notes':
        return <ReleaseNotesPage onClose={closeModal} />
      case 'report-issue':
        return <ReportIssuePage onClose={closeModal} />
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
      case 'proto-shell':
        return (
          <ProtoShellModal
            isOpen={true}
            onClose={closeModal}
          />
        )
      case 'toolbox':
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="工具箱"
            size="xl"
            fixedHeight={true}
          >
            <ToolboxInterface
              mode="page"
              onToolExecute={(toolId, result) => {
                console.log('Tool executed:', toolId, result);
              }}
              className="h-full"
            />
          </Modal>
        )
      case 'logs':
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="日志管理"
            size="xl"
            fixedHeight={true}
          >
            <LogsPage
              initialSessionId={logsModalParams?.sessionId}
              initialSessionName={logsModalParams?.sessionName}
            />
          </Modal>
        )
      case 'plugins':
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="协议仓库"
            size="xl"
            fixedHeight={true}
          >
            <PluginsPage />
          </Modal>
        )
      case 'storage':
        return (
          <Modal
            isOpen={true}
            onClose={closeModal}
            title="储存方式"
            size="xl"
            fixedHeight={true}
          >
            <StoragePage />
          </Modal>
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
      {/* Initialize hooks that need SessionContext */}
      <AppWithSession
        openModal={openModal}
        handleMenuUpdateCheck={handleMenuUpdateCheck}
      />

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

      {/* Global Toast Container */}
      <toast.ToastContainer />

      {/* Global Confirm Dialog */}
      <confirmDialog.ConfirmDialog />
    </SessionProvider>
  )
}

export default App
