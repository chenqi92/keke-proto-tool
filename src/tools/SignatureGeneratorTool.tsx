import React, { useState } from 'react';
import { 
  BaseTool, 
  ToolInput, 
  ToolOutput, 
  ToolContext, 
  ToolAction, 
  ContextMenuItem 
} from '@/types/toolbox';
import { DataFormat } from '@/components/DataFormatSelector';
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
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  const utf8Encode = (str: string): string => {
    return unescape(encodeURIComponent(str));
  };

  const str2blks = (str: string): number[] => {
    const nblk = ((str.length + 8) >> 6) + 1;
    const blks: number[] = new Array(nblk * 16);
    for (let i = 0; i < nblk * 16; i++) blks[i] = 0;
    for (let i = 0; i < str.length; i++) {
      blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    }
    blks[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
    blks[nblk * 16 - 2] = str.length * 8;
    return blks;
  };

  const hex = (x: number): string => {
    let str = '';
    for (let i = 0; i < 4; i++) {
      str += '0123456789abcdef'.charAt((x >> (i * 8 + 4)) & 0x0F) +
             '0123456789abcdef'.charAt((x >> (i * 8)) & 0x0F);
    }
    return str;
  };

  const encodedStr = utf8Encode(str);
  const x = str2blks(encodedStr);
  const state = [1732584193, -271733879, -1732584194, 271733878];

  for (let i = 0; i < x.length; i += 16) {
    md5cycle(state, x.slice(i, i + 16));
  }

  return hex(state[0]) + hex(state[1]) + hex(state[2]) + hex(state[3]);
}

// Generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate random request body based on the example
function generateRandomRequestBody(): any {
  const eventId = generateUUID();
  const taskNo = Math.floor(Math.random() * 1000000000000000000).toString();
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  return {
    eventId,
    taskNo,
    gatewaySn: '8UUXN6Q00A0C4W',
    airfactSn: '1581F8HGX253S00A05LN',
    airfactName: '7号门机场',
    lon: '106.77468',
    lat: '29.737167',
    imgUrls: 'http://example.com/img1.jpg,http://example.com/img2.jpg',
    address: '双口村东南约196米',
    content: '疑似发现拍照，请及时处理',
    reportTime: timestamp,
    deviceId: '20',
    appId: 'spyCam',
    appName: '拍照行为预警7号门',
    taskId: '1961323314031104000',
    taskName: '拍照行为预警7号门',
    srcId: '13a8db1f8f8383e384efd56797c4dcd7',
    srcName: '拍照行为预警7号门',
    reportLocation: '双口村东南约196米',
    temperature: '25.5',
    categoryType: 'spyCam'
  };
}

interface SignatureResult {
  appId: string;
  timestamp: number;
  signature: string;
  requestBody: string;
  secretKey: string;
  signContent: string;
}

class SignatureGeneratorTool implements BaseTool {
  id = 'signature-generator';
  name = 'API签名生成器';
  description = 'AI事件上报接口签名生成工具，支持MD5签名算法';
  version = '1.0.0';
  category = 'utility' as const;
  icon = Key;
  author = 'ProtoTool';

  supportedFormats: DataFormat[] = ['ascii', 'json'];
  supportedProtocols = ['HTTP', 'WebSocket', 'Custom'] as const;
  requiresConnection = false;
  canProcessStreaming = false;

  defaultConfig = {
    secretKey: 'your-secret-key-here',
    autoGenerateAppId: true,
    autoGenerateTimestamp: true
  };

  async initialize(context: ToolContext): Promise<void> {
    console.log('Signature Generator initialized');
  }

  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      const { secretKey, appId, timestamp, requestBody } = input.metadata || {};
      
      if (!secretKey) {
        throw new Error('Secret key is required');
      }

      if (!requestBody) {
        throw new Error('Request body is required');
      }

      // Convert request body to JSON string (compact format)
      const requestBodyJson = typeof requestBody === 'string' 
        ? requestBody 
        : JSON.stringify(requestBody, null, 0);

      // Generate signature: MD5(secretKey + timestamp + requestBody)
      const signContent = `${secretKey}${timestamp}${requestBodyJson}`;
      const signature = md5(signContent);

      const result: SignatureResult = {
        appId,
        timestamp,
        signature,
        requestBody: requestBodyJson,
        secretKey,
        signContent
      };

      return {
        data: new TextEncoder().encode(signature),
        format: 'ascii',
        result: signature,
        metadata: {
          signatureResult: result
        }
      };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Signature generation failed'
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('Signature Generator cleaned up');
  }

  renderUI(container: HTMLElement, context: ToolContext): React.ReactElement {
    return <SignatureGeneratorUI tool={this} context={context} />;
  }

  getQuickActions(context: ToolContext): ToolAction[] {
    return [
      {
        id: 'generate-signature',
        label: '生成签名',
        icon: Key,
        shortcut: 'Ctrl+G',
        handler: async (ctx) => {
          ctx.emit('tool-action', { action: 'generate' });
        }
      }
    ];
  }

  getContextMenuItems(data: any, context: ToolContext): ContextMenuItem[] {
    return [];
  }
}

// UI Component
const SignatureGeneratorUI: React.FC<{ tool: SignatureGeneratorTool; context: ToolContext }> = ({
  tool,
  context
}) => {
  const [secretKey, setSecretKey] = useState('your-secret-key-here');
  const [appId, setAppId] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [signatureResult, setSignatureResult] = useState<SignatureResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
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
      setError('请输入或生成请求体');
      return;
    }

    // Validate JSON
    try {
      JSON.parse(requestBody);
    } catch (e) {
      setError('请求体不是有效的 JSON 格式');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Compact JSON (no spaces)
      const compactBody = JSON.stringify(JSON.parse(requestBody));

      const result = await tool.execute({
        data: new Uint8Array(),
        metadata: {
          secretKey,
          appId,
          timestamp: parseInt(timestamp),
          requestBody: compactBody
        }
      });

      if (result.error) {
        setError(result.error);
        setSignatureResult(null);
      } else {
        setSignatureResult(result.metadata?.signatureResult);
        setError(null);
        context.showNotification('签名生成成功', 'success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
      setSignatureResult(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    context.showNotification(`${label}已复制到剪贴板`, 'success');
  };

  const handleCopyAll = async () => {
    if (!signatureResult) return;

    const allText = `App ID: ${signatureResult.appId}
Timestamp: ${signatureResult.timestamp}
Signature: ${signatureResult.signature}`;

    await navigator.clipboard.writeText(allText);
    context.showNotification('所有信息已复制到剪贴板', 'success');
  };

  const handleReset = () => {
    setSecretKey('your-secret-key-here');
    setAppId('');
    setTimestamp('');
    setRequestBody('');
    setSignatureResult(null);
    setError(null);
  };

  const renderResult = () => {
    if (!signatureResult) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">生成结果</h4>
          <button
            onClick={handleCopyAll}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Copy className="w-3 h-3" />
            <span>复制全部</span>
          </button>
        </div>

        {/* App ID */}
        <div className="p-3 bg-muted rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground">App ID</div>
            <button
              onClick={() => handleCopy(signatureResult.appId, 'App ID')}
              className="p-1 hover:bg-accent rounded-md transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="font-mono text-sm break-all">{signatureResult.appId}</div>
        </div>

        {/* Timestamp */}
        <div className="p-3 bg-muted rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground">时间戳</div>
            <button
              onClick={() => handleCopy(signatureResult.timestamp.toString(), '时间戳')}
              className="p-1 hover:bg-accent rounded-md transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="font-mono text-sm">{signatureResult.timestamp}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(signatureResult.timestamp).toLocaleString('zh-CN')}
          </div>
        </div>

        {/* Signature */}
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium">签名 (MD5)</div>
            <button
              onClick={() => handleCopy(signatureResult.signature, '签名')}
              className="p-1 hover:bg-accent rounded-md transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="font-mono text-sm break-all font-semibold">{signatureResult.signature}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Secret Key */}
      <div>
        <label className="block text-sm font-medium mb-2">
          <Key className="w-4 h-4 inline mr-1" />
          Secret Key
        </label>
        <input
          type="text"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="输入密钥..."
          className="w-full p-3 border border-border rounded-md bg-background font-mono text-sm"
        />
      </div>

      {/* App ID */}
      <div>
        <label className="block text-sm font-medium mb-2">App ID</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="输入或生成 App ID..."
            className="flex-1 p-3 border border-border rounded-md bg-background font-mono text-sm"
          />
          <button
            onClick={handleGenerateAppId}
            className="flex items-center space-x-1 px-3 py-2 bg-muted hover:bg-accent rounded-md transition-colors"
            title="生成 UUID"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">生成</span>
          </button>
        </div>
      </div>

      {/* Timestamp */}
      <div>
        <label className="block text-sm font-medium mb-2">
          <Clock className="w-4 h-4 inline mr-1" />
          时间戳 (毫秒)
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            placeholder="输入或生成时间戳..."
            className="flex-1 p-3 border border-border rounded-md bg-background font-mono text-sm"
          />
          <button
            onClick={handleGenerateTimestamp}
            className="flex items-center space-x-1 px-3 py-2 bg-muted hover:bg-accent rounded-md transition-colors"
            title="生成当前时间戳"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">生成</span>
          </button>
        </div>
        {timestamp && (
          <div className="mt-1 text-xs text-muted-foreground">
            {new Date(parseInt(timestamp)).toLocaleString('zh-CN')}
          </div>
        )}
      </div>

      {/* Request Body */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">
            <FileJson className="w-4 h-4 inline mr-1" />
            请求体 (JSON)
          </label>
          <button
            onClick={handleGenerateRandomBody}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-muted hover:bg-accent rounded-md transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>生成示例</span>
          </button>
        </div>
        <textarea
          value={requestBody}
          onChange={(e) => setRequestBody(e.target.value)}
          placeholder="输入 JSON 格式的请求体或点击生成示例..."
          className="w-full h-64 p-3 border border-border rounded-md bg-background font-mono text-xs resize-none"
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Hash className="w-4 h-4" />
        <span>{isGenerating ? '生成中...' : '生成签名'}</span>
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
      {signatureResult && (
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
export { SignatureGeneratorTool };
export default SignatureGeneratorTool;

