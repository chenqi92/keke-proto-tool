import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/utils';

interface HexEditorProps {
  data: Uint8Array;
  readOnly?: boolean;
  onDataChange?: (data: Uint8Array) => void;
  highlightRange?: { start: number; end: number };
  className?: string;
}

interface Selection {
  start: number;
  end: number;
}

export const HexEditor: React.FC<HexEditorProps> = ({
  data,
  readOnly = false,
  onDataChange: _onDataChange,
  highlightRange,
  className
}) => {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [viewOffset, setViewOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const bytesPerRow = 16;

  const totalRows = Math.ceil(data.length / bytesPerRow);
  const visibleRows = 20; // 可见行数

  // 格式化字节为十六进制字符串
  const formatByte = (byte: number): string => {
    return byte.toString(16).padStart(2, '0').toUpperCase();
  };

  // 将字节转换为可打印字符
  const byteToChar = (byte: number): string => {
    return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
  };

  // 计算可见数据范围
  const visibleData = useMemo(() => {
    const startByte = viewOffset * bytesPerRow;
    const endByte = Math.min(startByte + visibleRows * bytesPerRow, data.length);
    return data.slice(startByte, endByte);
  }, [data, viewOffset, visibleRows, bytesPerRow]);

  // 处理字节点击
  const handleByteClick = (byteIndex: number) => {
    if (readOnly) return;
    
    const absoluteIndex = viewOffset * bytesPerRow + byteIndex;
    setSelection({ start: absoluteIndex, end: absoluteIndex });
  };

  // 处理字节范围选择
  const handleByteMouseDown = (byteIndex: number) => {
    if (readOnly) return;
    
    const absoluteIndex = viewOffset * bytesPerRow + byteIndex;
    setSelection({ start: absoluteIndex, end: absoluteIndex });
  };

  const handleByteMouseMove = (byteIndex: number) => {
    if (readOnly || !selection) return;
    
    const absoluteIndex = viewOffset * bytesPerRow + byteIndex;
    setSelection(prev => prev ? { ...prev, end: absoluteIndex } : null);
  };

  // 处理滚动
  const handleScroll = (direction: 'up' | 'down') => {
    if (direction === 'up' && viewOffset > 0) {
      setViewOffset(viewOffset - 1);
    } else if (direction === 'down' && viewOffset < totalRows - visibleRows) {
      setViewOffset(viewOffset + 1);
    }
  };

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleScroll('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleScroll('down');
          break;
        case 'PageUp':
          e.preventDefault();
          setViewOffset(Math.max(0, viewOffset - visibleRows));
          break;
        case 'PageDown':
          e.preventDefault();
          setViewOffset(Math.min(totalRows - visibleRows, viewOffset + visibleRows));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewOffset, totalRows, visibleRows]);

  // 渲染地址列
  const renderAddresses = () => {
    const addresses = [];
    for (let i = 0; i < Math.min(visibleRows, totalRows - viewOffset); i++) {
      const address = (viewOffset + i) * bytesPerRow;
      addresses.push(
        <div key={i} className="h-5 flex items-center text-xs text-muted-foreground font-mono">
          {address.toString(16).padStart(8, '0').toUpperCase()}
        </div>
      );
    }
    return addresses;
  };

  // 渲染十六进制数据
  const renderHexData = () => {
    const rows = [];
    for (let row = 0; row < Math.min(visibleRows, totalRows - viewOffset); row++) {
      const rowBytes = [];
      for (let col = 0; col < bytesPerRow; col++) {
        const byteIndex = row * bytesPerRow + col;
        const absoluteIndex = viewOffset * bytesPerRow + byteIndex;
        
        if (byteIndex < visibleData.length) {
          const byte = visibleData[byteIndex];
          const isSelected = selection && 
            absoluteIndex >= Math.min(selection.start, selection.end) &&
            absoluteIndex <= Math.max(selection.start, selection.end);
          const isHighlighted = highlightRange &&
            absoluteIndex >= highlightRange.start &&
            absoluteIndex <= highlightRange.end;

          rowBytes.push(
            <span
              key={col}
              className={cn(
                "inline-block w-6 h-5 text-center text-xs font-mono cursor-auto hover:bg-accent rounded",
                isSelected && "bg-primary text-primary-foreground",
                isHighlighted && !isSelected && "bg-yellow-200 dark:bg-yellow-800"
              )}
              onClick={() => handleByteClick(byteIndex)}
              onMouseDown={() => handleByteMouseDown(byteIndex)}
              onMouseMove={() => handleByteMouseMove(byteIndex)}
            >
              {formatByte(byte)}
            </span>
          );
        } else {
          rowBytes.push(
            <span key={col} className="inline-block w-6 h-5" />
          );
        }
      }
      
      rows.push(
        <div key={row} className="h-5 flex items-center space-x-1">
          {rowBytes}
        </div>
      );
    }
    return rows;
  };

  // 渲染ASCII数据
  const renderAsciiData = () => {
    const rows = [];
    for (let row = 0; row < Math.min(visibleRows, totalRows - viewOffset); row++) {
      const rowChars = [];
      for (let col = 0; col < bytesPerRow; col++) {
        const byteIndex = row * bytesPerRow + col;
        const absoluteIndex = viewOffset * bytesPerRow + byteIndex;
        
        if (byteIndex < visibleData.length) {
          const byte = visibleData[byteIndex];
          const isSelected = selection && 
            absoluteIndex >= Math.min(selection.start, selection.end) &&
            absoluteIndex <= Math.max(selection.start, selection.end);
          const isHighlighted = highlightRange &&
            absoluteIndex >= highlightRange.start &&
            absoluteIndex <= highlightRange.end;

          rowChars.push(
            <span
              key={col}
              className={cn(
                "inline-block w-3 h-5 text-center text-xs font-mono cursor-auto hover:bg-accent",
                isSelected && "bg-primary text-primary-foreground",
                isHighlighted && !isSelected && "bg-yellow-200 dark:bg-yellow-800"
              )}
              onClick={() => handleByteClick(byteIndex)}
              onMouseDown={() => handleByteMouseDown(byteIndex)}
              onMouseMove={() => handleByteMouseMove(byteIndex)}
            >
              {byteToChar(byte)}
            </span>
          );
        } else {
          rowChars.push(
            <span key={col} className="inline-block w-3 h-5" />
          );
        }
      }
      
      rows.push(
        <div key={row} className="h-5 flex items-center">
          {rowChars}
        </div>
      );
    }
    return rows;
  };

  if (data.length === 0) {
    return (
      <div className={cn("h-full flex items-center justify-center text-muted-foreground", className)}>
        <div className="text-center">
          <div className="text-4xl mb-2">📄</div>
          <p>暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("h-full bg-background font-mono text-sm select-none", className)}
      tabIndex={0}
    >
      <div className="h-full flex overflow-hidden">
        {/* Address Column */}
        <div className="w-20 bg-muted/30 border-r border-border p-2 flex-shrink-0">
          <div className="space-y-0">
            {renderAddresses()}
          </div>
        </div>

        {/* Hex Data Column */}
        <div className="flex-1 p-2 overflow-hidden">
          <div className="space-y-0">
            {renderHexData()}
          </div>
        </div>

        {/* ASCII Column */}
        <div className="w-32 bg-muted/30 border-l border-border p-2 flex-shrink-0">
          <div className="space-y-0">
            {renderAsciiData()}
          </div>
        </div>
      </div>

      {/* Scrollbar */}
      {totalRows > visibleRows && (
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-muted/50">
          <div
            className="bg-accent rounded cursor-auto"
            style={{
              height: `${(visibleRows / totalRows) * 100}%`,
              top: `${(viewOffset / totalRows) * 100}%`,
              position: 'absolute',
              width: '100%'
            }}
          />
        </div>
      )}

      {/* Selection Info */}
      {selection && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md">
          选择: {Math.min(selection.start, selection.end).toString(16).toUpperCase()} - {Math.max(selection.start, selection.end).toString(16).toUpperCase()}
          ({Math.abs(selection.end - selection.start) + 1} 字节)
        </div>
      )}
    </div>
  );
};
