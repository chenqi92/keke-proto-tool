/**
 * Version Update Service
 * Handles GitHub API calls for version checking and update management
 */

import { APP_VERSION } from '@/constants/version';
import {
  compareVersionsDetailed,
  VersionComparisonResult,
  ParsedVersion,
  parseVersion
} from '@/utils/version';
import { invoke } from '@tauri-apps/api/core';

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
    download_count: number;
  }>;
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: ParsedVersion;
  latestVersion: ParsedVersion;
  updateType: 'major' | 'minor' | 'patch' | 'prerelease' | 'none';
  releaseInfo?: GitHubRelease;
  lastChecked: Date;
}

export interface UpdateServiceConfig {
  repositoryOwner: string;
  repositoryName: string;
  checkInterval: number; // in milliseconds
  includePrerelease: boolean;
  cacheTimeout: number; // in milliseconds
}

export class VersionUpdateService {
  private static instance: VersionUpdateService;
  private config: UpdateServiceConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private lastCheckTime: Date | null = null;
  private updateInfo: UpdateInfo | null = null;
  private listeners: Set<(updateInfo: UpdateInfo) => void> = new Set();
  private checkTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = {
      repositoryOwner: 'chenqi92',
      repositoryName: 'keke-proto-tool',
      checkInterval: 24 * 60 * 60 * 1000, // 24 hours
      includePrerelease: false,
      cacheTimeout: 60 * 60 * 1000, // 1 hour
    };
  }

  public static getInstance(): VersionUpdateService {
    if (!VersionUpdateService.instance) {
      VersionUpdateService.instance = new VersionUpdateService();
    }
    return VersionUpdateService.instance;
  }

  /**
   * Update service configuration
   */
  public updateConfig(config: Partial<UpdateServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart automatic checking if interval changed
    if (config.checkInterval !== undefined) {
      this.stopAutomaticChecking();
      this.startAutomaticChecking();
    }
  }

  /**
   * Add listener for update notifications
   */
  public addUpdateListener(listener: (updateInfo: UpdateInfo) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove update listener
   */
  public removeUpdateListener(listener: (updateInfo: UpdateInfo) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of update information
   */
  private notifyListeners(updateInfo: UpdateInfo): void {
    this.listeners.forEach(listener => {
      try {
        listener(updateInfo);
      } catch (error) {
        console.error('Error in update listener:', error);
      }
    });
  }

  /**
   * Get cached data if still valid
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  /**
   * Set cached data
   */
  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Fetch latest release from GitHub API via Tauri backend
   */
  private async fetchLatestRelease(): Promise<GitHubRelease> {
    const cacheKey = `latest-release-${this.config.includePrerelease}`;
    const cached = this.getCachedData<GitHubRelease>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const release = await invoke<GitHubRelease>('check_for_updates', {
        repositoryOwner: this.config.repositoryOwner,
        repositoryName: this.config.repositoryName,
        includePrerelease: this.config.includePrerelease,
      });

      this.setCachedData(cacheKey, release);
      return release;
    } catch (error) {
      console.error('Failed to fetch latest release:', error);
      throw error;
    }
  }

  /**
   * Check for updates
   */
  public async checkForUpdates(): Promise<UpdateInfo> {
    try {
      const latestRelease = await this.fetchLatestRelease();
      const comparison = compareVersionsDetailed(APP_VERSION, latestRelease.tag_name);
      
      const updateInfo: UpdateInfo = {
        hasUpdate: comparison.hasUpdate,
        currentVersion: comparison.current,
        latestVersion: comparison.latest,
        updateType: comparison.updateType,
        releaseInfo: comparison.hasUpdate ? latestRelease : undefined,
        lastChecked: new Date(),
      };

      this.updateInfo = updateInfo;
      this.lastCheckTime = new Date();
      
      // Notify listeners if there's an update
      if (updateInfo.hasUpdate) {
        this.notifyListeners(updateInfo);
      }

      return updateInfo;
    } catch (error) {
      console.error('Update check failed:', error);
      
      // Return cached info if available, otherwise create error state
      const updateInfo: UpdateInfo = this.updateInfo || {
        hasUpdate: false,
        currentVersion: parseVersion(APP_VERSION),
        latestVersion: parseVersion(APP_VERSION),
        updateType: 'none',
        lastChecked: new Date(),
      };

      return updateInfo;
    }
  }

  /**
   * Get current update information
   */
  public getCurrentUpdateInfo(): UpdateInfo | null {
    return this.updateInfo;
  }

  /**
   * Get last check time
   */
  public getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  /**
   * Start automatic update checking
   */
  public startAutomaticChecking(): void {
    if (this.checkTimer) {
      return; // Already running
    }

    // Initial check
    this.checkForUpdates().catch(console.error);

    // Set up periodic checking
    this.checkTimer = setInterval(() => {
      this.checkForUpdates().catch(console.error);
    }, this.config.checkInterval);
  }

  /**
   * Stop automatic update checking
   */
  public stopAutomaticChecking(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get download URL for current platform
   */
  public getDownloadUrl(release: GitHubRelease): string {
    // For now, return the release page URL
    // In the future, this could be enhanced to detect platform and return specific asset URL
    return release.html_url;
  }

  /**
   * Format release notes for display
   */
  public formatReleaseNotes(body: string): string {
    // Basic markdown-to-text conversion for display
    return body
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .trim();
  }
}

// Export singleton instance
export const versionUpdateService = VersionUpdateService.getInstance();
