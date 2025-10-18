import React, { useState } from 'react';
import { cn } from '@/utils';
import { 
  Key, 
  RefreshCw, 
  Copy, 
  RotateCcw,
  Clock,
  Hash,
  FileJson,
  Sparkles
} from 'lucide-react';

interface SignatureGeneratorInterfaceProps {
  onExecute: (data: any) => void;
  isExecuting?: boolean;
}

// MD5 implementation (lightweight)
function md5(str: string): string {
  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
  }

  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function md5cycle(x: number[], k: number[]): void {
    let a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = addUnsigned(a, x[0]);
    x[1] = addUnsigned(b, x[1]);
    x[2] = addUnsigned(c, x[2]);
    x[3] = addUnsigned(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    a = addUnsigned(addUnsigned(a, q), addUnsigned(x, t));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  function md5blk(s: string): number[] {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  function rhex(n: number): string {
    let s = '';
    for (let j = 0; j < 4; j++) {
      s += ('0' + ((n >> (j * 8 + 4)) & 0x0F).toString(16)).slice(-1) +
        ('0' + ((n >> (j * 8)) & 0x0F).toString(16)).slice(-1);
    }
    return s;
  }

  function str2blks(str: string): number[] {
    const nblk = ((str.length + 8) >> 6) + 1;
    const blks: number[] = new Array(nblk * 16);
    for (let i = 0; i < nblk * 16; i++) blks[i] = 0;
    for (let i = 0; i < str.length; i++) {
      blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    }
    blks[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
    blks[nblk * 16 - 2] = str.length * 8;
    return blks;
  }

  const x = str2blks(str);
  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    md5cycle([a, b, c, d], x.slice(i, i + 16));

    a = addUnsigned(a, olda);
    b = addUnsigned(b, oldb);
    c = addUnsigned(c, oldc);
    d = addUnsigned(d, oldd);
  }

  return rhex(a) + rhex(b) + rhex(c) + rhex(d);
}

// UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generate random request body based on Python example
function generateRandomRequestBody() {
  const eventTypes = ['spyCam', 'intrusion', 'fire', 'theft', 'vandalism'];
  const locations = [
    '双口村东南约196米',
    '北门入口处',
    '停车场A区',
    '办公楼3层',
    '仓库后门'
  ];
  const srcNames = [
    '拍照行为预警7号门',
    '入侵检测摄像头',
    '烟雾传感器',
    '门禁系统',
    '周界报警器'
  ];

  return {
    eventId: generateUUID(),
    eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    eventTime: Date.now(),
    srcId: generateUUID().replace(/-/g, ''),
    srcName: srcNames[Math.floor(Math.random() * srcNames.length)],
    reportLocation: locations[Math.floor(Math.random() * locations.length)],
    temperature: (20 + Math.random() * 15).toFixed(1),
    categoryType: eventTypes[Math.floor(Math.random() * eventTypes.length)]
  };
}

interface SignatureResult {
  appId: string;
  timestamp: number;
  signature: string;
}

export const SignatureGeneratorInterface: React.FC<SignatureGeneratorInterfaceProps> = ({
  onExecute,
  isExecuting = false
}) => {
  const [secretKey, setSecretKey] = useState('your-secret-key-here');
  const [appId, setAppId] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [signatureResult, setSignatureResult] = useState<SignatureResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAppId = () => {
    setAppId(generateUUID());
  };

  const handleGenerateTimestamp = () => {
    setTimestamp(Date.now().toString());
  };

  const handleGenerateRandomBody = () => {
    const randomBody = generateRandomRequestBody();
    setRequestBody(JSON.stringify(randomBody, null, 2));
  };

  // Convert JavaScript object literal to JSON
  const convertToJSON = (input: string): string => {
    try {
      // First try to parse as JSON
      JSON.parse(input);
      return input;
    } catch (e) {
      // If failed, try to evaluate as JavaScript object literal
      try {
        // Use Function constructor to safely evaluate the object literal
        // This is safer than eval() as it doesn't have access to local scope
        const func = new Function(`return ${input}`);
        const obj = func();

        // Convert to JSON string
        return JSON.stringify(obj);
      } catch (conversionError) {
        throw new Error('请求体格式错误，请使用标准 JSON 格式（属性名需要双引号）或 JavaScript 对象字面量格式');
      }
    }
  };

  const handleGenerate = async () => {
    if (!secretKey.trim()) {
      setError('请输入 Secret Key');
      return;
    }

    if (!appId.trim()) {
      setError('请输入或生成 App ID');
      return;
    }

    if (!timestamp.trim()) {
      setError('请输入或生成时间戳');
      return;
    }

    if (!requestBody.trim()) {
      setError('请求体不能为空');
      return;
    }

    setError(null);

    try {
      // Convert to JSON if needed
      const jsonBody = convertToJSON(requestBody);

      // Compact JSON (no spaces)
      const compactBody = JSON.stringify(JSON.parse(jsonBody));

      // Generate signature: MD5(secretKey + timestamp + requestBody)
      const signContent = `${secretKey}${timestamp}${compactBody}`;
      const signature = md5(signContent);

      const result: SignatureResult = {
        appId,
        timestamp: parseInt(timestamp),
        signature
      };

      setSignatureResult(result);
      onExecute(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求体格式错误，请使用 JSON 格式或 JavaScript 对象字面量格式');
      setSignatureResult(null);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    // Show notification (would need context for this)
    console.log(`${label}已复制`);
  };

  const handleCopyAll = async () => {
    if (!signatureResult) return;
    
    const allText = `App ID: ${signatureResult.appId}
Timestamp: ${signatureResult.timestamp}
Signature: ${signatureResult.signature}`;
    
    await navigator.clipboard.writeText(allText);
    console.log('所有信息已复制');
  };

  const handleReset = () => {
    setSecretKey('your-secret-key-here');
    setAppId('');
    setTimestamp('');
    setRequestBody('');
    setSignatureResult(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Secret Key */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="block text-xs font-semibold mb-2">
          <Key className="w-3 h-3 inline mr-1" />
          Secret Key
        </label>
        <input
          type="text"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="输入密钥..."
          className="w-full p-2 border border-border rounded-md bg-background font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* App ID */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="block text-xs font-semibold mb-2">App ID</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="输入或生成 App ID..."
            className="flex-1 p-2 border border-border rounded-md bg-background font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            onClick={handleGenerateAppId}
            className="flex items-center space-x-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors text-xs font-medium"
            title="生成 UUID"
          >
            <RefreshCw className="w-3 h-3" />
            <span>生成</span>
          </button>
        </div>
      </div>

      {/* Timestamp */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="block text-xs font-semibold mb-2">
          <Clock className="w-3 h-3 inline mr-1" />
          时间戳 (毫秒)
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            placeholder="输入或生成时间戳..."
            className="flex-1 p-2 border border-border rounded-md bg-background font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            onClick={handleGenerateTimestamp}
            className="flex items-center space-x-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors text-xs font-medium"
            title="生成当前时间戳"
          >
            <RefreshCw className="w-3 h-3" />
            <span>生成</span>
          </button>
        </div>
        {timestamp && (
          <div className="mt-1.5 text-xs text-muted-foreground">
            {new Date(parseInt(timestamp)).toLocaleString('zh-CN')}
          </div>
        )}
      </div>

      {/* Request Body */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold">
            <FileJson className="w-3 h-3 inline mr-1" />
            请求体 (JSON)
          </label>
          <button
            onClick={handleGenerateRandomBody}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors font-medium"
          >
            <Sparkles className="w-3 h-3" />
            <span>生成示例</span>
          </button>
        </div>
        <textarea
          value={requestBody}
          onChange={(e) => setRequestBody(e.target.value)}
          placeholder="输入 JSON 格式的请求体或点击生成示例..."
          className="w-full h-32 p-2 border border-border rounded-md bg-background font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isExecuting}
        className="w-full flex items-center justify-center space-x-1 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-xs font-medium"
      >
        <Hash className="w-3 h-3" />
        <span>{isExecuting ? '生成中...' : '生成签名'}</span>
      </button>

      {/* Error Display */}
      {error && (
        <div className="p-2 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 text-red-700 dark:text-red-400 rounded-md text-xs">
          {error}
        </div>
      )}

      {/* Result */}
      {signatureResult && (
        <div className="space-y-2 bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold">生成结果</h4>
            <button
              onClick={handleCopyAll}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>复制全部</span>
            </button>
          </div>

          {/* App ID */}
          <div className="p-2 bg-background border border-border rounded-md">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-medium text-muted-foreground">App ID</div>
              <button
                onClick={() => handleCopy(signatureResult.appId, 'App ID')}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="font-mono text-xs break-all">{signatureResult.appId}</div>
          </div>

          {/* Timestamp */}
          <div className="p-2 bg-background border border-border rounded-md">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-medium text-muted-foreground">时间戳</div>
              <button
                onClick={() => handleCopy(signatureResult.timestamp.toString(), '时间戳')}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="font-mono text-xs">{signatureResult.timestamp}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {new Date(signatureResult.timestamp).toLocaleString('zh-CN')}
            </div>
          </div>

          {/* Signature */}
          <div className="p-2 bg-primary/10 border border-primary/20 rounded-md">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-primary">签名 (MD5)</div>
              <button
                onClick={() => handleCopy(signatureResult.signature, '签名')}
                className="p-1 hover:bg-primary/20 rounded transition-colors"
              >
                <Copy className="w-3 h-3 text-primary" />
              </button>
            </div>
            <div className="font-mono text-xs break-all font-semibold text-primary">{signatureResult.signature}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      {signatureResult && (
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1 px-2 py-1 border border-border rounded-md hover:bg-accent transition-colors text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span>重置</span>
          </button>
        </div>
      )}
    </div>
  );
};

