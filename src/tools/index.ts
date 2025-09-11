// Tool imports
import MessageGeneratorTool from './MessageGeneratorTool';
import ProtocolParserTool from './ProtocolParserTool';
import DataConverterTool from './DataConverterTool';
import CRCCalculatorTool from './CRCCalculatorTool';
import TimestampConverterTool from './TimestampConverterTool';

// Registry import
import { toolRegistry } from '@/services/ToolRegistry';

// Tool instances
export const messageGeneratorTool = new MessageGeneratorTool();
export const protocolParserTool = new ProtocolParserTool();
export const dataConverterTool = new DataConverterTool();
export const crcCalculatorTool = new CRCCalculatorTool();
export const timestampConverterTool = new TimestampConverterTool();

// All tools array for easy access
export const allTools = [
  messageGeneratorTool,
  protocolParserTool,
  dataConverterTool,
  crcCalculatorTool,
  timestampConverterTool
];

/**
 * Initialize and register all tools
 */
export async function initializeTools(): Promise<void> {
  console.log('Initializing ProtoTool essential tools...');
  console.log('Available tools:', allTools.map(t => ({ id: t.id, name: t.name })));

  try {
    // Register all tools
    for (const tool of allTools) {
      console.log(`Registering tool: ${tool.name} (${tool.id})`);

      toolRegistry.register(tool, {
        enabled: true,
        priority: 1,
        tags: [tool.category, 'essential'],
        metadata: {
          isBuiltIn: true,
          version: tool.version,
          author: tool.author
        }
      });

      console.log(`Successfully registered tool: ${tool.name} (${tool.id})`);
    }

    // Verify registration
    const registeredCount = toolRegistry.getAll().length;
    console.log(`Total registered tools: ${registeredCount}`);

    // Set up tool categories and priorities
    await setupToolCategories();
    
    // Configure quick access tools
    await setupQuickAccessTools();

    console.log(`Successfully initialized ${allTools.length} essential tools`);

  } catch (error) {
    console.error('Failed to initialize tools:', error);
    throw error;
  }
}

/**
 * Setup tool categories and their display order
 */
async function setupToolCategories(): Promise<void> {
  const categories = [
    { id: 'generation', name: '生成工具', priority: 1, icon: 'Zap' },
    { id: 'parsing', name: '解析工具', priority: 2, icon: 'FileSearch' },
    { id: 'conversion', name: '转换工具', priority: 3, icon: 'Shuffle' },
    { id: 'validation', name: '校验工具', priority: 4, icon: 'Calculator' },
    { id: 'analysis', name: '分析工具', priority: 5, icon: 'BarChart' },
    { id: 'utility', name: '实用工具', priority: 6, icon: 'Wrench' }
  ];

  // This would typically be stored in a configuration service
  // For now, we'll just log the categories
  console.log('Tool categories configured:', categories);
}

/**
 * Setup default quick access tools
 */
async function setupQuickAccessTools(): Promise<void> {
  const quickAccessTools = [
    messageGeneratorTool.id,
    protocolParserTool.id,
    dataConverterTool.id,
    crcCalculatorTool.id
  ];

  // This would typically be stored in user preferences
  // For now, we'll just log the quick access tools
  console.log('Quick access tools configured:', quickAccessTools);
}

/**
 * Get tool by ID
 */
export function getToolById(id: string) {
  return allTools.find(tool => tool.id === id);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: string) {
  return allTools.filter(tool => tool.category === category);
}

/**
 * Get tools that support a specific protocol
 */
export function getToolsByProtocol(protocol: string) {
  return allTools.filter(tool => 
    tool.supportedProtocols.includes(protocol as any) || 
    tool.supportedProtocols.includes('Custom' as any)
  );
}

/**
 * Get tools that support a specific data format
 */
export function getToolsByFormat(format: string) {
  return allTools.filter(tool => 
    tool.supportedFormats.includes(format as any)
  );
}

/**
 * Search tools by name or description
 */
export function searchTools(query: string) {
  const lowerQuery = query.toLowerCase();
  return allTools.filter(tool => 
    tool.name.toLowerCase().includes(lowerQuery) ||
    tool.description.toLowerCase().includes(lowerQuery) ||
    tool.category.toLowerCase().includes(lowerQuery)
  );
}

// Export tool classes for advanced usage
export {
  MessageGeneratorTool,
  ProtocolParserTool,
  DataConverterTool,
  CRCCalculatorTool,
  TimestampConverterTool
};

// Export types
export type { BaseTool } from '@/types/toolbox';
