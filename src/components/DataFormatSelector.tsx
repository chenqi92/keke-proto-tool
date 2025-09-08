import React from 'react';
import { cn } from '@/utils';

export type DataFormat = 'ascii' | 'binary' | 'hex' | 'base64' | 'json';

interface DataFormatSelectorProps {
  value: DataFormat;
  onChange: (format: DataFormat) => void;
  className?: string;
  size?: 'sm' | 'md';
}

const formatOptions: { value: DataFormat; label: string; description: string }[] = [
  { value: 'ascii', label: 'ASCII', description: '纯文本格式' },
  { value: 'binary', label: 'Binary', description: '二进制格式' },
  { value: 'hex', label: 'Hex', description: '十六进制格式' },
  { value: 'base64', label: 'Base64', description: 'Base64编码' },
  { value: 'json', label: 'JSON', description: 'JSON格式' }
];

export const DataFormatSelector: React.FC<DataFormatSelectorProps> = ({
  value,
  onChange,
  className,
  size = 'md'
}) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DataFormat)}
      className={cn(
        "bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
        className
      )}
    >
      {formatOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

// 数据格式转换工具函数
export const formatData = {
  // 将数据转换为指定格式
  to: {
    ascii: (data: Uint8Array): string => {
      return new TextDecoder().decode(data);
    },
    
    binary: (data: Uint8Array): string => {
      return Array.from(data)
        .map(byte => byte.toString(2).padStart(8, '0'))
        .join(' ');
    },
    
    hex: (data: Uint8Array): string => {
      return Array.from(data)
        .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
    },
    
    base64: (data: Uint8Array): string => {
      return btoa(String.fromCharCode(...data));
    },
    
    json: (data: Uint8Array): string => {
      try {
        const text = new TextDecoder().decode(data);
        const parsed = JSON.parse(text);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return new TextDecoder().decode(data);
      }
    }
  },
  
  // 将字符串转换为Uint8Array
  from: {
    ascii: (text: string): Uint8Array => {
      return new TextEncoder().encode(text);
    },
    
    binary: (text: string): Uint8Array => {
      const bytes = text.split(/\s+/)
        .filter(bit => bit.length > 0)
        .map(bit => parseInt(bit, 2));
      return new Uint8Array(bytes);
    },
    
    hex: (text: string): Uint8Array => {
      const hex = text.replace(/\s+/g, '');
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
      }
      return new Uint8Array(bytes);
    },
    
    base64: (text: string): Uint8Array => {
      const binary = atob(text);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    },
    
    json: (text: string): Uint8Array => {
      return new TextEncoder().encode(text);
    }
  }
};

// 验证数据格式
export const validateFormat = {
  ascii: (text: string): boolean => {
    return true; // ASCII总是有效的
  },
  
  binary: (text: string): boolean => {
    const bits = text.split(/\s+/).filter(bit => bit.length > 0);
    return bits.every(bit => /^[01]+$/.test(bit) && bit.length <= 8);
  },
  
  hex: (text: string): boolean => {
    const hex = text.replace(/\s+/g, '');
    return /^[0-9A-Fa-f]*$/.test(hex) && hex.length % 2 === 0;
  },
  
  base64: (text: string): boolean => {
    try {
      return btoa(atob(text)) === text;
    } catch {
      return false;
    }
  },
  
  json: (text: string): boolean => {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }
};
