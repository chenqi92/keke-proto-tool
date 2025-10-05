import { DataFormat } from '@/types';

/**
 * Convert data between different formats
 */
export function convertData(
  data: Uint8Array,
  fromFormat: DataFormat,
  toFormat: DataFormat
): string {
  // First convert to bytes if needed
  let bytes: Uint8Array;
  
  if (fromFormat === 'hex') {
    bytes = data;
  } else {
    bytes = data;
  }

  // Then convert to target format
  switch (toFormat) {
    case 'hex':
      return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')
        .toUpperCase();

    case 'ascii':
      return Array.from(bytes)
        .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
        .join('');

    case 'utf8':
      try {
        return new TextDecoder('utf-8').decode(bytes);
      } catch {
        return Array.from(bytes)
          .map(b => String.fromCharCode(b))
          .join('');
      }

    case 'decimal':
      return Array.from(bytes)
        .map(b => b.toString(10).padStart(3, '0'))
        .join(' ');

    case 'binary':
      return Array.from(bytes)
        .map(b => b.toString(2).padStart(8, '0'))
        .join(' ');

    case 'octal':
      return Array.from(bytes)
        .map(b => b.toString(8).padStart(3, '0'))
        .join(' ');

    case 'base64':
      try {
        // Convert Uint8Array to base64
        const binary = String.fromCharCode(...bytes);
        return btoa(binary);
      } catch {
        return '';
      }

    case 'json':
      try {
        const text = new TextDecoder('utf-8').decode(bytes);
        const parsed = JSON.parse(text);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return new TextDecoder('utf-8').decode(bytes);
      }

    default:
      return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')
        .toUpperCase();
  }
}

/**
 * Parse string data to Uint8Array based on format
 */
export function parseData(data: string, format: DataFormat): Uint8Array {
  switch (format) {
    case 'hex': {
      const hex = data.replace(/\s+/g, '').replace(/^0x/i, '');
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
      return bytes;
    }

    case 'ascii':
    case 'utf8': {
      return new TextEncoder().encode(data);
    }

    case 'decimal': {
      const numbers = data.split(/\s+/).filter(s => s.length > 0);
      return new Uint8Array(numbers.map(n => parseInt(n, 10) & 0xFF));
    }

    case 'binary': {
      const bits = data.split(/\s+/).filter(s => s.length > 0);
      return new Uint8Array(bits.map(b => parseInt(b, 2) & 0xFF));
    }

    case 'octal': {
      const octals = data.split(/\s+/).filter(s => s.length > 0);
      return new Uint8Array(octals.map(o => parseInt(o, 8) & 0xFF));
    }

    case 'base64': {
      try {
        const binary = atob(data);
        return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)));
      } catch {
        return new Uint8Array(0);
      }
    }

    case 'json': {
      return new TextEncoder().encode(data);
    }

    default:
      return new Uint8Array(0);
  }
}

/**
 * Validate data format
 */
export function isValidFormat(data: string, format: DataFormat): boolean {
  try {
    parseData(data, format);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get format display name
 */
export function getFormatDisplayName(format: DataFormat): string {
  const names: Record<DataFormat, string> = {
    hex: '十六进制',
    ascii: 'ASCII',
    utf8: 'UTF-8',
    decimal: '十进制',
    binary: '二进制',
    octal: '八进制',
    base64: 'Base64',
    json: 'JSON'
  };
  return names[format] || format;
}

