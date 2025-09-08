import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import './styles/globals.css'

// 页面组件（暂时使用占位符）
const Dashboard = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-foreground">ProtoTool Dashboard</h1>
    <p className="mt-4 text-muted-foreground">
      欢迎使用 ProtoTool - 跨平台网络报文工作站
    </p>
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="font-semibold">连接管理</h3>
        <p className="text-sm text-muted-foreground mt-2">
          管理 TCP/UDP/串口连接
        </p>
      </div>
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="font-semibold">报文解析</h3>
        <p className="text-sm text-muted-foreground mt-2">实时解析网络报文</p>
      </div>
      <div className="p-4 border rounded-lg bg-card">
        <h3 className="font-semibold">插件系统</h3>
        <p className="text-sm text-muted-foreground mt-2">扩展功能和协议支持</p>
      </div>
    </div>
  </div>
)

const Connections = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">连接管理</h1>
    <p className="text-muted-foreground mt-2">管理网络连接和串口连接</p>
  </div>
)

const Packets = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">报文查看</h1>
    <p className="text-muted-foreground mt-2">查看和分析网络报文</p>
  </div>
)

const Protocols = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">协议管理</h1>
    <p className="text-muted-foreground mt-2">管理协议解析规则</p>
  </div>
)

const Plugins = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">插件管理</h1>
    <p className="text-muted-foreground mt-2">管理和配置插件</p>
  </div>
)

const Settings = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold">设置</h1>
    <p className="text-muted-foreground mt-2">应用程序设置和配置</p>
  </div>
)

// 导航组件
const Navigation = () => {
  const [activeRoute, setActiveRoute] = useState('/')

  const navItems = [
    { path: '/', label: '仪表板', icon: '📊' },
    { path: '/connections', label: '连接', icon: '🔗' },
    { path: '/packets', label: '报文', icon: '📦' },
    { path: '/protocols', label: '协议', icon: '📋' },
    { path: '/plugins', label: '插件', icon: '🔌' },
    { path: '/settings', label: '设置', icon: '⚙️' },
  ]

  return (
    <nav className="w-64 bg-card border-r border-border h-screen p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground">ProtoTool</h2>
        <p className="text-sm text-muted-foreground">v0.1.0</p>
      </div>
      <ul className="space-y-2">
        {navItems.map(item => (
          <li key={item.path}>
            <a
              href={item.path}
              onClick={e => {
                e.preventDefault()
                setActiveRoute(item.path)
                window.history.pushState({}, '', item.path)
              }}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                activeRoute === item.path
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

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
      <div className="flex h-screen bg-background text-foreground">
        <Navigation />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/packets" element={<Packets />} />
            <Route path="/protocols" element={<Protocols />} />
            <Route path="/plugins" element={<Plugins />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
