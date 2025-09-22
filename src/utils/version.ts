/**
 * Version comparison and parsing utilities
 * Supports semantic versioning with pre-release and build metadata
 */

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  raw: string;
}

export interface VersionComparisonResult {
  current: ParsedVersion;
  latest: ParsedVersion;
  hasUpdate: boolean;
  updateType: 'major' | 'minor' | 'patch' | 'prerelease' | 'none';
}

/**
 * Parse a version string into components
 * Supports formats like: 1.2.3, v1.2.3, 1.2.3-alpha.1, 1.2.3+build.123
 */
export function parseVersion(version: string): ParsedVersion {
  // Remove 'v' prefix if present
  const cleanVersion = version.replace(/^v/, '');
  
  // Regex to match semantic version with optional prerelease and build
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  
  const match = cleanVersion.match(versionRegex);
  
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  const [, major, minor, patch, prerelease, build] = match;
  
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease: prerelease || undefined,
    build: build || undefined,
    raw: version,
  };
}

/**
 * Compare two version strings
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const version1 = parseVersion(v1);
  const version2 = parseVersion(v2);
  
  // Compare major.minor.patch
  if (version1.major !== version2.major) {
    return version1.major - version2.major;
  }
  
  if (version1.minor !== version2.minor) {
    return version1.minor - version2.minor;
  }
  
  if (version1.patch !== version2.patch) {
    return version1.patch - version2.patch;
  }
  
  // Handle prerelease versions
  // No prerelease > prerelease
  if (!version1.prerelease && version2.prerelease) {
    return 1;
  }
  
  if (version1.prerelease && !version2.prerelease) {
    return -1;
  }
  
  // Both have prerelease, compare them
  if (version1.prerelease && version2.prerelease) {
    return comparePrereleaseVersions(version1.prerelease, version2.prerelease);
  }
  
  // Versions are equal
  return 0;
}

/**
 * Compare prerelease version strings
 * Examples: alpha < beta < rc < (no prerelease)
 */
function comparePrereleaseVersions(pre1: string, pre2: string): number {
  const parts1 = pre1.split('.');
  const parts2 = pre2.split('.');
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i];
    const part2 = parts2[i];
    
    // If one version has more parts, the longer one is greater
    if (part1 === undefined) return -1;
    if (part2 === undefined) return 1;
    
    // Try to parse as numbers
    const num1 = parseInt(part1, 10);
    const num2 = parseInt(part2, 10);
    
    // Both are numbers
    if (!isNaN(num1) && !isNaN(num2)) {
      if (num1 !== num2) {
        return num1 - num2;
      }
      continue;
    }
    
    // One is number, one is string - number is less
    if (!isNaN(num1) && isNaN(num2)) {
      return -1;
    }
    
    if (isNaN(num1) && !isNaN(num2)) {
      return 1;
    }
    
    // Both are strings - lexical comparison
    if (part1 !== part2) {
      return part1.localeCompare(part2);
    }
  }
  
  return 0;
}

/**
 * Check if a version has an update available
 */
export function hasUpdateAvailable(currentVersion: string, latestVersion: string): boolean {
  return compareVersions(currentVersion, latestVersion) < 0;
}

/**
 * Get the type of update available
 */
export function getUpdateType(currentVersion: string, latestVersion: string): 'major' | 'minor' | 'patch' | 'prerelease' | 'none' {
  const current = parseVersion(currentVersion);
  const latest = parseVersion(latestVersion);
  
  if (compareVersions(currentVersion, latestVersion) >= 0) {
    return 'none';
  }
  
  if (current.major !== latest.major) {
    return 'major';
  }
  
  if (current.minor !== latest.minor) {
    return 'minor';
  }
  
  if (current.patch !== latest.patch) {
    return 'patch';
  }
  
  // Same version but different prerelease
  return 'prerelease';
}

/**
 * Compare current version with latest and return detailed result
 */
export function compareVersionsDetailed(currentVersion: string, latestVersion: string): VersionComparisonResult {
  const current = parseVersion(currentVersion);
  const latest = parseVersion(latestVersion);
  const hasUpdate = hasUpdateAvailable(currentVersion, latestVersion);
  const updateType = getUpdateType(currentVersion, latestVersion);
  
  return {
    current,
    latest,
    hasUpdate,
    updateType,
  };
}

/**
 * Format version for display
 */
export function formatVersionForDisplay(version: ParsedVersion): string {
  let formatted = `v${version.major}.${version.minor}.${version.patch}`;
  
  if (version.prerelease) {
    formatted += `-${version.prerelease}`;
  }
  
  return formatted;
}

/**
 * Validate version string format
 */
export function isValidVersion(version: string): boolean {
  try {
    parseVersion(version);
    return true;
  } catch {
    return false;
  }
}
