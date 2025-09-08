import React, { useState } from 'react';
import { cn } from '@/utils';
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Network,
  Wrench,
  FileText,
  Play,
  Puzzle,
  CheckCircle,
  Download,
  Zap
} from 'lucide-react';

interface WelcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const welcomeSteps = [
  {
    id: 'welcome',
    title: '欢迎使用 ProtoTool',
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
          <Network className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">专业的网络协议分析工具</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          ProtoTool 是一款功能强大的跨平台网络协议分析工具，支持TCP/UDP连接管理、
          实时数据捕获、协议解析和可视化分析。
        </p>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-4 border border-border rounded-lg">
            <Zap className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold mb-1">实时分析</h3>
            <p className="text-sm text-muted-foreground">
              实时捕获和分析网络数据包
            </p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <Wrench className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold mb-1">丰富工具</h3>
            <p className="text-sm text-muted-foreground">
              内置多种协议分析和数据处理工具
            </p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <Puzzle className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold mb-1">插件扩展</h3>
            <p className="text-sm text-muted-foreground">
              支持插件系统，可扩展更多功能
            </p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <Play className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold mb-1">会话回放</h3>
            <p className="text-sm text-muted-foreground">
              录制和回放网络会话数据
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'features',
    title: '核心功能介绍',
    content: (
      <div className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Network className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">连接管理</h3>
            <p className="text-sm text-muted-foreground">
              支持TCP客户端/服务端、UDP客户端/服务端连接，提供连接状态监控和管理功能。
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-primary/20 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">协议解析</h3>
            <p className="text-sm text-muted-foreground">
              内置多种协议解析器，支持Modbus、HTTP等常见协议，可视化显示协议字段。
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Wrench className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">工具箱</h3>
            <p className="text-sm text-muted-foreground">
              提供报文生成器、CRC校验、时间戳转换、数据格式转换等实用工具。
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Play className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">会话回放</h3>
            <p className="text-sm text-muted-foreground">
              录制网络会话数据，支持时间轴回放、速度控制和数据导出功能。
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'quickstart',
    title: '快速开始',
    content: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">开始您的第一个会话</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
              1
            </div>
            <div>
              <h4 className="font-medium">创建网络连接</h4>
              <p className="text-sm text-muted-foreground">
                选择TCP或UDP连接类型，配置主机和端口
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <div>
              <h4 className="font-medium">建立连接</h4>
              <p className="text-sm text-muted-foreground">
                点击连接按钮建立网络连接
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
              3
            </div>
            <div>
              <h4 className="font-medium">开始分析</h4>
              <p className="text-sm text-muted-foreground">
                发送数据或开始抓包，查看实时分析结果
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            提示
          </h4>
          <p className="text-sm text-muted-foreground">
            您可以使用快捷键 <kbd className="px-1 py-0.5 bg-background rounded text-xs">Ctrl+N</kbd> 
            快速创建新连接，或使用 <kbd className="px-1 py-0.5 bg-background rounded text-xs">Ctrl+K</kbd> 
            打开命令面板。
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'examples',
    title: '示例项目',
    content: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">导入示例项目</h3>
        <p className="text-muted-foreground">
          我们为您准备了一些示例项目，帮助您快速了解ProtoTool的功能。
        </p>
        
        <div className="space-y-3">
          <div className="p-4 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Modbus TCP 调试</h4>
                <p className="text-sm text-muted-foreground">
                  包含Modbus TCP客户端连接和常用功能码示例
                </p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="p-4 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">HTTP API 测试</h4>
                <p className="text-sm text-muted-foreground">
                  REST API调试和HTTP协议分析示例
                </p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="p-4 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">UDP 广播监听</h4>
                <p className="text-sm text-muted-foreground">
                  UDP广播数据包捕获和分析示例
                </p>
              </div>
              <Download className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 您可以稍后在"文件"菜单中的"导入"选项中找到这些示例项目。
          </p>
        </div>
      </div>
    )
  }
];

export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem('prototool-welcome-completed', 'true');
    }
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem('prototool-welcome-completed', 'true');
    }
    onClose();
  };

  const currentStepData = welcomeSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">{currentStepData.title}</h2>
            <div className="flex items-center space-x-1">
              {welcomeSteps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index === currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[60vh]">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="dont-show-again"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="dont-show-again" className="text-sm text-muted-foreground">
              不再显示此引导
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-muted-foreground hover:text-foreground"
            >
              跳过
            </button>
            
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center space-x-1 px-4 py-2 border border-border rounded-md hover:bg-accent"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>上一步</span>
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center space-x-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <span>{currentStep === welcomeSteps.length - 1 ? '开始使用' : '下一步'}</span>
              {currentStep < welcomeSteps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
