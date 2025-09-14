import { useState, useEffect } from 'react';
import { platform } from '@tauri-apps/plugin-os';

export type Platform = 'macos' | 'windows' | 'linux' | 'unknown';

export interface PlatformInfo {
  platform: Platform;
  isMacOS: boolean;
  isWindows: boolean;
  isLinux: boolean;
}

export const usePlatform = (): PlatformInfo => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    platform: 'unknown',
    isMacOS: false,
    isWindows: false,
    isLinux: false,
  });

  useEffect(() => {
    const detectPlatform = async () => {
      try {
        const platformName = await platform();
        
        let detectedPlatform: Platform = 'unknown';
        switch (platformName) {
          case 'macos':
            detectedPlatform = 'macos';
            break;
          case 'windows':
            detectedPlatform = 'windows';
            break;
          case 'linux':
            detectedPlatform = 'linux';
            break;
          default:
            detectedPlatform = 'unknown';
        }

        setPlatformInfo({
          platform: detectedPlatform,
          isMacOS: detectedPlatform === 'macos',
          isWindows: detectedPlatform === 'windows',
          isLinux: detectedPlatform === 'linux',
        });
      } catch (error) {
        console.warn('Failed to detect platform:', error);
        // Fallback to user agent detection
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('mac')) {
          setPlatformInfo({
            platform: 'macos',
            isMacOS: true,
            isWindows: false,
            isLinux: false,
          });
        } else if (userAgent.includes('win')) {
          setPlatformInfo({
            platform: 'windows',
            isMacOS: false,
            isWindows: true,
            isLinux: false,
          });
        } else if (userAgent.includes('linux')) {
          setPlatformInfo({
            platform: 'linux',
            isMacOS: false,
            isWindows: false,
            isLinux: true,
          });
        }
      }
    };

    detectPlatform();
  }, []);

  return platformInfo;
};
