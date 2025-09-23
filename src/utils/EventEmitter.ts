// Browser-compatible EventEmitter implementation
// Replaces Node.js EventEmitter for browser compatibility

export type EventListener<T = any> = (data: T) => void;

export class EventEmitter<TEvents extends Record<string, any> = Record<string, any>> {
  private eventListeners: Map<keyof TEvents, Set<EventListener<any>>> = new Map();
  private maxListeners = 10;

  constructor() {
    this.eventListeners = new Map();
  }

  /**
   * Add an event listener
   */
  on<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    const listeners = this.eventListeners.get(event)!;
    
    // Check max listeners
    if (listeners.size >= this.maxListeners) {
      console.warn(`MaxListenersExceededWarning: Possible EventEmitter memory leak detected. ${listeners.size + 1} ${String(event)} listeners added. Use emitter.setMaxListeners() to increase limit.`);
    }

    listeners.add(listener);
    return this;
  }

  /**
   * Add a one-time event listener
   */
  once<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): this {
    const onceWrapper = (data: TEvents[K]) => {
      this.off(event, onceWrapper);
      listener(data);
    };

    return this.on(event, onceWrapper);
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): this {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);

      // Clean up empty listener sets
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
    return this;
  }

  /**
   * Remove all listeners for an event, or all listeners if no event specified
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): this {
    if (event !== undefined) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
    return this;
  }

  /**
   * Emit an event to all listeners
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): boolean {
    const listeners = this.eventListeners.get(event);
    if (!listeners || listeners.size === 0) {
      return false;
    }

    // Create a copy of listeners to avoid issues if listeners are modified during emission
    const listenersArray = Array.from(listeners);
    
    for (const listener of listenersArray) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for '${String(event)}':`, error);
        // Continue with other listeners even if one fails
      }
    }

    return true;
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const listeners = this.eventListeners.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all listeners for an event
   */
  listeners<K extends keyof TEvents>(event: K): EventListener<TEvents[K]>[] {
    const listeners = this.eventListeners.get(event);
    return listeners ? Array.from(listeners) : [];
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): (keyof TEvents)[] {
    return Array.from(this.eventListeners.keys());
  }

  /**
   * Set the maximum number of listeners per event
   */
  setMaxListeners(n: number): this {
    if (n < 0 || !Number.isInteger(n)) {
      throw new RangeError('The value of "n" is out of range. It must be a non-negative integer.');
    }
    this.maxListeners = n;
    return this;
  }

  /**
   * Get the maximum number of listeners per event
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }

  /**
   * Add a listener to the beginning of the listeners array
   */
  prependListener<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): this {
    // Since we're using Set, we can't control order, but we can simulate it
    // by removing and re-adding all listeners
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const existingListeners = Array.from(listeners);
      listeners.clear();
      listeners.add(listener);
      existingListeners.forEach(l => listeners.add(l));
    } else {
      this.on(event, listener);
    }
    return this;
  }

  /**
   * Add a one-time listener to the beginning of the listeners array
   */
  prependOnceListener<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): this {
    const onceWrapper = (data: TEvents[K]) => {
      this.off(event, onceWrapper);
      listener(data);
    };

    return this.prependListener(event, onceWrapper);
  }
}

// Default export for compatibility
export default EventEmitter;
