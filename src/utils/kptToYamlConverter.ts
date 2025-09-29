/**
 * KPT 1.1 to YAML converter
 * 
 * This utility converts KPT 1.1 format protocol definitions to YAML format
 * that can be processed by the existing backend parser system.
 */

export interface KptProtocol {
  name: string;
  title?: string;
  version?: string;
  description?: string;
  author?: string;
  category?: string;
  tags?: string[];
}

export interface KptFrame {
  mode?: string;
  header?: string;
  tail?: string;
  length?: {
    at: string;
    size: number;
    encoding?: string;
    includes?: string;
  };
  escape?: boolean;
}

export interface KptChecksum {
  type?: string;
  store?: {
    size: number;
    encoding?: string;
  };
  range?: {
    from: string;
    to: string;
  };
  params?: Record<string, any>;
}

export interface KptMessage {
  name: string;
  select?: {
    pattern?: string;
    by?: string;
  };
  fields?: Array<{
    name: string;
    type: string;
    size?: number;
    encoding?: string;
    endian?: string;
    scale?: number;
    unit?: string;
  }>;
  cases?: Record<string, any>;
  compute?: Record<string, string>;
  assert?: string[];
}

export interface KptCatalog {
  name: string;
  type: 'inline' | 'csv';
  file?: string;
  key?: string;
  entries?: Record<string, any>;
}

export interface KptEnum {
  name: string;
  values: Record<string, string>;
}

export interface KptCodec {
  name: string;
  type: string;
  params?: Record<string, any>;
}

export interface KptTests {
  samples: Array<{
    name: string;
    raw: string;
    expect: Record<string, any>;
  }>;
}

/**
 * Parse KPT 1.1 format content into structured data
 */
export function parseKptContent(content: string): {
  protocol?: KptProtocol;
  frame?: KptFrame;
  checksum?: KptChecksum;
  messages?: KptMessage[];
  catalogs?: KptCatalog[];
  enums?: KptEnum[];
  codecs?: KptCodec[];
  tests?: KptTests;
} {
  const result: any = {};
  
  // Simple parser for KPT format
  const lines = content.split('\n');
  let currentBlock: string | null = null;
  let currentBlockContent: string[] = [];
  let braceLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;
    
    // Check for block start
    if (line.includes('{')) {
      if (currentBlock === null) {
        // Extract block type and name
        const match = line.match(/^(\w+)(?:\s+"([^"]+)")?\s*\{/);
        if (match) {
          currentBlock = match[1];
          currentBlockContent = [];
          if (match[2]) {
            currentBlockContent.push(`name: "${match[2]}"`);
          }
        }
      }
      braceLevel += (line.match(/\{/g) || []).length;
    }
    
    if (line.includes('}')) {
      braceLevel -= (line.match(/\}/g) || []).length;
      
      if (braceLevel === 0 && currentBlock) {
        // Process completed block
        processKptBlock(result, currentBlock, currentBlockContent);
        currentBlock = null;
        currentBlockContent = [];
      }
    } else if (currentBlock && braceLevel > 0) {
      // Add content to current block
      currentBlockContent.push(line);
    }
  }
  
  return result;
}

/**
 * Process a KPT block and add it to the result
 */
function processKptBlock(result: any, blockType: string, content: string[]) {
  switch (blockType) {
    case 'protocol':
      result.protocol = parseProtocolBlock(content);
      break;
    case 'frame':
      result.frame = parseFrameBlock(content);
      break;
    case 'checksum':
      result.checksum = parseChecksumBlock(content);
      break;
    case 'message':
      if (!result.messages) result.messages = [];
      result.messages.push(parseMessageBlock(content));
      break;
    case 'catalog':
      if (!result.catalogs) result.catalogs = [];
      result.catalogs.push(parseCatalogBlock(content));
      break;
    case 'enum':
      if (!result.enums) result.enums = [];
      result.enums.push(parseEnumBlock(content));
      break;
    case 'codec':
      if (!result.codecs) result.codecs = [];
      result.codecs.push(parseCodecBlock(content));
      break;
    case 'tests':
      result.tests = parseTestsBlock(content);
      break;
  }
}

/**
 * Parse protocol block
 */
function parseProtocolBlock(content: string[]): KptProtocol {
  const protocol: KptProtocol = { name: '' };
  
  for (const line of content) {
    const [key, ...valueParts] = line.split(/\s+/);
    const value = valueParts.join(' ').replace(/^"(.*)"$/, '$1');
    
    switch (key) {
      case 'name':
        protocol.name = value;
        break;
      case 'title':
        protocol.title = value;
        break;
      case 'version':
        protocol.version = value;
        break;
      case 'description':
        protocol.description = value;
        break;
      case 'author':
        protocol.author = value;
        break;
      case 'category':
        protocol.category = value;
        break;
    }
  }
  
  return protocol;
}

/**
 * Parse frame block
 */
function parseFrameBlock(content: string[]): KptFrame {
  const frame: KptFrame = {};
  
  for (const line of content) {
    const parts = line.split(/\s+/);
    const key = parts[0];
    
    switch (key) {
      case 'mode':
        frame.mode = parts[1];
        break;
      case 'header':
        frame.header = parts[1].replace(/^"(.*)"$/, '$1');
        break;
      case 'tail':
        frame.tail = parts[1].replace(/^"(.*)"$/, '$1');
        break;
      case 'length':
        // Parse: length at +2 size 4 encoding dec_ascii includes payload
        const lengthConfig: any = {};
        for (let i = 1; i < parts.length; i += 2) {
          if (parts[i] === 'at') lengthConfig.at = parts[i + 1];
          if (parts[i] === 'size') lengthConfig.size = parseInt(parts[i + 1]);
          if (parts[i] === 'encoding') lengthConfig.encoding = parts[i + 1];
          if (parts[i] === 'includes') lengthConfig.includes = parts[i + 1];
        }
        frame.length = lengthConfig;
        break;
      case 'escape':
        frame.escape = parts[1] === 'on';
        break;
    }
  }
  
  return frame;
}

/**
 * Parse checksum block
 */
function parseChecksumBlock(content: string[]): KptChecksum {
  const checksum: KptChecksum = {};
  
  for (const line of content) {
    const parts = line.split(/\s+/);
    const key = parts[0];
    
    switch (key) {
      case 'type':
        checksum.type = parts[1];
        break;
      case 'store':
        // Parse: store size 4 encoding hex_ascii
        const storeConfig: any = {};
        for (let i = 1; i < parts.length; i += 2) {
          if (parts[i] === 'size') storeConfig.size = parseInt(parts[i + 1]);
          if (parts[i] === 'encoding') storeConfig.encoding = parts[i + 1];
        }
        checksum.store = storeConfig;
        break;
      case 'range':
        // Parse: range from after_header to before_checksum
        const rangeConfig: any = {};
        for (let i = 1; i < parts.length; i += 2) {
          if (parts[i] === 'from') rangeConfig.from = parts[i + 1];
          if (parts[i] === 'to') rangeConfig.to = parts[i + 1];
        }
        checksum.range = rangeConfig;
        break;
      case 'params':
        // Parse parameters
        if (!checksum.params) checksum.params = {};
        // This would need more sophisticated parsing for key-value pairs
        break;
    }
  }
  
  return checksum;
}

/**
 * Parse message block
 */
function parseMessageBlock(content: string[]): KptMessage {
  const message: KptMessage = { name: '' };
  
  // Extract name from first line if present
  if (content[0] && content[0].includes('name:')) {
    message.name = content[0].split(':')[1].trim().replace(/^"(.*)"$/, '$1');
  }
  
  // Parse other content
  for (const line of content) {
    if (line.startsWith('select')) {
      // Parse select statement
      const selectConfig: any = {};
      const parts = line.split(/\s+/);
      for (let i = 1; i < parts.length; i += 2) {
        if (parts[i] === 'pattern') selectConfig.pattern = parts[i + 1].replace(/^"(.*)"$/, '$1');
        if (parts[i] === 'by') selectConfig.by = parts[i + 1];
      }
      message.select = selectConfig;
    }
    // Add more parsing logic for fields, cases, compute, assert, etc.
  }
  
  return message;
}

/**
 * Parse catalog block
 */
function parseCatalogBlock(content: string[]): KptCatalog {
  const catalog: KptCatalog = { name: '', type: 'inline' };
  
  // Extract name and type from content
  for (const line of content) {
    if (line.includes('name:')) {
      catalog.name = line.split(':')[1].trim().replace(/^"(.*)"$/, '$1');
    }
    // Add more parsing logic
  }
  
  return catalog;
}

/**
 * Parse enum block
 */
function parseEnumBlock(content: string[]): KptEnum {
  const enumDef: KptEnum = { name: '', values: {} };
  
  // Parse enum entries
  for (const line of content) {
    if (line.includes('name:')) {
      enumDef.name = line.split(':')[1].trim().replace(/^"(.*)"$/, '$1');
    } else {
      // Parse value entries like: 0x01 "ReadStatus"
      const match = line.match(/^(0x[0-9A-Fa-f]+|\d+)\s+"([^"]+)"/);
      if (match) {
        enumDef.values[match[1]] = match[2];
      }
    }
  }
  
  return enumDef;
}

/**
 * Parse codec block
 */
function parseCodecBlock(content: string[]): KptCodec {
  const codec: KptCodec = { name: '', type: '' };
  
  // Parse codec configuration
  for (const line of content) {
    if (line.includes('name:')) {
      codec.name = line.split(':')[1].trim().replace(/^"(.*)"$/, '$1');
    } else if (line.includes('type')) {
      const parts = line.split(/\s+/);
      const typeIndex = parts.indexOf('type');
      if (typeIndex >= 0 && typeIndex + 1 < parts.length) {
        codec.type = parts[typeIndex + 1];
      }
    }
  }
  
  return codec;
}

/**
 * Parse tests block
 */
function parseTestsBlock(content: string[]): KptTests {
  const tests: KptTests = { samples: [] };
  
  // Parse test samples
  // This would need more sophisticated parsing for nested structures
  
  return tests;
}

/**
 * Convert KPT format to YAML format compatible with backend
 */
export function convertKptToYaml(kptContent: string): string {
  const parsed = parseKptContent(kptContent);
  
  // Build YAML structure compatible with backend schema
  const yamlObj: any = {
    meta: {
      name: parsed.protocol?.title || parsed.protocol?.name || 'Unknown Protocol',
      version: parsed.protocol?.version || '1.0.0',
      author: parsed.protocol?.author || 'Unknown',
      description: parsed.protocol?.description || '',
      category: parsed.protocol?.category || 'general',
      tags: parsed.protocol?.tags || []
    },
    framing: {},
    fields: [],
    validation: {},
    conditions: [],
    functions: {}
  };
  
  // Convert frame configuration
  if (parsed.frame) {
    if (parsed.frame.header) {
      yamlObj.framing.start_delimiter = parsed.frame.header;
    }
    if (parsed.frame.tail) {
      yamlObj.framing.end_delimiter = parsed.frame.tail;
    }
    if (parsed.frame.length) {
      yamlObj.framing.length_field = {
        offset: parseInt(parsed.frame.length.at?.replace('+', '') || '0'),
        size: parsed.frame.length.size || 4,
        endian: 'big',
        includes_header: parsed.frame.length.includes === 'payload' ? false : true
      };
    }
  }
  
  // Convert messages to fields
  if (parsed.messages) {
    for (const message of parsed.messages) {
      if (message.fields) {
        yamlObj.fields.push(...message.fields.map((field: any) => ({
          name: field.name,
          type: field.type,
          offset: 0, // This would need proper calculation
          length: field.size ? { fixed: field.size } : { variable: true },
          endian: field.endian || 'big',
          description: `Field from message ${message.name}`
        })));
      }
    }
  }
  
  // Add factor codes if available from catalogs
  if (parsed.catalogs) {
    const factorCodes: any = {};
    for (const catalog of parsed.catalogs) {
      if (catalog.entries) {
        Object.assign(factorCodes, catalog.entries);
      }
    }
    if (Object.keys(factorCodes).length > 0) {
      yamlObj.factor_codes = factorCodes;
    }
  }
  
  // Convert to YAML string
  return `# Auto-generated YAML from KPT 1.1 format
meta:
  name: "${yamlObj.meta.name}"
  version: "${yamlObj.meta.version}"
  author: "${yamlObj.meta.author}"
  description: "${yamlObj.meta.description}"
  category: "${yamlObj.meta.category}"
  tags: ${JSON.stringify(yamlObj.meta.tags)}

framing:
${yamlObj.framing.start_delimiter ? `  start_delimiter: "${yamlObj.framing.start_delimiter}"` : ''}
${yamlObj.framing.end_delimiter ? `  end_delimiter: "${yamlObj.framing.end_delimiter}"` : ''}
${yamlObj.framing.length_field ? `  length_field:
    offset: ${yamlObj.framing.length_field.offset}
    size: ${yamlObj.framing.length_field.size}
    endian: "${yamlObj.framing.length_field.endian}"
    includes_header: ${yamlObj.framing.length_field.includes_header}` : ''}

fields:
${yamlObj.fields.map((field: any) => `  - name: "${field.name}"
    type: "${field.type}"
    offset: ${field.offset}
    description: "${field.description}"`).join('\n')}

validation: {}
conditions: []
functions: {}
${yamlObj.factor_codes ? `
factor_codes: ${JSON.stringify(yamlObj.factor_codes, null, 2).split('\n').map((line: string, index: number) => index === 0 ? line : `  ${line}`).join('\n')}` : ''}
`;
}
