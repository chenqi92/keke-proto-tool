/**
 * Protocol Store Service
 *
 * Service for fetching protocols from GitHub repository
 * Repository: https://github.com/chenqi92/keke-proto-tool-shop
 */

const GITHUB_REPO_OWNER = 'chenqi92';
const GITHUB_REPO_NAME = 'keke-proto-tool-shop';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

/**
 * Protocol store item from GitHub
 */
export interface ProtocolStoreItem {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: string;
  tags: string[];
  filename: string;
  size: number;
  downloadUrl: string;
  sha: string;
  path: string;
  // Additional metadata
  rating?: number;
  downloads?: number;
  lastUpdated?: string;
  featured?: boolean;
  verified?: boolean;
}

/**
 * GitHub API response for repository contents
 */
interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file' | 'dir';
}

/**
 * Parse protocol metadata from YAML/KPT content
 */
function parseProtocolMetadata(content: string, filename: string, item: GitHubContentItem): ProtocolStoreItem | null {
  try {
    // Extract metadata from protocol content
    // Support both YAML and KPT formats
    
    let name = '';
    let version = '';
    let author = '';
    let description = '';
    let category = '';
    const tags: string[] = [];

    // Try to parse YAML format first
    if (content.includes('meta:') || content.includes('metadata:')) {
      // YAML format
      const nameMatch = content.match(/name:\s*["']?([^"'\n]+)["']?/);
      const versionMatch = content.match(/version:\s*["']?([^"'\n]+)["']?/);
      const authorMatch = content.match(/author:\s*["']?([^"'\n]+)["']?/);
      const descMatch = content.match(/description:\s*["']?([^"'\n]+)["']?/);
      const categoryMatch = content.match(/category:\s*["']?([^"'\n]+)["']?/);
      
      name = nameMatch ? nameMatch[1].trim() : '';
      version = versionMatch ? versionMatch[1].trim() : '1.0.0';
      author = authorMatch ? authorMatch[1].trim() : 'Unknown';
      description = descMatch ? descMatch[1].trim() : '';
      category = categoryMatch ? categoryMatch[1].trim() : 'general';
    } else if (content.includes('protocol ')) {
      // KPT format
      const protocolMatch = content.match(/protocol\s+["']([^"']+)["']/);
      const titleMatch = content.match(/title\s+["']([^"']+)["']/);
      const versionMatch = content.match(/version\s+["']([^"'\n]+)["']/);
      const descMatch = content.match(/description\s+["']([^"']+)["']/);
      
      name = titleMatch ? titleMatch[1].trim() : (protocolMatch ? protocolMatch[1].trim() : '');
      version = versionMatch ? versionMatch[1].trim() : '1.0.0';
      author = 'Community';
      description = descMatch ? descMatch[1].trim() : '';
      category = 'imported';
    }

    // Fallback to filename if name not found
    if (!name) {
      name = filename.replace(/\.(kkp\.yaml|kpt|yaml)$/i, '');
    }

    // Generate unique ID from path
    const id = item.sha.substring(0, 8);

    return {
      id,
      name,
      version,
      author,
      description,
      category,
      tags,
      filename,
      size: item.size,
      downloadUrl: item.download_url,
      sha: item.sha,
      path: item.path,
      featured: false,
      verified: true,
      rating: 0,
      downloads: 0,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to parse protocol metadata:', error);
    return null;
  }
}

/**
 * Protocol Store Service
 */
class ProtocolStoreService {
  private cache: ProtocolStoreItem[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch all protocols from GitHub repository
   */
  async fetchProtocols(forceRefresh: boolean = false): Promise<ProtocolStoreItem[]> {
    // Check cache
    if (!forceRefresh && this.cache && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      console.log('Returning cached protocols');
      return this.cache;
    }

    try {
      console.log('Fetching protocols from GitHub...');
      
      // Fetch repository contents
      const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'keke-proto-tool'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const items: GitHubContentItem[] = await response.json();
      
      // Filter protocol files (.kkp.yaml, .kpt, .yaml)
      const protocolFiles = items.filter(item => 
        item.type === 'file' && 
        (item.name.endsWith('.kkp.yaml') || 
         item.name.endsWith('.kpt') || 
         item.name.endsWith('.yaml'))
      );

      console.log(`Found ${protocolFiles.length} protocol files`);

      // Fetch and parse each protocol file
      const protocols: ProtocolStoreItem[] = [];
      
      for (const file of protocolFiles) {
        try {
          // Fetch file content
          const contentResponse = await fetch(file.download_url, {
            method: 'GET',
            headers: {
              'User-Agent': 'keke-proto-tool'
            }
          });

          if (!contentResponse.ok) {
            console.warn(`Failed to fetch ${file.name}: ${contentResponse.status}`);
            continue;
          }

          const content = await contentResponse.text();
          
          // Parse metadata
          const protocol = parseProtocolMetadata(content, file.name, file);
          if (protocol) {
            protocols.push(protocol);
          }
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error);
        }
      }

      // Update cache
      this.cache = protocols;
      this.cacheTimestamp = Date.now();

      console.log(`Successfully fetched ${protocols.length} protocols`);
      return protocols;
    } catch (error) {
      console.error('Failed to fetch protocols from GitHub:', error);
      throw new Error(`Failed to fetch protocols: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download a protocol file content
   */
  async downloadProtocol(protocol: ProtocolStoreItem): Promise<string> {
    try {
      console.log(`Downloading protocol: ${protocol.name}`);
      
      const response = await fetch(protocol.downloadUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'keke-proto-tool'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();
      console.log(`Successfully downloaded protocol: ${protocol.name}`);
      
      return content;
    } catch (error) {
      console.error('Failed to download protocol:', error);
      throw new Error(`Failed to download protocol: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search protocols by keyword
   */
  searchProtocols(protocols: ProtocolStoreItem[], keyword: string): ProtocolStoreItem[] {
    if (!keyword.trim()) {
      return protocols;
    }

    const lowerKeyword = keyword.toLowerCase();
    return protocols.filter(protocol => 
      protocol.name.toLowerCase().includes(lowerKeyword) ||
      protocol.description.toLowerCase().includes(lowerKeyword) ||
      protocol.category.toLowerCase().includes(lowerKeyword) ||
      protocol.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    );
  }

  /**
   * Filter protocols by category
   */
  filterByCategory(protocols: ProtocolStoreItem[], category: string): ProtocolStoreItem[] {
    if (!category || category === 'all') {
      return protocols;
    }

    return protocols.filter(protocol => protocol.category === category);
  }

  /**
   * Get all unique categories
   */
  getCategories(protocols: ProtocolStoreItem[]): string[] {
    const categories = new Set<string>();
    protocols.forEach(protocol => {
      if (protocol.category) {
        categories.add(protocol.category);
      }
    });
    return Array.from(categories).sort();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

export const protocolStoreService = new ProtocolStoreService();

