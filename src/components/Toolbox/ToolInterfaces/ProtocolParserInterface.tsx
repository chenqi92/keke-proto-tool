import React, { useState } from 'react';
import { cn } from '@/utils';
import { Play, RotateCcw, Download, Settings, Search, Eye, Upload } from 'lucide-react';
import { DataFormatSelector, DataFormat } from '@/components/DataFormatSelector';

interface ProtocolParserInterfaceProps {
  onExecute: (data: any) => void;
  isExecuting?: boolean;
}

interface ParsedField {
  name: string;
  value: string;
  offset: number;
  length: number;
  description: string;
}

export const ProtocolParserInterface: React.FC<ProtocolParserInterfaceProps> = ({
  onExecute,
  isExecuting = false
}) => {
  const [inputData, setInputData] = useState('');
  const [inputFormat, setInputFormat] = useState<DataFormat>('hex');
  const [protocolType, setProtocolType] = useState('auto');
  const [parsedFields, setParsedFields] = useState<ParsedField[]>([]);
  const [selectedField, setSelectedField] = useState<number | null>(null);

  const protocolTypes = [
    { value: 'auto', label: '自动检测' },
    { value: 'tcp', label: 'TCP' },
    { value: 'udp', label: 'UDP' },
    { value: 'http', label: 'HTTP' },
    { value: 'modbus', label: 'Modbus' },
    { value: 'mqtt', label: 'MQTT' },
    { value: 'custom', label: '自定义' }
  ];

  const handleParse = () => {
    if (!inputData.trim()) return;

    // Simulate protocol parsing
    const mockFields: ParsedField[] = [
      { name: 'Version', value: '4', offset: 0, length: 4, description: 'IP版本号' },
      { name: 'Header Length', value: '5', offset: 4, length: 4, description: '头部长度' },
      { name: 'Type of Service', value: '0x00', offset: 8, length: 8, description: '服务类型' },
      { name: 'Total Length', value: '60', offset: 16, length: 16, description: '总长度' },
      { name: 'Identification', value: '0x1c46', offset: 32, length: 16, description: '标识符' },
      { name: 'Flags', value: '0x4000', offset: 48, length: 16, description: '标志位' },
      { name: 'TTL', value: '64', offset: 64, length: 8, description: '生存时间' },
      { name: 'Protocol', value: '6 (TCP)', offset: 72, length: 8, description: '协议类型' },
      { name: 'Header Checksum', value: '0xb1e6', offset: 80, length: 16, description: '头部校验和' },
      { name: 'Source IP', value: '172.16.0.1', offset: 96, length: 32, description: '源IP地址' },
      { name: 'Destination IP', value: '172.16.0.2', offset: 128, length: 32, description: '目标IP地址' }
    ];

    setParsedFields(mockFields);
    onExecute({ inputData, inputFormat, protocolType, parsedFields: mockFields });
  };

  const handleReset = () => {
    setInputData('');
    setParsedFields([]);
    setSelectedField(null);
  };

  const handleFieldClick = (index: number) => {
    setSelectedField(selectedField === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {/* Protocol Type Selection */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="text-xs font-semibold text-foreground mb-2 block">协议类型</label>
        <div className="flex flex-wrap gap-1">
          {protocolTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setProtocolType(type.value)}
              className={cn(
                "px-2 py-1 text-center rounded-md border transition-all text-xs font-medium whitespace-nowrap",
                protocolType === type.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-accent-foreground hover:bg-accent"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-foreground">协议数据</label>
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
          placeholder="输入要解析的协议数据..."
          className="w-full h-24 p-3 border border-border rounded-md bg-background font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {inputData && (
          <div className="mt-1 text-xs text-muted-foreground">
            数据长度: {inputData.length} 字符
          </div>
        )}
      </div>

      {/* Parsed Fields */}
      {parsedFields.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground">解析结果</label>
            <div className="flex items-center space-x-1">
              <button
                className="p-1 hover:bg-accent rounded-md transition-colors"
                title="查看原始数据"
              >
                <Eye className="w-3 h-3" />
              </button>
              <button
                className="p-1 hover:bg-accent rounded-md transition-colors"
                title="导出结果"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {parsedFields.map((field, index) => (
              <div
                key={index}
                onClick={() => handleFieldClick(index)}
                className={cn(
                  "p-2 border rounded-md cursor-pointer transition-all",
                  selectedField === index
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-accent-foreground hover:bg-accent"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-xs">{field.name}</span>
                      <span className="text-xs text-primary font-mono">{field.value}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      偏移: {field.offset} | 长度: {field.length} bits
                    </div>
                  </div>
                  <Search className="w-3 h-3 text-muted-foreground" />
                </div>

                {selectedField === index && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                    <div className="mt-1 p-2 bg-background rounded text-xs font-mono">
                      位置: {field.offset}-{field.offset + field.length - 1} |
                      十六进制: {field.value} |
                      十进制: {parseInt(field.value.replace('0x', ''), 16) || field.value}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            共解析出 {parsedFields.length} 个字段
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

        <button
          onClick={handleParse}
          disabled={isExecuting || !inputData.trim()}
          className={cn(
            "flex items-center space-x-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all font-medium text-xs",
            (isExecuting || !inputData.trim()) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Search className="w-3 h-3" />
          <span>{isExecuting ? '解析中...' : '解析协议'}</span>
        </button>
      </div>
    </div>
  );
};
