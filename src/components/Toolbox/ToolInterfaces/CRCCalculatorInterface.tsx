import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { Play, RotateCcw, Download, Settings, Calculator, Copy, Upload } from 'lucide-react';
import { DataFormatSelector, DataFormat } from '@/components/DataFormatSelector';

interface CRCCalculatorInterfaceProps {
  onExecute: (data: any) => void;
  isExecuting?: boolean;
}

export const CRCCalculatorInterface: React.FC<CRCCalculatorInterfaceProps> = ({
  onExecute,
  isExecuting = false
}) => {
  const [inputData, setInputData] = useState('');
  const [inputFormat, setInputFormat] = useState<DataFormat>('ascii');
  const [crcType, setCrcType] = useState('CRC16');
  const [polynomial, setPolynomial] = useState('0x8005');
  const [initialValue, setInitialValue] = useState('0x0000');
  const [finalXor, setFinalXor] = useState('0x0000');
  const [reflectInput, setReflectInput] = useState(true);
  const [reflectOutput, setReflectOutput] = useState(true);
  const [result, setResult] = useState<string>('');
  const [autoCalculate, setAutoCalculate] = useState(true);

  const crcPresets = {
    'CRC8': { poly: '0x07', init: '0x00', xor: '0x00', refIn: false, refOut: false },
    'CRC16': { poly: '0x8005', init: '0x0000', xor: '0x0000', refIn: true, refOut: true },
    'CRC16_CCITT': { poly: '0x1021', init: '0xFFFF', xor: '0x0000', refIn: false, refOut: false },
    'CRC16_MODBUS': { poly: '0x8005', init: '0xFFFF', xor: '0x0000', refIn: true, refOut: true },
    'CRC32': { poly: '0x04C11DB7', init: '0xFFFFFFFF', xor: '0xFFFFFFFF', refIn: true, refOut: true },
    'CRC32_MPEG2': { poly: '0x04C11DB7', init: '0xFFFFFFFF', xor: '0x00000000', refIn: false, refOut: false }
  };

  useEffect(() => {
    if (autoCalculate && inputData.trim()) {
      handleCalculate();
    }
  }, [inputData, crcType, polynomial, initialValue, finalXor, reflectInput, reflectOutput, autoCalculate]);

  const handleCrcTypeChange = (type: string) => {
    setCrcType(type);
    const preset = crcPresets[type as keyof typeof crcPresets];
    if (preset) {
      setPolynomial(preset.poly);
      setInitialValue(preset.init);
      setFinalXor(preset.xor);
      setReflectInput(preset.refIn);
      setReflectOutput(preset.refOut);
    }
  };

  const handleCalculate = () => {
    if (!inputData.trim()) return;

    // Simulate CRC calculation
    const mockCrc = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    const calculatedResult = `0x${mockCrc}`;
    
    setResult(calculatedResult);
    onExecute({
      inputData,
      inputFormat,
      crcType,
      polynomial,
      initialValue,
      finalXor,
      reflectInput,
      reflectOutput,
      result: calculatedResult
    });
  };

  const handleReset = () => {
    setInputData('');
    setResult('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div className="space-y-4">
      {/* CRC Type Selection */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="text-xs font-semibold text-foreground mb-2 block">CRC 类型</label>
        <div className="flex flex-wrap gap-1">
          {Object.keys(crcPresets).map(type => (
            <button
              key={type}
              onClick={() => handleCrcTypeChange(type)}
              className={cn(
                "px-2 py-1 text-center rounded-md border transition-all text-xs font-medium whitespace-nowrap",
                crcType === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-accent-foreground hover:bg-accent"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* CRC Parameters */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="text-xs font-semibold text-foreground mb-2 block">CRC 参数</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">多项式</label>
            <input
              type="text"
              value={polynomial}
              onChange={(e) => setPolynomial(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-background font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">初始值</label>
            <input
              type="text"
              value={initialValue}
              onChange={(e) => setInitialValue(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-background font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">最终异或值</label>
            <input
              type="text"
              value={finalXor}
              onChange={(e) => setFinalXor(e.target.value)}
              className="w-full p-2 border border-border rounded-md bg-background font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">输入反射</label>
              <button
                onClick={() => setReflectInput(!reflectInput)}
                className={cn(
                  "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
                  reflectInput ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform",
                    reflectInput ? "translate-x-3.5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">输出反射</label>
              <button
                onClick={() => setReflectOutput(!reflectOutput)}
                className={cn(
                  "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
                  reflectOutput ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform",
                    reflectOutput ? "translate-x-3.5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auto Calculate Toggle */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold text-foreground">自动计算</label>
            <p className="text-xs text-muted-foreground leading-tight">输入时自动计算</p>
          </div>
          <button
            onClick={() => setAutoCalculate(!autoCalculate)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              autoCalculate ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                autoCalculate ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-foreground">输入数据</label>
          <div className="flex items-center space-x-1">
            <DataFormatSelector
              value={inputFormat}
              onChange={setInputFormat}
              size="sm"
            />
            <button
              className="p-1 hover:bg-accent rounded-md transition-colors"
              title="导入数据"
            >
              <Upload className="w-3 h-3" />
            </button>
          </div>
        </div>
        <textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="输入要计算CRC的数据..."
          className="w-full h-24 p-3 border border-border rounded-md bg-background font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {inputData && (
          <div className="mt-1 text-xs text-muted-foreground">
            数据长度: {inputData.length} 字符 | {new TextEncoder().encode(inputData).length} 字节
          </div>
        )}
      </div>

      {/* Result Section */}
      {result && (
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground">CRC 结果</label>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-accent rounded-md transition-colors"
                title="复制结果"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                className="p-1 hover:bg-accent rounded-md transition-colors"
                title="导出结果"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="p-3 bg-background border border-border rounded-md">
            <div className="font-mono text-base font-semibold text-primary">{result}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              十进制: {parseInt(result.replace('0x', ''), 16)} |
              二进制: {parseInt(result.replace('0x', ''), 16).toString(2).padStart(16, '0')}
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1 px-3 py-1.5 border border-border rounded-md hover:bg-accent transition-colors text-xs font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>重置</span>
          </button>

          <button
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            title="工具设置"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>

        {!autoCalculate && (
          <button
            onClick={handleCalculate}
            disabled={isExecuting || !inputData.trim()}
            className={cn(
              "flex items-center space-x-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all font-medium text-xs",
              (isExecuting || !inputData.trim()) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Calculator className="w-3 h-3" />
            <span>{isExecuting ? '计算中...' : '计算CRC'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
