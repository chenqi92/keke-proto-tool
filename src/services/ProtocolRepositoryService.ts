import { invoke } from '@tauri-apps/api/core';
import { convertKptToYaml } from '../utils/kptToYamlConverter';

// Protocol metadata interface matching the backend
export interface ProtocolMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: string;
  tags: string[];
  supported_formats: string[];
  created_at: string;
  modified_at: string;
  enabled: boolean;
  file_path: string;
  file_size: number;
}

// Protocol import request interface
export interface ProtocolImportRequest {
  name: string;
  content: string;
  author?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

// Protocol export options interface
export interface ProtocolExportOptions {
  include_metadata: boolean;
  format: 'yaml' | 'json';
}

// Factor definition interface
export interface FactorDefinition {
  name: string;
  name_en?: string;
  unit: string;
  unit_en?: string;
  category: string;
  data_type: string;
  precision?: number;
  range?: [number, number];
  description: string;
  alarm_high?: number;
  alarm_low?: number;
  standard_value?: number;
  quality_grade?: string;
}

// Parsed factor interface
export interface ParsedFactor {
  code: string;
  name: string;
  name_en?: string;
  unit: string;
  category: string;
  value?: FactorValue;
  quality_flag?: string;
  quality_description?: string;
  validation_errors: string[];
  is_unknown: boolean;
  alarm_status?: AlarmStatus;
  standard_value?: number;
  quality_grade?: string;
}

export type AlarmStatus = 'Normal' | 'HighAlarm' | 'LowAlarm' | 'OutOfRange';

// Factor value type
export type FactorValue = number | string;

// Factor summary interface
export interface FactorSummary {
  total_factors: number;
  unknown_factors: number;
  categories: Record<string, number>;
  quality_status: Record<string, number>;
  validation_errors: number;
}

// HJ212 parse result interface
export interface HJ212ParseResult {
  parse_result: any; // ParseResult from backend
  parsed_factors: ParsedFactor[];
  factor_summary?: FactorSummary;
}

export class ProtocolRepositoryService {
  private static instance: ProtocolRepositoryService;

  private constructor() {}

  public static getInstance(): ProtocolRepositoryService {
    if (!ProtocolRepositoryService.instance) {
      ProtocolRepositoryService.instance = new ProtocolRepositoryService();
    }
    return ProtocolRepositoryService.instance;
  }

  /**
   * Import a protocol from KPT content
   */
  public async importProtocol(request: ProtocolImportRequest): Promise<string> {
    try {
      // Convert KPT format to YAML format for backend compatibility
      let content = request.content;

      // Check if content is in KPT format (starts with 'protocol')
      if (content.trim().startsWith('protocol ')) {
        console.log('Converting KPT format to YAML for backend compatibility');
        content = convertKptToYaml(content);
      }

      const protocolId = await invoke<string>('import_protocol', {
        content,
        custom_name: request.name,
        custom_category: request.category,
        tags: request.tags || [],
        enabled: true
      });
      console.log(`Successfully imported protocol: ${protocolId}`);
      return protocolId;
    } catch (error) {
      console.error('Failed to import protocol:', error);
      throw new Error(`Failed to import protocol: ${error}`);
    }
  }

  /**
   * Export a protocol to file
   */
  public async exportProtocol(
    protocolId: string, 
    filePath: string, 
    options?: ProtocolExportOptions
  ): Promise<void> {
    try {
      await invoke('export_protocol', { 
        protocolId, 
        filePath, 
        options: options || { include_metadata: true, format: 'yaml' }
      });
      console.log(`Successfully exported protocol ${protocolId} to ${filePath}`);
    } catch (error) {
      console.error('Failed to export protocol:', error);
      throw new Error(`Failed to export protocol: ${error}`);
    }
  }

  /**
   * List all protocols in the repository
   */
  public async listProtocols(): Promise<ProtocolMetadata[]> {
    try {
      const protocols = await invoke<ProtocolMetadata[]>('list_protocols');
      return protocols;
    } catch (error) {
      console.error('Failed to list protocols:', error);
      throw new Error(`Failed to list protocols: ${error}`);
    }
  }

  /**
   * List only enabled protocols
   */
  public async listEnabledProtocols(): Promise<ProtocolMetadata[]> {
    try {
      const protocols = await invoke<ProtocolMetadata[]>('list_enabled_protocols');
      return protocols;
    } catch (error) {
      console.error('Failed to list enabled protocols:', error);
      throw new Error(`Failed to list enabled protocols: ${error}`);
    }
  }

  /**
   * Get metadata for a specific protocol
   */
  public async getProtocolMetadata(protocolId: string): Promise<ProtocolMetadata> {
    try {
      const metadata = await invoke<ProtocolMetadata>('get_protocol_metadata', { protocolId });
      return metadata;
    } catch (error) {
      console.error('Failed to get protocol metadata:', error);
      throw new Error(`Failed to get protocol metadata: ${error}`);
    }
  }

  /**
   * Get content for a specific protocol
   */
  public async getProtocolContent(protocolId: string): Promise<string> {
    try {
      const content = await invoke<string>('get_protocol_content', { protocolId });
      return content;
    } catch (error) {
      console.error('Failed to get protocol content:', error);
      throw new Error(`Failed to get protocol content: ${error}`);
    }
  }

  /**
   * Delete a protocol from the repository
   */
  public async deleteProtocol(protocolId: string): Promise<void> {
    try {
      await invoke('delete_protocol', { protocolId });
      console.log(`Successfully deleted protocol: ${protocolId}`);
    } catch (error) {
      console.error('Failed to delete protocol:', error);
      throw new Error(`Failed to delete protocol: ${error}`);
    }
  }

  /**
   * Enable or disable a protocol
   */
  public async setProtocolEnabled(protocolId: string, enabled: boolean): Promise<void> {
    try {
      await invoke('set_protocol_enabled', { protocolId, enabled });
      console.log(`Successfully ${enabled ? 'enabled' : 'disabled'} protocol: ${protocolId}`);
    } catch (error) {
      console.error('Failed to set protocol enabled state:', error);
      throw new Error(`Failed to set protocol enabled state: ${error}`);
    }
  }

  /**
   * Import protocol from file
   */
  public async importProtocolFromFile(file: File): Promise<string> {
    try {
      const content = await this.readFileAsText(file);
      
      // Extract name from filename (remove extension)
      const name = file.name.replace(/\.(kpt|txt)$/i, '');
      
      const request: ProtocolImportRequest = {
        name,
        content,
        description: `Imported from ${file.name}`,
        category: 'imported',
        tags: ['imported']
      };

      return await this.importProtocol(request);
    } catch (error) {
      console.error('Failed to import protocol from file:', error);
      throw new Error(`Failed to import protocol from file: ${error}`);
    }
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Validate protocol file format
   */
  public validateProtocolFile(file: File): boolean {
    const validExtensions = ['.yaml', '.yml', '.json'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    return validExtensions.includes(extension);
  }

  /**
   * Get protocol statistics
   */
  public async getProtocolStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    categories: Record<string, number>;
  }> {
    try {
      const protocols = await this.listProtocols();
      const enabled = protocols.filter(p => p.enabled).length;
      const disabled = protocols.length - enabled;
      
      const categories: Record<string, number> = {};
      protocols.forEach(protocol => {
        categories[protocol.category] = (categories[protocol.category] || 0) + 1;
      });

      return {
        total: protocols.length,
        enabled,
        disabled,
        categories
      };
    } catch (error) {
      console.error('Failed to get protocol stats:', error);
      throw new Error(`Failed to get protocol stats: ${error}`);
    }
  }

  // ============================================================================
  // Factor Code Translation Methods
  // ============================================================================

  /**
   * Parse factor codes from a factor string
   */
  public async parseFactorCodes(protocolId: string, factorString: string): Promise<ParsedFactor[]> {
    try {
      return await invoke('parse_factor_codes', {
        protocolId,
        factorString
      });
    } catch (error) {
      console.error('Failed to parse factor codes:', error);
      throw new Error(`Failed to parse factor codes: ${error}`);
    }
  }

  /**
   * Get factor summary for parsed factors
   */
  public async getFactorSummary(protocolId: string, factorString: string): Promise<FactorSummary> {
    try {
      return await invoke('get_factor_summary', {
        protocolId,
        factorString
      });
    } catch (error) {
      console.error('Failed to get factor summary:', error);
      throw new Error(`Failed to get factor summary: ${error}`);
    }
  }

  /**
   * Get all factor definitions for a protocol
   */
  public async getProtocolFactorDefinitions(protocolId: string): Promise<Record<string, FactorDefinition>> {
    try {
      return await invoke('get_protocol_factor_definitions', {
        protocolId
      });
    } catch (error) {
      console.error('Failed to get protocol factor definitions:', error);
      throw new Error(`Failed to get protocol factor definitions: ${error}`);
    }
  }

  /**
   * Parse HJ212 message with factor translation
   */
  public async parseHJ212Message(protocolId: string, messageData: string): Promise<HJ212ParseResult> {
    try {
      return await invoke('parse_hj212_message', {
        protocolId,
        messageData
      });
    } catch (error) {
      console.error('Failed to parse HJ212 message:', error);
      throw new Error(`Failed to parse HJ212 message: ${error}`);
    }
  }
}

export const protocolRepositoryService = ProtocolRepositoryService.getInstance();
