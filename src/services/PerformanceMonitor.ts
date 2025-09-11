interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'tool' | 'ui' | 'network' | 'memory';
  metadata?: Record<string, any>;
}

interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
}

interface PerformanceReport {
  period: { start: number; end: number };
  metrics: PerformanceMetric[];
  summary: {
    toolExecutions: number;
    averageToolTime: number;
    memoryUsage: number;
    uiResponsiveness: number;
  };
  issues: Array<{
    type: 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
  }>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private thresholds: PerformanceThreshold[] = [
    { metric: 'tool-execution-time', warning: 1000, critical: 5000 },
    { metric: 'ui-render-time', warning: 16, critical: 100 },
    { metric: 'memory-usage', warning: 100 * 1024 * 1024, critical: 500 * 1024 * 1024 },
    { metric: 'network-latency', warning: 1000, critical: 5000 }
  ];

  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.setupObservers();
    this.startMemoryMonitoring();
    this.startUIMonitoring();

    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    console.log('Performance monitoring stopped');
  }

  /**
   * Record a custom metric
   */
  recordMetric(
    name: string,
    value: number,
    category: PerformanceMetric['category'],
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      metadata
    };

    this.metrics.push(metric);
    this.checkThresholds(metric);
    this.cleanupOldMetrics();
  }

  /**
   * Start timing a operation
   */
  startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'tool', { startTime });
    };
  }

  /**
   * Measure tool execution performance
   */
  measureToolExecution<T>(
    toolId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return operation().then(
      result => {
        const duration = performance.now() - startTime;
        const endMemory = this.getMemoryUsage();
        
        this.recordMetric('tool-execution-time', duration, 'tool', {
          toolId,
          memoryDelta: endMemory - startMemory,
          success: true
        });

        return result;
      },
      error => {
        const duration = performance.now() - startTime;
        
        this.recordMetric('tool-execution-time', duration, 'tool', {
          toolId,
          success: false,
          error: error.message
        });

        throw error;
      }
    );
  }

  /**
   * Get performance report
   */
  getReport(periodMs: number = 60000): PerformanceReport {
    const now = Date.now();
    const start = now - periodMs;
    
    const periodMetrics = this.metrics.filter(
      metric => metric.timestamp >= start
    );

    const toolMetrics = periodMetrics.filter(m => m.category === 'tool');
    const toolExecutions = toolMetrics.length;
    const averageToolTime = toolExecutions > 0 
      ? toolMetrics.reduce((sum, m) => sum + m.value, 0) / toolExecutions
      : 0;

    const memoryMetrics = periodMetrics.filter(m => m.name === 'memory-usage');
    const currentMemory = memoryMetrics.length > 0 
      ? memoryMetrics[memoryMetrics.length - 1].value
      : 0;

    const uiMetrics = periodMetrics.filter(m => m.category === 'ui');
    const uiResponsiveness = uiMetrics.length > 0
      ? uiMetrics.reduce((sum, m) => sum + (m.value < 16 ? 1 : 0), 0) / uiMetrics.length
      : 1;

    const issues = this.detectIssues(periodMetrics);

    return {
      period: { start, end: now },
      metrics: periodMetrics,
      summary: {
        toolExecutions,
        averageToolTime,
        memoryUsage: currentMemory,
        uiResponsiveness
      },
      issues
    };
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.category === category);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  // Private methods
  private setupObservers(): void {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordMetric('page-load-time', navEntry.loadEventEnd - navEntry.fetchStart, 'ui');
            }
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (error) {
        console.warn('Navigation timing observer not supported:', error);
      }

      // Observe resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              this.recordMetric('resource-load-time', resourceEntry.duration, 'network', {
                name: resourceEntry.name,
                size: resourceEntry.transferSize
              });
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource timing observer not supported:', error);
      }

      // Observe long tasks
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              this.recordMetric('long-task', entry.duration, 'ui', {
                startTime: entry.startTime
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  private startMemoryMonitoring(): void {
    const measureMemory = () => {
      if (!this.isMonitoring) return;

      const memoryUsage = this.getMemoryUsage();
      this.recordMetric('memory-usage', memoryUsage, 'memory');

      setTimeout(measureMemory, 5000); // Every 5 seconds
    };

    measureMemory();
  }

  private startUIMonitoring(): void {
    let lastFrameTime = performance.now();

    const measureFrameTime = () => {
      if (!this.isMonitoring) return;

      const currentTime = performance.now();
      const frameTime = currentTime - lastFrameTime;
      
      this.recordMetric('frame-time', frameTime, 'ui');
      lastFrameTime = currentTime;

      requestAnimationFrame(measureFrameTime);
    };

    requestAnimationFrame(measureFrameTime);
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.find(t => t.metric === metric.name);
    if (!threshold) return;

    if (metric.value >= threshold.critical) {
      console.error(`Critical performance issue: ${metric.name} = ${metric.value}ms (threshold: ${threshold.critical}ms)`);
    } else if (metric.value >= threshold.warning) {
      console.warn(`Performance warning: ${metric.name} = ${metric.value}ms (threshold: ${threshold.warning}ms)`);
    }
  }

  private detectIssues(metrics: PerformanceMetric[]): PerformanceReport['issues'] {
    const issues: PerformanceReport['issues'] = [];

    for (const threshold of this.thresholds) {
      const relevantMetrics = metrics.filter(m => m.name === threshold.metric);
      
      for (const metric of relevantMetrics) {
        if (metric.value >= threshold.critical) {
          issues.push({
            type: 'critical',
            message: `${metric.name} 超过临界值`,
            metric: metric.name,
            value: metric.value
          });
        } else if (metric.value >= threshold.warning) {
          issues.push({
            type: 'warning',
            message: `${metric.name} 超过警告值`,
            metric: metric.name,
            value: metric.value
          });
        }
      }
    }

    return issues;
  }

  private cleanupOldMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
import React from 'react';

export function usePerformanceMonitoring() {
  const [report, setReport] = React.useState<PerformanceReport | null>(null);

  React.useEffect(() => {
    performanceMonitor.start();

    const updateReport = () => {
      setReport(performanceMonitor.getReport());
    };

    const interval = setInterval(updateReport, 10000); // Update every 10 seconds
    updateReport(); // Initial update

    return () => {
      clearInterval(interval);
      performanceMonitor.stop();
    };
  }, []);

  return {
    report,
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    startTiming: performanceMonitor.startTiming.bind(performanceMonitor),
    measureToolExecution: performanceMonitor.measureToolExecution.bind(performanceMonitor)
  };
}
