/**
 * Tests for version comparison utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseVersion,
  compareVersions,
  hasUpdateAvailable,
  getUpdateType,
  compareVersionsDetailed,
  formatVersionForDisplay,
  isValidVersion,
} from '../version';

describe('Version Utilities', () => {
  describe('parseVersion', () => {
    it('should parse basic semantic versions', () => {
      const version = parseVersion('1.2.3');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: undefined,
        raw: '1.2.3',
      });
    });

    it('should parse versions with v prefix', () => {
      const version = parseVersion('v1.2.3');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: undefined,
        raw: 'v1.2.3',
      });
    });

    it('should parse versions with prerelease', () => {
      const version = parseVersion('1.2.3-alpha.1');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'alpha.1',
        build: undefined,
        raw: '1.2.3-alpha.1',
      });
    });

    it('should parse versions with build metadata', () => {
      const version = parseVersion('1.2.3+build.123');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        build: 'build.123',
        raw: '1.2.3+build.123',
      });
    });

    it('should parse versions with both prerelease and build', () => {
      const version = parseVersion('1.2.3-beta.2+build.456');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'beta.2',
        build: 'build.456',
        raw: '1.2.3-beta.2+build.456',
      });
    });

    it('should throw error for invalid versions', () => {
      expect(() => parseVersion('invalid')).toThrow('Invalid version format');
      expect(() => parseVersion('1.2')).toThrow('Invalid version format');
      expect(() => parseVersion('1.2.3.4')).toThrow('Invalid version format');
    });
  });

  describe('compareVersions', () => {
    it('should compare major versions correctly', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should compare minor versions correctly', () => {
      expect(compareVersions('1.2.0', '1.1.0')).toBeGreaterThan(0);
      expect(compareVersions('1.1.0', '1.2.0')).toBeLessThan(0);
    });

    it('should compare patch versions correctly', () => {
      expect(compareVersions('1.0.2', '1.0.1')).toBeGreaterThan(0);
      expect(compareVersions('1.0.1', '1.0.2')).toBeLessThan(0);
    });

    it('should handle prerelease versions correctly', () => {
      expect(compareVersions('1.0.0', '1.0.0-alpha')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0-alpha', '1.0.0')).toBeLessThan(0);
      expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
      expect(compareVersions('1.0.0-beta', '1.0.0-alpha')).toBeGreaterThan(0);
    });

    it('should handle complex prerelease versions', () => {
      expect(compareVersions('1.0.0-alpha.1', '1.0.0-alpha.2')).toBeLessThan(0);
      expect(compareVersions('1.0.0-alpha.2', '1.0.0-alpha.1')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0-alpha.1', '1.0.0-alpha.1')).toBe(0);
    });
  });

  describe('hasUpdateAvailable', () => {
    it('should detect when update is available', () => {
      expect(hasUpdateAvailable('1.0.0', '1.0.1')).toBe(true);
      expect(hasUpdateAvailable('1.0.0', '1.1.0')).toBe(true);
      expect(hasUpdateAvailable('1.0.0', '2.0.0')).toBe(true);
    });

    it('should detect when no update is available', () => {
      expect(hasUpdateAvailable('1.0.1', '1.0.0')).toBe(false);
      expect(hasUpdateAvailable('1.0.0', '1.0.0')).toBe(false);
      expect(hasUpdateAvailable('2.0.0', '1.0.0')).toBe(false);
    });
  });

  describe('getUpdateType', () => {
    it('should identify major updates', () => {
      expect(getUpdateType('1.0.0', '2.0.0')).toBe('major');
    });

    it('should identify minor updates', () => {
      expect(getUpdateType('1.0.0', '1.1.0')).toBe('minor');
    });

    it('should identify patch updates', () => {
      expect(getUpdateType('1.0.0', '1.0.1')).toBe('patch');
    });

    it('should identify prerelease updates', () => {
      expect(getUpdateType('1.0.0-alpha.1', '1.0.0-alpha.2')).toBe('prerelease');
    });

    it('should return none when no update', () => {
      expect(getUpdateType('1.0.0', '1.0.0')).toBe('none');
      expect(getUpdateType('1.0.1', '1.0.0')).toBe('none');
    });
  });

  describe('compareVersionsDetailed', () => {
    it('should return detailed comparison result', () => {
      const result = compareVersionsDetailed('1.0.0', '1.0.1');
      
      expect(result.hasUpdate).toBe(true);
      expect(result.updateType).toBe('patch');
      expect(result.current.raw).toBe('1.0.0');
      expect(result.latest.raw).toBe('1.0.1');
    });
  });

  describe('formatVersionForDisplay', () => {
    it('should format version for display', () => {
      const version = parseVersion('1.2.3-alpha.1');
      expect(formatVersionForDisplay(version)).toBe('v1.2.3-alpha.1');
    });

    it('should format version without prerelease', () => {
      const version = parseVersion('1.2.3');
      expect(formatVersionForDisplay(version)).toBe('v1.2.3');
    });
  });

  describe('isValidVersion', () => {
    it('should validate correct versions', () => {
      expect(isValidVersion('1.0.0')).toBe(true);
      expect(isValidVersion('v1.0.0')).toBe(true);
      expect(isValidVersion('1.0.0-alpha')).toBe(true);
      expect(isValidVersion('1.0.0+build')).toBe(true);
    });

    it('should reject invalid versions', () => {
      expect(isValidVersion('invalid')).toBe(false);
      expect(isValidVersion('1.0')).toBe(false);
      expect(isValidVersion('')).toBe(false);
    });
  });
});
