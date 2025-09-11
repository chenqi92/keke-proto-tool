import { 
  ProtocolBridge, 
  DataBridge, 
  SessionBridge, 
  Protocol, 
  DataFormat 
} from '@/types/toolbox';
import { formatData, validateFormat } from '@/components/DataFormatSelector';
import { networkService } from '@/services/NetworkService';
import { useAppStore } from '@/stores/AppStore';
import { toolRegistry } from './ToolRegistry';

// Protocol Bridge Implementation
export class ToolProtocolBridge implements ProtocolBridge {
  private protocolToolMap = new Map<Protocol, string[]>();

  constructor() {
    this.initializeProtocolMappings();
  }

  async initialize(): Promise<void> {
    // Initialize protocol mappings and any async setup
    this.initializeProtocolMappings();
    console.log('Protocol bridge initialized');
  }

  getSuggestedTools(protocol: Protocol, data?: Uint8Array): string[] {
    const protocolTools = this.protocolToolMap.get(protocol) || [];
    const allTools = toolRegistry.getByProtocol(protocol);
    
    // Start with protocol-specific tools
    let suggestions = [...protocolTools];
    
    // Add tools that support this protocol
    allTools.forEach(reg => {
      if (!suggestions.includes(reg.tool.id)) {
        suggestions.push(reg.tool.id);
      }
    });

    // If data is provided, filter by data-aware tools
    if (data) {
      suggestions = this.filterByDataCompatibility(suggestions, data);
    }

    // Sort by usage and favorites
    return this.sortSuggestions(suggestions);
  }

  canProcessProtocol(toolId: string, protocol: Protocol): boolean {
    const registration = toolRegistry.getById(toolId);
    if (!registration) return false;

    return registration.tool.supportedProtocols.includes(protocol) ||
           registration.tool.supportedProtocols.includes('Custom');
  }

  getProtocolContext(protocol: Protocol, sessionId: string): Record<string, any> {
    const session = useAppStore.getState().getSession(sessionId);
    if (!session) return {};

    const context: Record<string, any> = {
      protocol,
      sessionId,
      connectionType: session.config.connectionType,
      host: session.config.host,
      port: session.config.port,
      connected: session.status === 'connected'
    };

    // Add protocol-specific context
    switch (protocol) {
      case 'TCP':
        context.keepAlive = session.config.keepAlive;
        context.timeout = session.config.timeout;
        break;
      case 'UDP':
        // UDP specific context (broadcast not in config yet)
        break;
      case 'WebSocket':
        context.subprotocol = session.config.websocketSubprotocol;
        context.extensions = session.config.websocketExtensions;
        break;
      case 'MQTT':
        context.topic = session.config.mqttTopic;
        context.qos = session.config.mqttWillQos || 0;
        break;
      case 'SSE':
        context.eventTypes = session.config.sseEventTypes;
        break;
    }

    return context;
  }

  private initializeProtocolMappings(): void {
    // Define which tools are most relevant for each protocol
    this.protocolToolMap.set('TCP', ['message-generator', 'protocol-parser', 'data-converter']);
    this.protocolToolMap.set('UDP', ['message-generator', 'data-converter', 'crc-calculator']);
    this.protocolToolMap.set('WebSocket', ['message-generator', 'protocol-parser', 'data-converter']);
    this.protocolToolMap.set('MQTT', ['message-generator', 'protocol-parser']);
    this.protocolToolMap.set('SSE', ['protocol-parser', 'data-converter']);
    this.protocolToolMap.set('HTTP', ['protocol-parser', 'data-converter']);
  }

  private filterByDataCompatibility(toolIds: string[], data: Uint8Array): string[] {
    // This could analyze the data and suggest appropriate tools
    // For now, return all tools
    return toolIds;
  }

  private sortSuggestions(toolIds: string[]): string[] {
    const registrations = toolIds
      .map(id => toolRegistry.getById(id))
      .filter(reg => reg !== undefined) as any[];

    return registrations
      .sort((a, b) => {
        // Favorites first
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
        
        // Then by usage count
        return b.usageCount - a.usageCount;
      })
      .map(reg => reg.tool.id);
  }
}

// Data Bridge Implementation
export class ToolDataBridge implements DataBridge {
  async initialize(): Promise<void> {
    // Initialize data conversion utilities
    console.log('Data bridge initialized');
  }

  convertFormat(data: Uint8Array, fromFormat: DataFormat, toFormat: DataFormat): Uint8Array {
    if (fromFormat === toFormat) {
      return data;
    }

    try {
      // Convert to string using fromFormat
      const stringData = formatData.to[fromFormat](data);
      
      // Convert back to Uint8Array using toFormat
      return formatData.from[toFormat](stringData);
    } catch (error) {
      throw new Error(`Failed to convert from ${fromFormat} to ${toFormat}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateFormat(data: string, format: DataFormat): boolean {
    return validateFormat[format](data);
  }

  getDataMetadata(data: Uint8Array): Record<string, any> {
    const metadata: Record<string, any> = {
      size: data.length,
      isEmpty: data.length === 0,
      formats: {}
    };

    // Try to represent data in different formats
    try {
      metadata.formats.hex = formatData.to.hex(data);
      metadata.formats.ascii = formatData.to.ascii(data);
      metadata.formats.base64 = formatData.to.base64(data);
      
      // Check if it's valid JSON
      try {
        const text = formatData.to.ascii(data);
        JSON.parse(text);
        metadata.isJson = true;
        metadata.formats.json = formatData.to.json(data);
      } catch {
        metadata.isJson = false;
      }

      // Check if it's printable ASCII
      metadata.isPrintableAscii = this.isPrintableAscii(data);
      
      // Basic pattern detection
      metadata.patterns = this.detectPatterns(data);
      
    } catch (error) {
      console.warn('Error generating data metadata:', error);
    }

    return metadata;
  }

  private isPrintableAscii(data: Uint8Array): boolean {
    return Array.from(data).every(byte => byte >= 32 && byte <= 126);
  }

  private detectPatterns(data: Uint8Array): Record<string, any> {
    const patterns: Record<string, any> = {};

    // Check for common patterns
    patterns.hasNullBytes = data.includes(0);
    patterns.hasHighBytes = Array.from(data).some(byte => byte > 127);
    
    // Check for repeating patterns
    if (data.length > 1) {
      const firstByte = data[0];
      patterns.allSame = Array.from(data).every(byte => byte === firstByte);
      
      // Check for alternating pattern
      if (data.length > 2) {
        patterns.alternating = this.isAlternatingPattern(data);
      }
    }

    // Check for common headers/signatures
    patterns.signatures = this.detectSignatures(data);

    return patterns;
  }

  private isAlternatingPattern(data: Uint8Array): boolean {
    if (data.length < 4) return false;
    
    for (let i = 2; i < data.length; i++) {
      if (data[i] !== data[i % 2]) {
        return false;
      }
    }
    return true;
  }

  private detectSignatures(data: Uint8Array): string[] {
    const signatures: string[] = [];
    
    if (data.length < 4) return signatures;

    // Common file/protocol signatures
    const knownSignatures = [
      { bytes: [0x89, 0x50, 0x4E, 0x47], name: 'PNG' },
      { bytes: [0xFF, 0xD8, 0xFF], name: 'JPEG' },
      { bytes: [0x47, 0x49, 0x46], name: 'GIF' },
      { bytes: [0x50, 0x4B, 0x03, 0x04], name: 'ZIP' },
      { bytes: [0x7B], name: 'JSON (possible)' },
      { bytes: [0x3C], name: 'XML/HTML (possible)' }
    ];

    knownSignatures.forEach(sig => {
      if (this.matchesSignature(data, sig.bytes)) {
        signatures.push(sig.name);
      }
    });

    return signatures;
  }

  private matchesSignature(data: Uint8Array, signature: number[]): boolean {
    if (data.length < signature.length) return false;
    
    return signature.every((byte, index) => data[index] === byte);
  }
}

// Session Bridge Implementation
export class ToolSessionBridge implements SessionBridge {
  async initialize(): Promise<void> {
    // Initialize session management utilities
    console.log('Session bridge initialized');
  }

  getCurrentSession(): any {
    const state = useAppStore.getState();
    const activeSessionId = state.activeSessionId;
    return activeSessionId ? state.sessions[activeSessionId] : null;
  }

  getSessionData(sessionId: string): any {
    return useAppStore.getState().getSession(sessionId);
  }

  async sendToSession(sessionId: string, data: Uint8Array): Promise<boolean> {
    try {
      return await networkService.sendMessage(sessionId, data);
    } catch (error) {
      console.error(`Failed to send data to session ${sessionId}:`, error);
      return false;
    }
  }

  subscribeToSessionEvents(sessionId: string, callback: (event: any) => void): () => void {
    // This would integrate with the session event system
    // For now, return a no-op unsubscribe function
    console.log(`Subscribed to events for session: ${sessionId}`);
    
    return () => {
      console.log(`Unsubscribed from events for session: ${sessionId}`);
    };
  }

  // Additional utility methods
  getSessionMessages(sessionId: string, limit?: number): any[] {
    const session = this.getSessionData(sessionId);
    if (!session) return [];

    const messages = session.messages || [];
    return limit ? messages.slice(-limit) : messages;
  }

  getSessionStats(sessionId: string): Record<string, any> {
    const session = this.getSessionData(sessionId);
    if (!session) return {};

    const messages = this.getSessionMessages(sessionId);
    
    return {
      messageCount: messages.length,
      bytesReceived: messages.filter(m => m.direction === 'in').reduce((sum, m) => sum + m.size, 0),
      bytesSent: messages.filter(m => m.direction === 'out').reduce((sum, m) => sum + m.size, 0),
      connectionStatus: session.status,
      protocol: session.config.protocol,
      uptime: session.connectedAt ? Date.now() - session.connectedAt.getTime() : 0
    };
  }
}

// Singleton instances
export const protocolBridge = new ToolProtocolBridge();
export const dataBridge = new ToolDataBridge();
export const sessionBridge = new ToolSessionBridge();
