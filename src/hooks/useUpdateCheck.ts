/**
 * Update Check Hook
 * Manages update checking state and provides user feedback mechanisms
 */

import { useState, useCallback } from 'react';
import { versionUpdateService, UpdateInfo } from '@/services/VersionUpdateService';

export interface UpdateCheckState {
  isChecking: boolean;
  updateInfo: UpdateInfo | null;
  error: string | null;
  lastChecked: Date | null;
}

export interface UpdateCheckActions {
  checkForUpdates: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export interface UseUpdateCheckReturn extends UpdateCheckState, UpdateCheckActions {}

export const useUpdateCheck = (): UseUpdateCheckReturn => {
  const [state, setState] = useState<UpdateCheckState>({
    isChecking: false,
    updateInfo: null,
    error: null,
    lastChecked: null,
  });

  const checkForUpdates = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isChecking: true,
      error: null,
    }));

    try {
      const updateInfo = await versionUpdateService.checkForUpdates();
      setState(prev => ({
        ...prev,
        isChecking: false,
        updateInfo,
        lastChecked: new Date(),
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '检查更新失败';
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: errorMessage,
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isChecking: false,
      updateInfo: null,
      error: null,
      lastChecked: null,
    });
  }, []);

  return {
    ...state,
    checkForUpdates,
    clearError,
    reset,
  };
};
