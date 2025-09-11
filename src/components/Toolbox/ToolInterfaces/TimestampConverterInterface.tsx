import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { Play, RotateCcw, Download, Settings, Clock, Copy, Calendar } from 'lucide-react';

interface TimestampConverterInterfaceProps {
  onExecute: (data: any) => void;
  isExecuting?: boolean;
}

export const TimestampConverterInterface: React.FC<TimestampConverterInterfaceProps> = ({
  onExecute,
  isExecuting = false
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [inputTimestamp, setInputTimestamp] = useState('');
  const [inputType, setInputType] = useState('unix');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [results, setResults] = useState<Record<string, string>>({});
  const [autoUpdate, setAutoUpdate] = useState(true);

  const timestampTypes = [
    { value: 'unix', label: 'Unix 时间戳 (秒)' },
    { value: 'unix_ms', label: 'Unix 时间戳 (毫秒)' },
    { value: 'iso', label: 'ISO 8601' },
    { value: 'rfc', label: 'RFC 2822' },
    { value: 'custom', label: '自定义格式' }
  ];

  const timezones = [
    'Asia/Shanghai',
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (autoUpdate) {
      handleConvert();
    }
  }, [inputTimestamp, inputType, timezone, autoUpdate]);

  const handleConvert = () => {
    if (!inputTimestamp.trim()) {
      // Show current time conversions
      const now = currentTime;
      setResults({
        unix: Math.floor(now.getTime() / 1000).toString(),
        unix_ms: now.getTime().toString(),
        iso: now.toISOString(),
        rfc: now.toUTCString(),
        local: now.toLocaleString('zh-CN', { timeZone: timezone }),
        readable: now.toLocaleString('zh-CN', { 
          timeZone: timezone,
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          weekday: 'long'
        })
      });
      return;
    }

    try {
      let date: Date;
      
      if (inputType === 'unix') {
        date = new Date(parseInt(inputTimestamp) * 1000);
      } else if (inputType === 'unix_ms') {
        date = new Date(parseInt(inputTimestamp));
      } else {
        date = new Date(inputTimestamp);
      }

      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp');
      }

      const convertedResults = {
        unix: Math.floor(date.getTime() / 1000).toString(),
        unix_ms: date.getTime().toString(),
        iso: date.toISOString(),
        rfc: date.toUTCString(),
        local: date.toLocaleString('zh-CN', { timeZone: timezone }),
        readable: date.toLocaleString('zh-CN', { 
          timeZone: timezone,
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          weekday: 'long'
        })
      };

      setResults(convertedResults);
      onExecute({ inputTimestamp, inputType, timezone, results: convertedResults });
    } catch (error) {
      setResults({ error: '时间戳格式错误' });
    }
  };

  const handleReset = () => {
    setInputTimestamp('');
    setResults({});
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  const handleUseCurrentTime = () => {
    const now = currentTime;
    if (inputType === 'unix') {
      setInputTimestamp(Math.floor(now.getTime() / 1000).toString());
    } else if (inputType === 'unix_ms') {
      setInputTimestamp(now.getTime().toString());
    } else if (inputType === 'iso') {
      setInputTimestamp(now.toISOString());
    } else {
      setInputTimestamp(now.toString());
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Time Display */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4 text-primary" />
            <label className="text-xs font-semibold text-foreground">当前时间</label>
          </div>
          <button
            onClick={handleUseCurrentTime}
            className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            使用
          </button>
        </div>
        <div className="text-lg font-mono font-bold text-primary">
          {currentTime.toLocaleString('zh-CN', { timeZone: timezone })}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Unix: {Math.floor(currentTime.getTime() / 1000)} |
          毫秒: {currentTime.getTime()}
        </div>
      </div>

      {/* Input Type Selection */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="text-xs font-semibold text-foreground mb-2 block">输入类型</label>
        <div className="flex flex-wrap gap-1">
          {timestampTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setInputType(type.value)}
              className={cn(
                "px-2 py-1 text-center rounded-md border transition-all text-xs font-medium whitespace-nowrap",
                inputType === type.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-accent-foreground hover:bg-accent"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timezone and Auto Update */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <label className="text-xs font-semibold text-foreground mb-2 block">时区</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full p-2 border border-border rounded-md bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {timezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-foreground">自动转换</label>
              <p className="text-xs text-muted-foreground leading-tight">输入时自动转换</p>
            </div>
            <button
              onClick={() => setAutoUpdate(!autoUpdate)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                autoUpdate ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                  autoUpdate ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-foreground">时间戳输入</label>
          <button
            className="p-1 hover:bg-accent rounded-md transition-colors"
            title="选择日期"
          >
            <Calendar className="w-3 h-3" />
          </button>
        </div>
        <input
          type="text"
          value={inputTimestamp}
          onChange={(e) => setInputTimestamp(e.target.value)}
          placeholder={`输入${timestampTypes.find(t => t.value === inputType)?.label}...`}
          className="w-full p-3 border border-border rounded-md bg-background font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
      </div>

      {/* Results Section */}
      {Object.keys(results).length > 0 && (
        <div className="bg-muted/30 rounded-lg p-3">
          <label className="text-xs font-semibold text-foreground mb-2 block">转换结果</label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {results.error ? (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs">
                {results.error}
              </div>
            ) : (
              <>
                {[
                  { key: 'readable', label: '可读格式', value: results.readable },
                  { key: 'unix', label: 'Unix 时间戳', value: results.unix },
                  { key: 'unix_ms', label: 'Unix 毫秒', value: results.unix_ms },
                  { key: 'iso', label: 'ISO 8601', value: results.iso },
                  { key: 'rfc', label: 'RFC 2822', value: results.rfc },
                  { key: 'local', label: '本地时间', value: results.local }
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-2 bg-background border border-border rounded-md">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-0.5">{item.label}</div>
                      <div className="font-mono text-xs truncate">{item.value}</div>
                    </div>
                    <button
                      onClick={() => handleCopy(item.value)}
                      className="p-1 hover:bg-accent rounded-md transition-colors ml-2"
                      title="复制"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </>
            )}
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

        {!autoUpdate && (
          <button
            onClick={handleConvert}
            disabled={isExecuting}
            className={cn(
              "flex items-center space-x-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all font-medium text-xs",
              isExecuting && "opacity-50 cursor-not-allowed"
            )}
          >
            <Clock className="w-3 h-3" />
            <span>{isExecuting ? '转换中...' : '转换时间'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
