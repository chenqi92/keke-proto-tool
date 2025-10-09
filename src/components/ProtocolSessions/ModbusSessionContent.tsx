import React, { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/utils';
import { useAppStore, useSessionById } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { useToast } from '@/components/Common/Toast';
import { EditConfigModal } from '@/components/EditConfigModal';
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
  Activity,
  RefreshCw
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

interface HistoryRecord {
  id: string;
  timestamp: number;
  functionCode: number;
  functionName: string;
  address: number;
  quantity?: number;
  value?: number;
  values?: number[] | boolean[];
  success: boolean;
  responseTime: number;
  error?: string;
  responseData?: any;
  // Hex frame data (simulated for now, will be real when backend supports it)
  requestFrame?: string;
  responseFrame?: string;
}

interface AddressBookEntry {
  id: string;
  name: string;
  address: number;
  quantity: number;
  functionCode: number;
  description?: string;
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

const EXCEPTION_CODES = [
  { code: 0x01, name: '非法功能', description: '服务器不支持该功能码' },
  { code: 0x02, name: '非法数据地址', description: '请求的数据地址不存在或超出范围' },
  { code: 0x03, name: '非法数据值', description: '请求的数据值不在允许的范围内' },
  { code: 0x04, name: '从站设备故障', description: '从站设备在处理请求时发生不可恢复的错误' },
  { code: 0x05, name: '确认', description: '从站已接受请求，正在处理（长时间操作）' },
  { code: 0x06, name: '从站设备忙', description: '从站正在处理长时间程序命令，请稍后重试' },
  { code: 0x07, name: '否定确认', description: '从站无法执行程序功能' },
  { code: 0x08, name: '内存奇偶校验错误', description: '从站在读取扩展内存时检测到奇偶校验错误' },
  { code: 0x0A, name: '网关路径不可用', description: '网关配置错误或网关路径不可达' },
  { code: 0x0B, name: '网关目标设备响应失败', description: '网关无法从目标设备获得响应' },
];

type DataDisplayFormat = 'decimal' | 'hex' | 'binary' | 'float';

export const ModbusSessionContent: React.FC<ModbusSessionContentProps> = ({ sessionId }) => {
  const session = useSessionById(sessionId);
  const updateSession = useAppStore(state => state.updateSession);

  // Toast notification
  const toast = useToast();

  // Track previous connection error to avoid duplicate toasts
  const prevConnectionErrorRef = useRef<string | undefined>();

  const [selectedFunctionCode, setSelectedFunctionCode] = useState(0x03);
  const [startAddress, setStartAddress] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [writeValue, setWriteValue] = useState(0);
  const [writeValues, setWriteValues] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isEditConfigOpen, setIsEditConfigOpen] = useState(false);
  const [displayFormat, setDisplayFormat] = useState<DataDisplayFormat>('decimal');

  // Polling state
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(1000); // milliseconds
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // History state
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showHexFrames, setShowHexFrames] = useState(false);

  // Address book state
  const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
  const [showAddressBook, setShowAddressBook] = useState(false);

  // Exception codes reference
  const [showExceptionCodes, setShowExceptionCodes] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddressName, setNewAddressName] = useState('');
  const [newAddressDescription, setNewAddressDescription] = useState('');

  // Communication details state
  const [showCommDetails, setShowCommDetails] = useState(false);

  // Statistics state
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    successCount: 0,
    failureCount: 0,
    totalResponseTime: 0,
    lastError: '',
  });

  // Data type and byte order state
  const [dataType, setDataType] = useState<'uint16' | 'int16' | 'uint32' | 'int32' | 'float32' | 'float64' | 'string' | 'bcd'>('uint16');
  const [byteOrder, setByteOrder] = useState<'ABCD' | 'BADC' | 'CDAB' | 'DCBA'>('ABCD');
  const [addressBase, setAddressBase] = useState<0 | 1>(0); // 0-based or 1-based addressing

  // Cleanup polling on unmount or when polling stops
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  // Stop polling when disconnected
  useEffect(() => {
    if (session && session.status !== 'connected' && isPolling) {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      setIsPolling(false);
    }
  }, [session, isPolling]);

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

  // Format register value based on selected format
  const formatRegisterValue = (value: number): string => {
    switch (displayFormat) {
      case 'hex':
        return `0x${value.toString(16).toUpperCase().padStart(4, '0')}`;
      case 'binary':
        return `0b${value.toString(2).padStart(16, '0')}`;
      case 'float': {
        // Convert two consecutive 16-bit registers to 32-bit float (IEEE 754)
        // This is a simplified version - in real use, you'd need two registers
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setUint16(0, value, false); // Big-endian
        return view.getFloat32(0, false).toFixed(4);
      }
      case 'decimal':
      default:
        return value.toString();
    }
  };

  // Generate simulated Modbus frame (for visualization purposes)
  // In production, this should come from the backend
  const generateSimulatedFrame = (functionCode: number, address: number, quantity: number, isRequest: boolean): string => {
    const unitId = session.config.modbusUnitId || 1;
    const bytes: number[] = [unitId, functionCode];

    if (isRequest) {
      // Request frame
      bytes.push((address >> 8) & 0xFF, address & 0xFF);
      bytes.push((quantity >> 8) & 0xFF, quantity & 0xFF);
    } else {
      // Response frame (simplified)
      const byteCount = quantity * 2;
      bytes.push(byteCount);
      // Add dummy data
      for (let i = 0; i < byteCount; i++) {
        bytes.push(0x00);
      }
    }

    // Add CRC (dummy values for now)
    bytes.push(0x00, 0x00);

    return bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  };

  // Export history to CSV
  const exportHistoryToCSV = () => {
    const headers = ['时间', '方向', '功能码', '地址', '数量/值', '耗时(ms)', '结果', '错误'];
    const rows = history.map(record => [
      new Date(record.timestamp).toLocaleString(),
      '→/←',
      `${record.functionName} (0x${record.functionCode.toString(16).toUpperCase().padStart(2, '0')})`,
      record.address + addressBase,
      record.quantity || record.value || '',
      record.responseTime,
      record.success ? '成功' : '失败',
      record.error || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `modbus_history_${Date.now()}.csv`;
    link.click();
  };

  const handleConnect = async () => {
    // Clear previous error when attempting a new connection
    if (session.status !== 'connected') {
      const store = useAppStore.getState();
      store.updateSessionStatus(sessionId, session.status, undefined);
    }
    await networkService.connect(sessionId);
  };

  const handleDisconnect = async () => {
    await networkService.disconnect(sessionId);
  };

  const handleSaveConfig = async (newConfig: any) => {
    // 如果会话已连接，需要先断开再重新连接
    const wasConnected = session.status === 'connected';

    if (wasConnected) {
      await networkService.disconnect(sessionId);
    }

    // 更新配置
    updateSession(sessionId, { config: newConfig });

    // 如果之前是连接状态，重新连接
    if (wasConnected) {
      setTimeout(() => {
        networkService.connect(sessionId);
      }, 500);
    }

    setIsEditConfigOpen(false);
  };

  const handleExecute = async () => {
    if (session.status !== 'connected') {
      toast.warning('请先连接', '请先连接到 Modbus 设备');
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

        case 0x02: // Read Discrete Inputs
          response = await invoke('modbus_read_discrete_inputs', {
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

        case 0x04: // Read Input Registers
          response = await invoke('modbus_read_input_registers', {
            sessionId,
            address: startAddress,
            quantity,
          });
          break;

        case 0x05: // Write Single Coil
          response = await invoke('modbus_write_single_coil', {
            sessionId,
            address: startAddress,
            value: writeValue > 0, // Convert to boolean
          });
          break;

        case 0x06: // Write Single Register
          response = await invoke('modbus_write_single_register', {
            sessionId,
            address: startAddress,
            value: writeValue,
          });
          break;

        case 0x0F: { // Write Multiple Coils
          const values = writeValues.split(',').map(v => parseInt(v.trim()) > 0).filter(v => v !== undefined);
          response = await invoke('modbus_write_multiple_coils', {
            sessionId,
            address: startAddress,
            values,
          });
          break;
        }

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
      const responseTimeMs = endTime - startTime;
      setResponseTime(responseTimeMs);
      setLastResponse(response);

      // Add to history
      const functionName = FUNCTION_CODES.find(f => f.code === selectedFunctionCode)?.name || `功能码 ${selectedFunctionCode}`;
      const historyRecord: HistoryRecord = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        functionCode: selectedFunctionCode,
        functionName,
        address: startAddress,
        quantity: isReadOperation ? quantity : undefined,
        value: !isReadOperation && !isMultipleOperation ? writeValue : undefined,
        values: isMultipleOperation ? (selectedFunctionCode === 0x0F ?
          writeValues.split(',').map(v => parseInt(v.trim()) > 0) :
          writeValues.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v))
        ) : undefined,
        success: response.success,
        responseTime: responseTimeMs,
        error: response.error,
        responseData: response.data || response.coilData,
        requestFrame: generateSimulatedFrame(selectedFunctionCode, startAddress, quantity, true),
        responseFrame: generateSimulatedFrame(selectedFunctionCode, startAddress, quantity, false),
      };

      setHistory(prev => [historyRecord, ...prev].slice(0, 100)); // Keep last 100 records

      // Update statistics
      setStatistics(prev => ({
        totalRequests: prev.totalRequests + 1,
        successCount: prev.successCount + 1,
        failureCount: prev.failureCount,
        totalResponseTime: prev.totalResponseTime + responseTimeMs,
        lastError: '',
      }));
    } catch (error) {
      console.error('Modbus operation failed:', error);
      const errorResponse = { success: false, error: String(error) };
      setLastResponse(errorResponse);

      // Add error to history
      const functionName = FUNCTION_CODES.find(f => f.code === selectedFunctionCode)?.name || `功能码 ${selectedFunctionCode}`;
      const historyRecord: HistoryRecord = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        functionCode: selectedFunctionCode,
        functionName,
        address: startAddress,
        quantity: isReadOperation ? quantity : undefined,
        success: false,
        responseTime: Date.now() - startTime,
        error: String(error),
        requestFrame: generateSimulatedFrame(selectedFunctionCode, startAddress, quantity, true),
      };

      setHistory(prev => [historyRecord, ...prev].slice(0, 100));

      // Update statistics
      setStatistics(prev => ({
        totalRequests: prev.totalRequests + 1,
        successCount: prev.successCount,
        failureCount: prev.failureCount + 1,
        totalResponseTime: prev.totalResponseTime,
        lastError: String(error),
      }));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStartPolling = () => {
    if (!isReadOperation) {
      toast.warning('不支持的操作', '轮询功能仅支持读取操作');
      return;
    }

    if (session.status !== 'connected') {
      toast.warning('请先连接', '请先连接到 Modbus 设备');
      return;
    }

    setIsPolling(true);

    // Execute immediately
    handleExecute();

    // Set up interval
    pollingTimerRef.current = setInterval(() => {
      handleExecute();
    }, pollingInterval);
  };

  const handleStopPolling = () => {
    setIsPolling(false);
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const handleSaveToAddressBook = () => {
    if (!newAddressName.trim()) {
      toast.warning('请输入地址名称', '地址名称不能为空');
      return;
    }

    const entry: AddressBookEntry = {
      id: `${Date.now()}-${Math.random()}`,
      name: newAddressName,
      address: startAddress,
      quantity,
      functionCode: selectedFunctionCode,
      description: newAddressDescription,
    };

    setAddressBook(prev => [...prev, entry]);
    setNewAddressName('');
    setNewAddressDescription('');
    setIsAddingAddress(false);
  };

  const handleLoadFromAddressBook = (entry: AddressBookEntry) => {
    setStartAddress(entry.address);
    setQuantity(entry.quantity);
    setSelectedFunctionCode(entry.functionCode);
  };

  const handleDeleteAddressBookEntry = (id: string) => {
    setAddressBook(prev => prev.filter(e => e.id !== id));
  };

  // Initialize prevConnectionErrorRef on mount to avoid showing historical errors
  useEffect(() => {
    if (session.error) {
      prevConnectionErrorRef.current = session.error;
    }
  }, []); // Only run on mount

  // Show connection error as toast
  useEffect(() => {
    if (session.error && session.error !== prevConnectionErrorRef.current) {
      prevConnectionErrorRef.current = session.error;
      toast.error('连接失败', session.error, {
        duration: 0, // Don't auto-dismiss
        action: {
          label: '重新连接',
          onClick: handleConnect
        }
      });
    } else if (!session.error && prevConnectionErrorRef.current) {
      // Clear the ref when error is resolved
      prevConnectionErrorRef.current = undefined;
    }
  }, [session.error]);

  return (
    <div className="flex flex-col h-full bg-background">
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
            <h2 className="text-sm font-medium">{session.config.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{session.config.protocol}</span>
              {session.config.modbusSerialPort && (
                <>
                  <span>•</span>
                  <span>{session.config.modbusSerialPort} @ {session.config.modbusBaudRate || 9600} bps</span>
                </>
              )}
              <span>•</span>
              <span>Unit ID: {session.config.modbusUnitId || 1}</span>
              {session.status === 'connected' && statistics.totalRequests > 0 && (
                <>
                  <span>•</span>
                  <span>
                    成功率: {((statistics.successCount / statistics.totalRequests) * 100).toFixed(1)}%
                  </span>
                  <span>•</span>
                  <span>
                    平均延迟: {(statistics.totalResponseTime / statistics.successCount || 0).toFixed(0)}ms
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditConfigOpen(true)}
            className="flex items-center gap-2 px-2 py-1 border border-border rounded-md hover:bg-accent transition-colors text-xs"
            title="编辑配置"
          >
            <Settings className="w-4 h-4" />
          </button>

          {session.status === 'connected' ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs"
            >
              <WifiOff className="w-4 h-4" />
              断开连接
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={session.status === 'connecting'}
              className="flex items-center gap-2 px-2 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-xs"
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
          {/* Global Settings */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">全局设置</h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Address Base */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">地址基址</label>
                <select
                  value={addressBase}
                  onChange={(e) => setAddressBase(Number(e.target.value) as 0 | 1)}
                  className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background"
                >
                  <option value={0}>0 基址</option>
                  <option value={1}>1 基址</option>
                </select>
              </div>

              {/* Data Type */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">数据类型</label>
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value as any)}
                  className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background"
                >
                  <option value="uint16">UInt16</option>
                  <option value="int16">Int16</option>
                  <option value="uint32">UInt32</option>
                  <option value="int32">Int32</option>
                  <option value="float32">Float32</option>
                  <option value="float64">Float64</option>
                  <option value="string">字符串</option>
                  <option value="bcd">BCD</option>
                </select>
              </div>

              {/* Byte Order */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">字节序</label>
                <select
                  value={byteOrder}
                  onChange={(e) => setByteOrder(e.target.value as any)}
                  className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background"
                >
                  <option value="ABCD">ABCD (Big-Big)</option>
                  <option value="BADC">BADC (Big-Little)</option>
                  <option value="CDAB">CDAB (Little-Big)</option>
                  <option value="DCBA">DCBA (Little-Little)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Function Code Selector */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">功能码选择</h3>
            <div className="grid grid-cols-4 gap-2">
              {FUNCTION_CODES.map((func) => (
                <button
                  key={func.code}
                  onClick={() => setSelectedFunctionCode(func.code)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors text-left",
                    selectedFunctionCode === func.code
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {func.type === 'read' ? <Download className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{func.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Address Book Quick Access */}
          {addressBook.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">地址簿快捷访问</h3>
                <button
                  onClick={() => setShowAddressBook(!showAddressBook)}
                  className="text-xs px-2 py-1 bg-accent hover:bg-accent/80 rounded transition-colors"
                >
                  {showAddressBook ? '隐藏' : '显示'}
                </button>
              </div>

              {showAddressBook && (
                <div className="grid grid-cols-2 gap-2">
                  {addressBook.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => handleLoadFromAddressBook(entry)}
                      className="flex items-center justify-between p-2 bg-muted hover:bg-muted/80 rounded-md text-left transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{entry.name}</div>
                        <div className="text-xs text-muted-foreground">
                          地址: {entry.address} | 数量: {entry.quantity}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddressBookEntry(entry.id);
                        }}
                        className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Operation Parameters */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">操作参数</h3>
              <button
                onClick={() => setIsAddingAddress(!isAddingAddress)}
                className="text-xs px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors"
              >
                {isAddingAddress ? '取消' : '保存到地址簿'}
              </button>
            </div>

            {isAddingAddress && (
              <div className="mb-3 p-3 bg-accent/50 rounded-md space-y-2">
                <input
                  type="text"
                  value={newAddressName}
                  onChange={(e) => setNewAddressName(e.target.value)}
                  placeholder="地址名称（必填）"
                  className="w-full px-2 py-1 border border-border rounded-md text-xs"
                />
                <input
                  type="text"
                  value={newAddressDescription}
                  onChange={(e) => setNewAddressDescription(e.target.value)}
                  placeholder="描述（可选）"
                  className="w-full px-2 py-1 border border-border rounded-md text-xs"
                />
                <button
                  onClick={handleSaveToAddressBook}
                  className="w-full px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                >
                  保存
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    起始地址 {addressBase === 1 && <span className="text-xs text-muted-foreground">(1-based)</span>}
                  </label>
                  <input
                    type="number"
                    min={addressBase}
                    max={65535 + addressBase}
                    value={startAddress + addressBase}
                    onChange={(e) => setStartAddress((parseInt(e.target.value) || addressBase) - addressBase)}
                    className="w-full px-2 py-1 border border-border rounded-md text-xs"
                    placeholder={addressBase === 0 ? "0-65535" : "1-65536"}
                  />
                </div>

                {isReadOperation && (
                  <div>
                    <label className="block text-xs font-medium mb-1">数量</label>
                    <input
                      type="number"
                      min="1"
                      max="125"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 border border-border rounded-md text-xs"
                      placeholder="1-125"
                    />
                  </div>
                )}

                {!isReadOperation && !isMultipleOperation && (
                  <div>
                    <label className="block text-xs font-medium mb-1">写入值</label>
                    <input
                      type="number"
                      min="0"
                      max="65535"
                      value={writeValue}
                      onChange={(e) => setWriteValue(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-border rounded-md text-xs"
                      placeholder="0-65535"
                    />
                  </div>
                )}
              </div>

              {isMultipleOperation && (
                <div>
                  <label className="block text-xs font-medium mb-1">写入值 (逗号分隔)</label>
                  <input
                    type="text"
                    value={writeValues}
                    onChange={(e) => setWriteValues(e.target.value)}
                    className="w-full px-2 py-1 border border-border rounded-md text-xs"
                    placeholder="例如: 100, 200, 300"
                  />
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  {/* Polling Controls - Only for read operations */}
                  {isReadOperation && (
                    <>
                      <label className="text-xs font-medium whitespace-nowrap">轮询间隔</label>
                      <input
                        type="number"
                        min="100"
                        max="60000"
                        step="100"
                        value={pollingInterval}
                        onChange={(e) => setPollingInterval(parseInt(e.target.value) || 1000)}
                        disabled={isPolling}
                        className="w-24 px-2 py-1 border border-border rounded-md text-xs disabled:opacity-50"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">毫秒</span>

                      {!isPolling ? (
                        <button
                          onClick={handleStartPolling}
                          disabled={session.status !== 'connected' || isExecuting}
                          className="flex items-center justify-center gap-1.5 px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-xs whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5" />
                          开始轮询
                        </button>
                      ) : (
                        <button
                          onClick={handleStopPolling}
                          className="flex items-center justify-center gap-1.5 px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs whitespace-nowrap"
                        >
                          <Square className="w-3.5 h-3.5" />
                          停止轮询
                        </button>
                      )}
                    </>
                  )}

                  {/* Execute Button */}
                  <button
                    onClick={handleExecute}
                    disabled={session.status !== 'connected' || isExecuting || isPolling}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-2 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-xs whitespace-nowrap",
                      !isReadOperation && "ml-auto"
                    )}
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        执行中...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        {isPolling ? '轮询中...' : '执行操作'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Response Display */}
          {lastResponse && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">响应结果</h3>
                  {isPolling && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      轮询中
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* Data Format Selector */}
                  {lastResponse.data && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">格式:</span>
                      <select
                        value={displayFormat}
                        onChange={(e) => setDisplayFormat(e.target.value as DataDisplayFormat)}
                        className="text-xs px-2 py-1 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="decimal">十进制</option>
                        <option value="hex">十六进制</option>
                        <option value="binary">二进制</option>
                        <option value="float">浮点数</option>
                      </select>
                    </div>
                  )}
                  {responseTime !== null && (
                    <span className="text-xs text-muted-foreground">
                      响应时间: {responseTime}ms
                    </span>
                  )}
                </div>
              </div>

              <div className={cn(
                "p-2 rounded-md",
                lastResponse.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
              )}>
                {lastResponse.success ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-green-800">✓ 操作成功</p>
                    {lastResponse.data && (
                      <div className="text-xs text-green-700">
                        <p className="font-medium mb-1">寄存器值:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {lastResponse.data.map((value: number, index: number) => (
                            <div key={index} className="bg-white px-2 py-1 rounded">
                              <div className="text-xs text-gray-500 mb-1">[{startAddress + index + addressBase}]</div>
                              <div className="font-mono text-xs break-all">{formatRegisterValue(value)}</div>
                              {displayFormat !== 'decimal' && (
                                <div className="text-xs text-gray-400 mt-1">({value})</div>
                              )}
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
                              <div className="text-xs">[{startAddress + index + addressBase}]</div>
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

              {/* Communication Details - Collapsible */}
              <div className="mt-3 border-t border-border pt-3">
                <button
                  onClick={() => setShowCommDetails(!showCommDetails)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Activity className="w-3 h-3" />
                  <span>通信详情</span>
                  <span className="text-xs">{showCommDetails ? '▼' : '▶'}</span>
                </button>

                {showCommDetails && (
                  <div className="mt-2 space-y-2 text-xs">
                    {/* Request Details */}
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <div className="font-medium text-blue-800 mb-1">请求信息</div>
                      <div className="space-y-1 text-blue-700">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">功能码:</span>
                          <span className="font-mono">
                            {FUNCTION_CODES.find(f => f.code === selectedFunctionCode)?.name || `0x${selectedFunctionCode.toString(16).toUpperCase()}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">起始地址:</span>
                          <span className="font-mono">{startAddress + addressBase} (0x{startAddress.toString(16).toUpperCase().padStart(4, '0')})</span>
                        </div>
                        {isReadOperation && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">数量:</span>
                            <span className="font-mono">{quantity}</span>
                          </div>
                        )}
                        {!isReadOperation && !isMultipleOperation && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">写入值:</span>
                            <span className="font-mono">{writeValue} (0x{writeValue.toString(16).toUpperCase().padStart(4, '0')})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Response Details */}
                    {lastResponse.success && (lastResponse.data || lastResponse.coilData) && (
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <div className="font-medium text-green-800 mb-1">响应信息</div>
                        <div className="space-y-1 text-green-700">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">数据长度:</span>
                            <span className="font-mono">
                              {lastResponse.data ? lastResponse.data.length : lastResponse.coilData.length} 个
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">地址范围:</span>
                            <span className="font-mono">
                              {startAddress + addressBase} - {startAddress + addressBase + (lastResponse.data ? lastResponse.data.length : lastResponse.coilData.length) - 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Panel */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">操作历史</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHexFrames(!showHexFrames)}
                  className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                  title="显示/隐藏十六进制帧"
                >
                  {showHexFrames ? '隐藏帧' : '显示帧'}
                </button>
                {history.length > 0 && (
                  <>
                    <button
                      onClick={exportHistoryToCSV}
                      className="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                      title="导出为 CSV"
                    >
                      导出
                    </button>
                    <button
                      onClick={() => setHistory([])}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      清空
                    </button>
                  </>
                )}
                <span className="text-xs text-muted-foreground">
                  共 {history.length} 条
                </span>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs px-2 py-1 bg-accent hover:bg-accent/80 rounded transition-colors"
                >
                  {showHistory ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            {showHistory && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">暂无操作记录</p>
                ) : (
                  history.map((record) => (
                    <div
                      key={record.id}
                      className={cn(
                        "p-3 rounded-md border text-sm",
                        record.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium",
                              record.success ? "text-green-800" : "text-red-800"
                            )}>
                              {record.functionName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              地址: {record.address}
                              {record.quantity && ` | 数量: ${record.quantity}`}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(record.timestamp).toLocaleString('zh-CN')} |
                            响应时间: {record.responseTime}ms
                          </div>
                        </div>
                      </div>

                      {record.success && record.responseData && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">结果: </span>
                          <span className="font-mono">
                            {Array.isArray(record.responseData) ?
                              record.responseData.slice(0, 10).join(', ') +
                              (record.responseData.length > 10 ? '...' : '') :
                              String(record.responseData)
                            }
                          </span>
                        </div>
                      )}

                      {!record.success && record.error && (
                        <div className="mt-2 text-xs text-red-700">
                          错误: {record.error}
                        </div>
                      )}

                      {/* Hex Frame Display */}
                      {showHexFrames && (record.requestFrame || record.responseFrame) && (
                        <div className="mt-3 pt-3 border-t border-gray-300 space-y-2">
                          {record.requestFrame && (
                            <div className="text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-blue-700 font-medium">→ 请求帧:</span>
                                <span className="text-xs text-muted-foreground">(模拟数据)</span>
                              </div>
                              <div className="font-mono text-xs bg-blue-50 p-2 rounded border border-blue-200 break-all">
                                {record.requestFrame}
                              </div>
                            </div>
                          )}
                          {record.responseFrame && (
                            <div className="text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-green-700 font-medium">← 响应帧:</span>
                                <span className="text-xs text-muted-foreground">(模拟数据)</span>
                              </div>
                              <div className="font-mono text-xs bg-green-50 p-2 rounded border border-green-200 break-all">
                                {record.responseFrame}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Exception Codes Reference */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">异常码参考</h3>
              <button
                onClick={() => setShowExceptionCodes(!showExceptionCodes)}
                className="text-xs px-2 py-1 bg-accent hover:bg-accent/80 rounded transition-colors"
              >
                {showExceptionCodes ? '隐藏' : '显示'}
              </button>
            </div>

            {showExceptionCodes && (
              <div className="space-y-2">
                {EXCEPTION_CODES.map((exception) => (
                  <div
                    key={exception.code}
                    className="p-3 rounded-md border bg-muted/50 text-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-medium text-red-700">
                        0x{exception.code.toString(16).toUpperCase().padStart(2, '0')}
                      </span>
                      <span className="font-medium">{exception.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {exception.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Config Modal */}
      <EditConfigModal
        isOpen={isEditConfigOpen}
        onClose={() => setIsEditConfigOpen(false)}
        onSave={handleSaveConfig}
        config={session.config}
      />

      {/* Toast Container */}
      <toast.ToastContainer />
    </div>
  );
};

