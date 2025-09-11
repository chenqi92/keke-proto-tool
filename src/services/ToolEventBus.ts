import { EventBus } from '@/types/toolbox';

type EventHandler = (...args: any[]) => void;

export class ToolEventBus implements EventBus {
  private listeners = new Map<string, EventHandler[]>();
  private onceListeners = new Map<string, EventHandler[]>();
  private maxListeners = 100; // Prevent memory leaks
  private debugMode = false;

  constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  on(event: string, handler: EventHandler): void {
    this.validateEvent(event);
    this.validateHandler(handler);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const handlers = this.listeners.get(event)!;
    
    // Check for duplicate handlers
    if (handlers.includes(handler)) {
      console.warn(`Handler already registered for event: ${event}`);
      return;
    }

    // Check max listeners limit
    if (handlers.length >= this.maxListeners) {
      console.warn(`Maximum listeners (${this.maxListeners}) reached for event: ${event}`);
      return;
    }

    handlers.push(handler);

    if (this.debugMode) {
      console.log(`Event listener registered: ${event} (${handlers.length} total)`);
    }
  }

  off(event: string, handler: EventHandler): void {
    this.validateEvent(event);
    this.validateHandler(handler);

    // Remove from regular listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        
        if (handlers.length === 0) {
          this.listeners.delete(event);
        }

        if (this.debugMode) {
          console.log(`Event listener removed: ${event} (${handlers.length} remaining)`);
        }
        return;
      }
    }

    // Remove from once listeners
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      const index = onceHandlers.indexOf(handler);
      if (index > -1) {
        onceHandlers.splice(index, 1);
        
        if (onceHandlers.length === 0) {
          this.onceListeners.delete(event);
        }

        if (this.debugMode) {
          console.log(`Event once-listener removed: ${event} (${onceHandlers.length} remaining)`);
        }
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    this.validateEvent(event);

    if (this.debugMode) {
      console.log(`Event emitted: ${event}`, args);
    }

    // Call regular listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      // Create a copy to avoid issues if handlers are modified during execution
      const handlersCopy = [...handlers];
      
      handlersCopy.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }

    // Call once listeners and remove them
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      const handlersCopy = [...onceHandlers];
      this.onceListeners.delete(event); // Remove all once listeners
      
      handlersCopy.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in once event handler for ${event}:`, error);
        }
      });
    }
  }

  once(event: string, handler: EventHandler): void {
    this.validateEvent(event);
    this.validateHandler(handler);

    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }

    const handlers = this.onceListeners.get(event)!;
    
    // Check for duplicate handlers
    if (handlers.includes(handler)) {
      console.warn(`Once handler already registered for event: ${event}`);
      return;
    }

    // Check max listeners limit
    if (handlers.length >= this.maxListeners) {
      console.warn(`Maximum once listeners (${this.maxListeners}) reached for event: ${event}`);
      return;
    }

    handlers.push(handler);

    if (this.debugMode) {
      console.log(`Event once-listener registered: ${event} (${handlers.length} total)`);
    }
  }

  // Additional utility methods
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
      
      if (this.debugMode) {
        console.log(`All listeners removed for event: ${event}`);
      }
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
      
      if (this.debugMode) {
        console.log('All event listeners removed');
      }
    }
  }

  hasListeners(event: string): boolean {
    return (this.listeners.get(event)?.length || 0) > 0 || 
           (this.onceListeners.get(event)?.length || 0) > 0;
  }

  getListenerCount(event: string): number {
    return (this.listeners.get(event)?.length || 0) + 
           (this.onceListeners.get(event)?.length || 0);
  }

  getEvents(): string[] {
    const events = new Set<string>();
    this.listeners.forEach((_, event) => events.add(event));
    this.onceListeners.forEach((_, event) => events.add(event));
    return Array.from(events);
  }

  // Async event emission with error handling
  async emitAsync(event: string, ...args: any[]): Promise<void> {
    this.validateEvent(event);

    if (this.debugMode) {
      console.log(`Async event emitted: ${event}`, args);
    }

    const promises: Promise<void>[] = [];

    // Handle regular listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        promises.push(
          Promise.resolve().then(() => handler(...args)).catch(error => {
            console.error(`Error in async event handler for ${event}:`, error);
          })
        );
      });
    }

    // Handle once listeners
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      const handlersCopy = [...onceHandlers];
      this.onceListeners.delete(event);
      
      handlersCopy.forEach(handler => {
        promises.push(
          Promise.resolve().then(() => handler(...args)).catch(error => {
            console.error(`Error in async once event handler for ${event}:`, error);
          })
        );
      });
    }

    await Promise.all(promises);
  }

  // Event namespacing support
  emitNamespaced(namespace: string, event: string, ...args: any[]): void {
    const namespacedEvent = `${namespace}:${event}`;
    this.emit(namespacedEvent, ...args);
    
    // Also emit to wildcard listeners for this namespace
    this.emit(`${namespace}:*`, event, ...args);
  }

  onNamespaced(namespace: string, event: string, handler: EventHandler): void {
    const namespacedEvent = `${namespace}:${event}`;
    this.on(namespacedEvent, handler);
  }

  offNamespaced(namespace: string, event: string, handler: EventHandler): void {
    const namespacedEvent = `${namespace}:${event}`;
    this.off(namespacedEvent, handler);
  }

  // Validation methods
  private validateEvent(event: string): void {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }
  }

  private validateHandler(handler: EventHandler): void {
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }
  }

  // Configuration
  setMaxListeners(max: number): void {
    this.maxListeners = Math.max(1, max);
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  // Statistics and monitoring
  getStats() {
    const regularEvents = Array.from(this.listeners.entries());
    const onceEvents = Array.from(this.onceListeners.entries());
    
    return {
      totalEvents: regularEvents.length + onceEvents.length,
      regularEvents: regularEvents.length,
      onceEvents: onceEvents.length,
      totalListeners: regularEvents.reduce((sum, [_, handlers]) => sum + handlers.length, 0) +
                     onceEvents.reduce((sum, [_, handlers]) => sum + handlers.length, 0),
      eventDetails: {
        regular: Object.fromEntries(regularEvents.map(([event, handlers]) => [event, handlers.length])),
        once: Object.fromEntries(onceEvents.map(([event, handlers]) => [event, handlers.length]))
      }
    };
  }

  // Memory cleanup
  cleanup(): void {
    this.removeAllListeners();
    
    if (this.debugMode) {
      console.log('Event bus cleaned up');
    }
  }
}

// Singleton instance
export const toolEventBus = new ToolEventBus();
