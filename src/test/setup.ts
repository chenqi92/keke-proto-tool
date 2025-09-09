import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock Tauri APIs for testing environment
const mockTauriApi = {
  invoke: vi.fn().mockResolvedValue({}),
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn().mockResolvedValue(undefined),
  transformCallback: vi.fn(),
};

// Mock @tauri-apps/api modules
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockTauriApi.invoke,
  transformCallback: mockTauriApi.transformCallback,
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockTauriApi.listen,
  emit: mockTauriApi.emit,
}));

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn().mockResolvedValue('0.0.2'),
}));

// Mock window.__TAURI__ object
Object.defineProperty(window, '__TAURI__', {
  value: {
    invoke: mockTauriApi.invoke,
    listen: mockTauriApi.listen,
    emit: mockTauriApi.emit,
    transformCallback: mockTauriApi.transformCallback,
  },
  writable: true,
});

// Mark as Vitest environment
Object.defineProperty(window, '__VITEST__', {
  value: true,
  writable: true,
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
};
