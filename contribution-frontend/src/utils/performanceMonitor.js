/**
 * Frontend Performance Monitoring Service
 * Tracks and reports on application performance metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.thresholds = {
      pageLoad: 3000, // 3 seconds
      apiCall: 1000, // 1 second
      componentRender: 100, // 100ms
      interaction: 100, // 100ms for user interactions
    };
  }

  /**
   * Track page load performance
   */
  trackPageLoad() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const metrics = {
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        pageLoad: timing.loadEventEnd - timing.navigationStart,
        timeToFirstByte: timing.responseStart - timing.navigationStart,
        domInteractive: timing.domInteractive - timing.navigationStart,
      };

      this.metrics.pageLoad = metrics;
      this.logMetric('pageLoad', metrics);
      return metrics;
    }
  }

  /**
   * Track API call performance
   */
  trackApiCall(endpoint, duration, status) {
    if (!this.metrics.apiCalls) {
      this.metrics.apiCalls = [];
    }

    const metric = {
      endpoint,
      duration,
      status,
      timestamp: Date.now(),
      slow: duration > this.thresholds.apiCall,
    };

    this.metrics.apiCalls.push(metric);
    this.logMetric('api', metric);
    return metric;
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName, duration) {
    if (!this.metrics.components) {
      this.metrics.components = [];
    }

    const metric = {
      component: componentName,
      duration,
      timestamp: Date.now(),
      slow: duration > this.thresholds.componentRender,
    };

    this.metrics.components.push(metric);
    this.logMetric('component', metric);
    return metric;
  }

  /**
   * Track Core Web Vitals
   */
  trackWebVitals() {
    const vitals = {};

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
        this.logMetric('lcp', { value: vitals.lcp, unit: 'ms' });
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0];
        vitals.fid = firstEntry.processingDuration;
        this.logMetric('fid', { value: vitals.fid, unit: 'ms' });
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift (CLS)
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        vitals.cls = clsValue;
        this.logMetric('cls', { value: vitals.cls });
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }

    return vitals;
  }

  /**
   * Track user interaction performance
   */
  trackInteraction(name, duration) {
    if (!this.metrics.interactions) {
      this.metrics.interactions = [];
    }

    const metric = {
      name,
      duration,
      timestamp: Date.now(),
      slow: duration > this.thresholds.interaction,
    };

    this.metrics.interactions.push(metric);
    this.logMetric('interaction', metric);
    return metric;
  }

  /**
   * Track memory usage
   */
  trackMemory() {
    if (performance.memory) {
      const memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        percentUsed:
          (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100,
      };

      this.metrics.memory = memory;
      this.logMetric('memory', memory);
      return memory;
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const summary = {
      pageLoad: this.metrics.pageLoad,
      slowApiCalls: (this.metrics.apiCalls || []).filter(c => c.slow).length,
      totalApiCalls: (this.metrics.apiCalls || []).length,
      averageApiTime: this.getAverageApiTime(),
      slowComponents: (this.metrics.components || []).filter(c => c.slow).length,
      totalComponents: (this.metrics.components || []).length,
      memory: this.metrics.memory,
      webVitals: this.metrics.webVitals,
    };

    return summary;
  }

  /**
   * Get average API call time
   */
  getAverageApiTime() {
    const apiCalls = this.metrics.apiCalls || [];
    if (apiCalls.length === 0) return 0;

    const total = apiCalls.reduce((sum, call) => sum + call.duration, 0);
    return Math.round(total / apiCalls.length);
  }

  /**
   * Log metric to console or external service
   */
  logMetric(category, data) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${category}:`, data);
    }

    // Send to external service in production
    // this.sendToAnalytics(category, data);
  }

  /**
   * Send metrics to external analytics service
   */
  async sendToAnalytics(category, data) {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, data, timestamp: Date.now() }),
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics = {};
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics() {
    return JSON.stringify(this.getSummary(), null, 2);
  }

  /**
   * Check if performance is within thresholds
   */
  checkThresholds() {
    const issues = [];

    if (this.metrics.pageLoad?.pageLoad > this.thresholds.pageLoad) {
      issues.push(`Page load time (${this.metrics.pageLoad.pageLoad}ms) exceeds threshold`);
    }

    const slowApis = (this.metrics.apiCalls || []).filter(c => c.slow);
    if (slowApis.length > 0) {
      issues.push(`${slowApis.length} API calls exceeded ${this.thresholds.apiCall}ms threshold`);
    }

    const slowComponents = (this.metrics.components || []).filter(c => c.slow);
    if (slowComponents.length > 0) {
      issues.push(`${slowComponents.length} components exceeded ${this.thresholds.componentRender}ms threshold`);
    }

    return issues;
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Initialize tracking on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceMonitor.trackPageLoad();
      performanceMonitor.trackWebVitals();
      performanceMonitor.trackMemory();
    });
  } else {
    performanceMonitor.trackPageLoad();
    performanceMonitor.trackWebVitals();
    performanceMonitor.trackMemory();
  }
}

export default performanceMonitor;
