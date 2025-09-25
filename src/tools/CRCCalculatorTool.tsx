import React, { useState, useEffect } from 'react';
import { 
  BaseTool, 
  ToolInput, 
  ToolOutput, 
  ToolContext, 
  ToolAction, 
  ContextMenuItem 
} from '@/types/toolbox';
import { DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { 
  Calculator, 
  Play, 
  Copy, 
  RotateCcw,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

interface CRCAlgorithm {
  id: string;
  name: string;
  description: string;
  width: number;
  polynomial: number;
  initialValue: number;
  finalXor: number;
  reflectInput: boolean;
  reflectOutput: boolean;
  example?: string;
}

const CRC_ALGORITHMS: CRCAlgorithm[] = [
  {
    id: 'crc8',
    name: 'CRC-8',
    description: 'Standard CRC-8',
    width: 8,
    polynomial: 0x07,
    initialValue: 0x00,
    finalXor: 0x00,
    reflectInput: false,
    reflectOutput: false,
    example: '0x31 0x32 0x33 → 0xA1'
  },
  {
    id: 'crc16-ccitt',
    name: 'CRC-16 CCITT',
    description: 'CRC-16 CCITT (X.25, HDLC)',
    width: 16,
    polynomial: 0x1021,
    initialValue: 0xFFFF,
    finalXor: 0x0000,
    reflectInput: false,
    reflectOutput: false,
    example: '0x31 0x32 0x33 → 0x31C3'
  },
  {
    id: 'crc16-modbus',
    name: 'CRC-16 Modbus',
    description: 'CRC-16 for Modbus RTU',
    width: 16,
    polynomial: 0x8005,
    initialValue: 0xFFFF,
    finalXor: 0x0000,
    reflectInput: true,
    reflectOutput: true,
    example: '0x31 0x32 0x33 → 0x4B37'
  },
  {
    id: 'crc32',
    name: 'CRC-32',
    description: 'Standard CRC-32 (IEEE 802.3)',
    width: 32,
    polynomial: 0x04C11DB7,
    initialValue: 0xFFFFFFFF,
    finalXor: 0xFFFFFFFF,
    reflectInput: true,
    reflectOutput: true,
    example: '0x31 0x32 0x33 → 0x884863D2'
  },
  {
    id: 'crc32c',
    name: 'CRC-32C',
    description: 'CRC-32C (Castagnoli)',
    width: 32,
    polynomial: 0x1EDC6F41,
    initialValue: 0xFFFFFFFF,
    finalXor: 0xFFFFFFFF,
    reflectInput: true,
    reflectOutput: true,
    example: '0x31 0x32 0x33 → 0xB9E02B86'
  }
];

interface CRCResult {
  algorithm: CRCAlgorithm;
  inputData: Uint8Array;
  crcValue: number;
  crcHex: string;
  crcBytes: Uint8Array;
  isValid?: boolean;
  expectedCrc?: number;
}

class CRCCalculatorTool implements BaseTool {
  id = 'crc-calculator';
  name = 'CRC 校验计算器';
  description = '计算和验证各种CRC校验和，支持CRC-8、CRC-16、CRC-32等算法';
  version = '1.0.0';
  category = 'validation' as const;
  icon = Calculator;
  author = 'ProtoTool';

  supportedFormats: DataFormat[] = ['hex', 'ascii', 'binary', 'base64'];
  supportedProtocols = ['TCP', 'UDP', 'Modbus', 'Custom'] as const;
  requiresConnection = false;
  canProcessStreaming = false;

  defaultConfig = {
    selectedAlgorithm: 'crc16-modbus',
    inputFormat: 'hex' as DataFormat,
    outputFormat: 'hex' as DataFormat,
    includeInput: true,
    validateMode: false
  };

  async initialize(context: ToolContext): Promise<void> {
    console.log('CRC Calculator initialized');
  }

  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      if (!input.data || input.data.length === 0) {
        throw new Error('No data provided for CRC calculation');
      }

      const { algorithmId, validateMode, expectedCrc } = input.metadata || {};
      
      const algorithm = CRC_ALGORITHMS.find(alg => alg.id === algorithmId) || CRC_ALGORITHMS[1];
      
      let dataToProcess = input.data;
      let actualExpectedCrc = expectedCrc;

      // In validate mode, extract CRC from the end of data
      if (validateMode) {
        const crcBytes = algorithm.width / 8;
        if (input.data.length < crcBytes) {
          throw new Error(`Data too short for ${algorithm.name} validation (need at least ${crcBytes} bytes)`);
        }
        
        dataToProcess = input.data.slice(0, -crcBytes);
        const crcData = input.data.slice(-crcBytes);
        
        // Convert CRC bytes to number
        if (algorithm.width === 8) {
          actualExpectedCrc = crcData[0];
        } else if (algorithm.width === 16) {
          actualExpectedCrc = algorithm.reflectOutput 
            ? (crcData[0] | (crcData[1] << 8))
            : (crcData[1] | (crcData[0] << 8));
        } else if (algorithm.width === 32) {
          const view = new DataView(crcData.buffer, crcData.byteOffset);
          actualExpectedCrc = algorithm.reflectOutput 
            ? view.getUint32(0, true)
            : view.getUint32(0, false);
        }
      }

      const result = this.calculateCRC(dataToProcess, algorithm);
      
      if (validateMode && actualExpectedCrc !== undefined) {
        result.isValid = result.crcValue === actualExpectedCrc;
        result.expectedCrc = actualExpectedCrc;
      }

      return {
        data: result.crcBytes,
        format: 'hex',
        result: result.crcHex,
        metadata: {
          crcResult: result,
          algorithm: algorithm.name,
          isValidation: validateMode,
          dataLength: dataToProcess.length
        }
      };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'CRC calculation failed'
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('CRC Calculator cleaned up');
  }

  renderUI(container: HTMLElement, context: ToolContext): React.ReactElement {
    return <CRCCalculatorUI tool={this} context={context} />;
  }

  getQuickActions(context: ToolContext): ToolAction[] {
    return [
      {
        id: 'calc-modbus-crc',
        label: '计算 Modbus CRC',
        icon: Calculator,
        shortcut: 'Ctrl+M',
        handler: async (ctx) => {
          if (ctx.selectedData) {
            const result = await this.execute({
              data: ctx.selectedData,
              metadata: { algorithmId: 'crc16-modbus', validateMode: false }
            });
            ctx.emit('tool-result', result);
          }
        }
      }
    ];
  }

  getContextMenuItems(data: any, context: ToolContext): ContextMenuItem[] {
    return [
      {
        id: 'calc-crc16',
        label: '计算 CRC-16',
        icon: Calculator,
        handler: async (inputData) => {
          const result = await this.execute({
            data: inputData,
            metadata: { algorithmId: 'crc16-ccitt', validateMode: false }
          });
          context.emit('tool-result', result);
        }
      },
      {
        id: 'validate-crc',
        label: '验证 CRC',
        icon: Calculator,
        handler: async (inputData) => {
          const result = await this.execute({
            data: inputData,
            metadata: { algorithmId: 'crc16-modbus', validateMode: true }
          });
          context.emit('tool-result', result);
        }
      }
    ];
  }

  // Helper methods
  private calculateCRC(data: Uint8Array, algorithm: CRCAlgorithm): CRCResult {
    let crc = algorithm.initialValue;
    const polynomial = algorithm.polynomial;
    const width = algorithm.width;
    const topBit = 1 << (width - 1);
    const mask = (1 << width) - 1;

    // Process each byte
    for (let i = 0; i < data.length; i++) {
      let byte = data[i];
      
      // Reflect input byte if required
      if (algorithm.reflectInput) {
        byte = this.reflectByte(byte);
      }

      // XOR byte into CRC
      if (width === 8) {
        crc ^= byte;
      } else {
        crc ^= (byte << (width - 8));
      }

      // Process each bit
      for (let bit = 0; bit < 8; bit++) {
        if (crc & topBit) {
          crc = ((crc << 1) ^ polynomial) & mask;
        } else {
          crc = (crc << 1) & mask;
        }
      }
    }

    // Reflect output if required
    if (algorithm.reflectOutput) {
      crc = this.reflectValue(crc, width);
    }

    // Apply final XOR
    crc ^= algorithm.finalXor;
    crc &= mask;

    // Convert to bytes
    const crcBytes = new Uint8Array(width / 8);
    if (width === 8) {
      crcBytes[0] = crc;
    } else if (width === 16) {
      if (algorithm.reflectOutput) {
        crcBytes[0] = crc & 0xFF;
        crcBytes[1] = (crc >> 8) & 0xFF;
      } else {
        crcBytes[0] = (crc >> 8) & 0xFF;
        crcBytes[1] = crc & 0xFF;
      }
    } else if (width === 32) {
      const view = new DataView(crcBytes.buffer);
      view.setUint32(0, crc, algorithm.reflectOutput);
    }

    return {
      algorithm,
      inputData: data,
      crcValue: crc,
      crcHex: crc.toString(16).toUpperCase().padStart(width / 4, '0'),
      crcBytes
    };
  }

  private reflectByte(byte: number): number {
    let reflected = 0;
    for (let i = 0; i < 8; i++) {
      if (byte & (1 << i)) {
        reflected |= (1 << (7 - i));
      }
    }
    return reflected;
  }

  private reflectValue(value: number, width: number): number {
    let reflected = 0;
    for (let i = 0; i < width; i++) {
      if (value & (1 << i)) {
        reflected |= (1 << (width - 1 - i));
      }
    }
    return reflected;
  }
}

// UI Component
const CRCCalculatorUI: React.FC<{ tool: CRCCalculatorTool; context: ToolContext }> = ({ 
  tool, 
  context 
}) => {
  const [inputData, setInputData] = useState('');
  const [inputFormat, setInputFormat] = useState<DataFormat>('hex');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<CRCAlgorithm>(CRC_ALGORITHMS[1]);
  const [validateMode, setValidateMode] = useState(false);
  const [crcResult, setCrcResult] = useState<CRCResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (!inputData.trim()) {
      setError('请输入要计算CRC的数据');
      return;
    }

    // Validate input format
    if (!validateFormat[inputFormat](inputData)) {
      setError(`输入数据不是有效的 ${inputFormat.toUpperCase()} 格式`);
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const data = formatData.from[inputFormat](inputData);
      
      const result = await tool.execute({
        data,
        format: inputFormat,
        metadata: {
          algorithmId: selectedAlgorithm.id,
          validateMode
        }
      });

      if (result.error) {
        setError(result.error);
        setCrcResult(null);
      } else {
        setCrcResult(result.metadata?.crcResult);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算失败');
      setCrcResult(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    context.showNotification('已复制到剪贴板', 'success');
  };

  const handleReset = () => {
    setInputData('');
    setCrcResult(null);
    setError(null);
  };

  const renderResult = () => {
    if (!crcResult) return null;

    return (
      <div className="space-y-4">
        {/* Validation Result */}
        {validateMode && crcResult.expectedCrc !== undefined && (
          <div className={`p-3 rounded-md border ${
            crcResult.isValid 
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {crcResult.isValid ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="font-medium">
                {crcResult.isValid ? 'CRC 校验通过' : 'CRC 校验失败'}
              </span>
            </div>
            <div className="mt-2 text-sm">
              <div>计算值: 0x{crcResult.crcHex}</div>
              <div>期望值: 0x{crcResult.expectedCrc?.toString(16).toUpperCase().padStart(crcResult.algorithm.width / 4, '0')}</div>
            </div>
          </div>
        )}

        {/* CRC Result */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">计算结果</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-muted rounded-md">
              <div className="text-xs text-muted-foreground mb-1">CRC 值 (十六进制)</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg">0x{crcResult.crcHex}</span>
                <button
                  onClick={() => handleCopy(`0x${crcResult.crcHex}`)}
                  className="p-1 hover:bg-accent rounded-md transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-md">
              <div className="text-xs text-muted-foreground mb-1">CRC 值 (十进制)</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg">{crcResult.crcValue}</span>
                <button
                  onClick={() => handleCopy(crcResult.crcValue.toString())}
                  className="p-1 hover:bg-accent rounded-md transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <div className="text-xs text-muted-foreground mb-1">CRC 字节序列</div>
            <div className="flex items-center justify-between">
              <span className="font-mono">
                {Array.from(crcResult.crcBytes)
                  .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
                  .join(' ')}
              </span>
              <button
                onClick={() => handleCopy(
                  Array.from(crcResult.crcBytes)
                    .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
                    .join(' ')
                )}
                className="p-1 hover:bg-accent rounded-md transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Algorithm Info */}
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center space-x-1 mb-1">
            <Info className="w-3 h-3" />
            <span>算法信息</span>
          </div>
          <div className="pl-4 space-y-1">
            <div>多项式: 0x{crcResult.algorithm.polynomial.toString(16).toUpperCase()}</div>
            <div>初始值: 0x{crcResult.algorithm.initialValue.toString(16).toUpperCase()}</div>
            <div>最终异或: 0x{crcResult.algorithm.finalXor.toString(16).toUpperCase()}</div>
            <div>输入反转: {crcResult.algorithm.reflectInput ? '是' : '否'}</div>
            <div>输出反转: {crcResult.algorithm.reflectOutput ? '是' : '否'}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Algorithm Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">CRC 算法</label>
        <select
          value={selectedAlgorithm.id}
          onChange={(e) => {
            const algorithm = CRC_ALGORITHMS.find(alg => alg.id === e.target.value);
            if (algorithm) setSelectedAlgorithm(algorithm);
          }}
          className="w-full p-2 border border-border rounded-md bg-background"
        >
          {CRC_ALGORITHMS.map(algorithm => (
            <option key={algorithm.id} value={algorithm.id}>
              {algorithm.name} - {algorithm.description}
            </option>
          ))}
        </select>
        
        {selectedAlgorithm.example && (
          <div className="mt-1 text-xs text-muted-foreground">
            示例: {selectedAlgorithm.example}
          </div>
        )}
      </div>

      {/* Mode Selection */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id="calculate"
            name="mode"
            checked={!validateMode}
            onChange={() => setValidateMode(false)}
          />
          <label htmlFor="calculate" className="text-sm">计算 CRC</label>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id="validate"
            name="mode"
            checked={validateMode}
            onChange={() => setValidateMode(true)}
          />
          <label htmlFor="validate" className="text-sm">验证 CRC</label>
        </div>
      </div>

      {/* Input Data */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">
            {validateMode ? '包含CRC的完整数据' : '要计算CRC的数据'}
          </label>
          <select
            value={inputFormat}
            onChange={(e) => setInputFormat(e.target.value as DataFormat)}
            className="px-2 py-1 border border-border rounded-md bg-background text-xs"
          >
            {tool.supportedFormats.map(format => (
              <option key={format} value={format}>{format.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder={`输入 ${inputFormat.toUpperCase()} 格式的数据...`}
          className="w-full h-32 p-3 border border-border rounded-md bg-background font-mono text-sm resize-none"
        />
      </div>

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        disabled={isCalculating || !inputData.trim()}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Calculator className="w-4 h-4" />
        <span>{isCalculating ? '计算中...' : (validateMode ? '验证 CRC' : '计算 CRC')}</span>
      </button>

      {/* Error Display */}
      {error && (
        <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {renderResult()}

      {/* Actions */}
      {crcResult && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重置</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Export the tool class
export { CRCCalculatorTool };
export default CRCCalculatorTool;
