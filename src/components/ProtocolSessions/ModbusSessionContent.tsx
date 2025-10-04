import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import { useAppStore, useSessionById } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { ConnectionErrorBanner } from '@/components/Common/ConnectionErrorBanner';
import { invoke } from '@tauri-apps/api/core';
import {
  Wifi,
  Send,
  AlertCircle,
  Play,
  Square,
  Settings,
  WifiOff,
  Loader2,
  Edit3,
  X,
  Trash2,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Activity
} from 'lucide-react';

interface ModbusSessionContentProps {
  sessionId: string;
}

interface ModbusOperation {
  functionCode: number;
  address: number;
  quantity?: number;
  value?: number;
  values?: number[];
}

const FUNCTION_CODES = [
  { code: 0x01, name: '读取线圈 (0x01)', type: 'read', registerType: 'coil' },
  { code: 0x02, name: '读取离散输入 (0x02)', type: 'read', registerType: 'discrete' },
  { code: 0x03, name: '读取保持寄存器 (0x03)', type: 'read', registerType: 'holding' },
  { code: 0x04, name: '读取输入寄存器 (0x04)', type: 'read', registerType: 'input' },
  { code: 0x05, name: '写单个线圈 (0x05)', type: 'write', registerType: 'coil' },
  { code: 0x06, name: '写单个寄存器 (0x06)', type: 'write', registerType: 'holding' },
  { code: 0x0F, name: '写多个线圈 (0x0F)', type: 'write', registerType: 'coil' },
  { code: 0x10, name: '写多个寄存器 (0x10)', type: 'write', registerType: 'holding' },
];

export const ModbusSessionContent: React.FC<ModbusSessionContentProps> = ({ sessionId }) => {
  const session = useSessionById(sessionId);
  const [selectedFunctionCode, setSelectedFunctionCode] = useState(0x03);
  const [startAddress, setStartAddress] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [writeValue, setWriteValue] = useState(0);
  const [writeValues, setWriteValues] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">会话不存在</p>
        </div>
      </div>
    );
  }

  const selectedFunction = FUNCTION_CODES.find(f => f.code === selectedFunctionCode);
  const isReadOperation = selectedFunction?.type === 'read';
  const isMultipleOperation = selectedFunctionCode === 0x0F || selectedFunctionCode === 0x10;

  const handleConnect = async () => {
    await networkService.connect(sessionId);
  };

  const handleDisconnect = async () => {
    await networkService.disconnect(sessionId);
  };

  const handleExecute = async () => {
    if (session.status !== 'connected') {
      alert('请先连接到 Modbus 设备');
      return;
    }

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      let response;

      switch (selectedFunctionCode) {
        case 0x01: // Read Coils
          response = await invoke('modbus_read_coils', {
            sessionId,
            address: startAddress,
            quantity,
          });
          break;

        case 0x03: // Read Holding Registers
          response = await invoke('modbus_read_holding_registers', {
            sessionId,
            address: startAddress,
            quantity,
          });
          break;

        case 0x06: // Write Single Register
          response = await invoke('modbus_write_single_register', {
            sessionId,
            address: startAddress,
            value: writeValue,
          });
          break;

        case 0x10: { // Write Multiple Registers
          const values = writeValues.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
          response = await invoke('modbus_write_multiple_registers', {
            sessionId,
            address: startAddress,
            values,
          });
          break;
        }

        default:
          throw new Error(`Function code ${selectedFunctionCode} not yet implemented`);
      }

      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      setLastResponse(response);
    } catch (error) {
      console.error('Modbus operation failed:', error);
      setLastResponse({ success: false, error: String(error) });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Connection Error Banner */}
      {session.error && (
        <ConnectionErrorBanner
          error={session.error}
          onRetry={handleConnect}
          onDismiss={() => useAppStore.getState().updateSession(sessionId, { error: undefined })}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            session.status === 'connected' ? "bg-green-500" :
            session.status === 'connecting' ? "bg-yellow-500 animate-pulse" :
            session.status === 'error' ? "bg-red-500" :
            "bg-gray-400"
          )} />
          <div>
            <h2 className="text-lg font-semibold">{session.config.name}</h2>
            <p className="text-sm text-muted-foreground">
              {session.config.protocol} - Unit ID: {session.config.modbusUnitId || 1}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {session.status === 'connected' ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              <WifiOff className="w-4 h-4" />
              断开连接
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={session.status === 'connecting'}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {session.status === 'connecting' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              {session.status === 'connecting' ? '连接中...' : '连接'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Function Code Selector */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">功能码选择</h3>
            <div className="grid grid-cols-2 gap-2">
              {FUNCTION_CODES.map((func) => (
                <button
                  key={func.code}
                  onClick={() => setSelectedFunctionCode(func.code)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                    selectedFunctionCode === func.code
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {func.type === 'read' ? <Download className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  <span>{func.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Operation Parameters */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">操作参数</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">起始地址</label>
                  <input
                    type="number"
                    min="0"
                    max="65535"
                    value={startAddress}
                    onChange={(e) => setStartAddress(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="0-65535"
                  />
                </div>

                {isReadOperation && (
                  <div>
                    <label className="block text-sm font-medium mb-1">数量</label>
                    <input
                      type="number"
                      min="1"
                      max="125"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm"
                      placeholder="1-125"
                    />
                  </div>
                )}

                {!isReadOperation && !isMultipleOperation && (
                  <div>
                    <label className="block text-sm font-medium mb-1">写入值</label>
                    <input
                      type="number"
                      min="0"
                      max="65535"
                      value={writeValue}
                      onChange={(e) => setWriteValue(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm"
                      placeholder="0-65535"
                    />
                  </div>
                )}
              </div>

              {isMultipleOperation && (
                <div>
                  <label className="block text-sm font-medium mb-1">写入值 (逗号分隔)</label>
                  <input
                    type="text"
                    value={writeValues}
                    onChange={(e) => setWriteValues(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                    placeholder="例如: 100, 200, 300"
                  />
                </div>
              )}

              <button
                onClick={handleExecute}
                disabled={session.status !== 'connected' || isExecuting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    执行中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    执行操作
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Response Display */}
          {lastResponse && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">响应结果</h3>
                {responseTime !== null && (
                  <span className="text-xs text-muted-foreground">
                    响应时间: {responseTime}ms
                  </span>
                )}
              </div>
              
              <div className={cn(
                "p-3 rounded-md",
                lastResponse.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
              )}>
                {lastResponse.success ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-800">✓ 操作成功</p>
                    {lastResponse.data && (
                      <div className="text-sm text-green-700">
                        <p className="font-medium mb-1">寄存器值:</p>
                        <div className="grid grid-cols-8 gap-2">
                          {lastResponse.data.map((value: number, index: number) => (
                            <div key={index} className="bg-white px-2 py-1 rounded text-center">
                              <div className="text-xs text-gray-500">[{startAddress + index}]</div>
                              <div className="font-mono">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {lastResponse.coilData && (
                      <div className="text-sm text-green-700">
                        <p className="font-medium mb-1">线圈状态:</p>
                        <div className="flex flex-wrap gap-2">
                          {lastResponse.coilData.map((value: boolean, index: number) => (
                            <div key={index} className={cn(
                              "px-2 py-1 rounded text-center",
                              value ? "bg-green-200" : "bg-gray-200"
                            )}>
                              <div className="text-xs">[{startAddress + index}]</div>
                              <div className="font-mono">{value ? 'ON' : 'OFF'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-red-800">✗ 操作失败</p>
                    <p className="text-sm text-red-700 mt-1">{lastResponse.error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

