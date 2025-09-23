import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import {
  Database,
  Server,
  HardDrive,
  Cloud,
  Activity,
  Eye,
  EyeOff,
  TestTube,
  Save,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { DatabaseConnection, DatabaseType, DATABASE_CONFIGS } from '@/types/storage';

interface DatabaseConnectionFormProps {
  connection?: DatabaseConnection;
  onSave: (connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  onTest?: (connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  isLoading?: boolean;
  className?: string;
}

const getIconComponent = (iconName: string) => {
  const icons = {
    Database,
    Server,
    HardDrive,
    Cloud,
    Activity
  };
  return icons[iconName as keyof typeof icons] || Database;
};

export const DatabaseConnectionForm: React.FC<DatabaseConnectionFormProps> = ({
  connection,
  onSave,
  onCancel,
  onTest,
  isLoading = false,
  className
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'mysql8' as DatabaseType,
    host: 'localhost',
    port: 3306,
    database: '',
    username: '',
    password: '',
    ssl: false,
    config: {}
  });

  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | 'testing' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data
  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name,
        type: connection.type,
        host: connection.host,
        port: connection.port,
        database: connection.database || '',
        username: connection.username || '',
        password: connection.password || '',
        ssl: connection.ssl || false,
        config: connection.config || {}
      });
    } else {
      // Reset to defaults when no connection provided
      const defaultConfig = DATABASE_CONFIGS[formData.type];
      setFormData(prev => ({
        ...prev,
        port: defaultConfig.defaultPort
      }));
    }
  }, [connection]);

  // Update port when database type changes
  useEffect(() => {
    const config = DATABASE_CONFIGS[formData.type];
    setFormData(prev => ({
      ...prev,
      port: config.defaultPort
    }));
  }, [formData.type]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const config = DATABASE_CONFIGS[formData.type];

    // Validate required fields
    if (!formData.name.trim()) {
      newErrors.name = '连接名称不能为空';
    }

    config.requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = `${field} 是必填项`;
      }
    });

    // Validate port
    if (formData.port < 1 || formData.port > 65535) {
      newErrors.port = '端口号必须在 1-65535 之间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSave({
        ...formData,
        status: 'disconnected'
      });
    } catch (error) {
      console.error('Failed to save connection:', error);
    }
  };

  const handleTest = async () => {
    if (!validateForm() || !onTest) {
      return;
    }

    setTestResult('testing');
    
    try {
      const result = await onTest({
        ...formData,
        status: 'disconnected'
      });
      setTestResult(result ? 'success' : 'error');
    } catch (error) {
      setTestResult('error');
      console.error('Connection test failed:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    
    // Clear test result when form changes
    if (testResult) {
      setTestResult(null);
    }
  };

  const config = DATABASE_CONFIGS[formData.type];
  const IconComponent = getIconComponent(config.icon);

  return (
    <div className={cn("bg-background", className)}>
      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Database Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">数据库类型</label>
          <select
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value as DatabaseType)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {Object.entries(DATABASE_CONFIGS).map(([type, config]) => (
              <option key={type} value={type}>
                {config.name}
              </option>
            ))}
          </select>
        </div>

        {/* Connection Name */}
        <div>
          <label className="block text-sm font-medium mb-2">连接名称 *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="输入连接名称"
            className={cn(
              "w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
              errors.name ? "border-red-500" : "border-border"
            )}
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Host and Port */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">主机地址 *</label>
            <input
              type="text"
              value={formData.host}
              onChange={(e) => handleInputChange('host', e.target.value)}
              placeholder="localhost"
              className={cn(
                "w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                errors.host ? "border-red-500" : "border-border"
              )}
            />
            {errors.host && (
              <p className="text-sm text-red-600 mt-1">{errors.host}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">端口 *</label>
            <input
              type="number"
              value={formData.port}
              onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 0)}
              min="1"
              max="65535"
              className={cn(
                "w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                errors.port ? "border-red-500" : "border-border"
              )}
            />
            {errors.port && (
              <p className="text-sm text-red-600 mt-1">{errors.port}</p>
            )}
          </div>
        </div>

        {/* Database Name (if required) */}
        {config.requiredFields.includes('database') && (
          <div>
            <label className="block text-sm font-medium mb-2">数据库名称 *</label>
            <input
              type="text"
              value={formData.database}
              onChange={(e) => handleInputChange('database', e.target.value)}
              placeholder="数据库名称"
              className={cn(
                "w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                errors.database ? "border-red-500" : "border-border"
              )}
            />
            {errors.database && (
              <p className="text-sm text-red-600 mt-1">{errors.database}</p>
            )}
          </div>
        )}

        {/* Username and Password */}
        {(config.requiredFields.includes('username') || config.optionalFields.includes('username') ||
          config.requiredFields.includes('password') || config.optionalFields.includes('password')) && (
          <div className="grid grid-cols-2 gap-3">
            {(config.requiredFields.includes('username') || config.optionalFields.includes('username')) && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  用户名 {config.requiredFields.includes('username') ? '*' : ''}
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="用户名"
                  className={cn(
                    "w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    errors.username ? "border-red-500" : "border-border"
                  )}
                />
                {errors.username && (
                  <p className="text-sm text-red-600 mt-1">{errors.username}</p>
                )}
              </div>
            )}
            {(config.requiredFields.includes('password') || config.optionalFields.includes('password')) && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  密码 {config.requiredFields.includes('password') ? '*' : ''}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="密码"
                    className="w-full px-3 py-2 pr-10 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent rounded"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SSL Option */}
        {config.optionalFields.includes('ssl') && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="ssl"
              checked={formData.ssl}
              onChange={(e) => handleInputChange('ssl', e.target.checked)}
              className="rounded border-border focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="ssl" className="text-sm font-medium">
              启用 SSL/TLS 连接
            </label>
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div className={cn(
            "flex items-center space-x-2 p-3 rounded-md",
            testResult === 'success' && "bg-green-50 text-green-700",
            testResult === 'error' && "bg-red-50 text-red-700",
            testResult === 'testing' && "bg-blue-50 text-blue-700"
          )}>
            {testResult === 'success' && <CheckCircle className="w-4 h-4" />}
            {testResult === 'error' && <XCircle className="w-4 h-4" />}
            {testResult === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
            <span className="text-sm">
              {testResult === 'success' && '连接测试成功'}
              {testResult === 'error' && '连接测试失败'}
              {testResult === 'testing' && '正在测试连接...'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            {onTest && (
              <button
                type="button"
                onClick={handleTest}
                disabled={testResult === 'testing' || isLoading}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {testResult === 'testing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                <span>测试连接</span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{connection ? '更新' : '保存'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
