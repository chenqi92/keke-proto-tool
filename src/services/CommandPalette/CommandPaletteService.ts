// Command Palette Service - Global event emitter for command palette

type CommandPaletteEventType = 'open' | 'close' | 'toggle';

type CommandPaletteEventListener = () => void;

/**
 * Global service for managing command palette state
 */
class CommandPaletteService {
  private listeners: Map<CommandPaletteEventType, Set<CommandPaletteEventListener>> = new Map();

  constructor() {
    this.listeners.set('open', new Set());
    this.listeners.set('close', new Set());
    this.listeners.set('toggle', new Set());
  }

  /**
   * Add event listener
   */
  on(event: CommandPaletteEventType, listener: CommandPaletteEventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.add(listener);
    }
  }

  /**
   * Remove event listener
   */
  off(event: CommandPaletteEventType, listener: CommandPaletteEventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event
   */
  private emit(event: CommandPaletteEventType): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener());
    }
  }

  /**
   * Open command palette
   */
  open(): void {
    this.emit('open');
  }

  /**
   * Close command palette
   */
  close(): void {
    this.emit('close');
  }

  /**
   * Toggle command palette
   */
  toggle(): void {
    this.emit('toggle');
  }
}

// Singleton instance
export const commandPaletteService = new CommandPaletteService();

