/**
 * Advanced Performance Monitoring System for THB Classroom Monitor
 * Tracks API calls, render times, cache efficiency, and user interactions
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  category: 'api' | 'render' | 'cache' | 'user' | 'memory'
  metadata?: Record<string, any>
}

interface APICallMetric {
  url: string
  method: string
  duration: number
  status: number
  size: number
  cached: boolean
  timestamp: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private apiCalls: APICallMetric[] = []
  private renderTimes = new Map<string, number>()
  private memoryUsage: number[] = []
  private maxMetrics = 1000

  /**
   * Track API call performance
   */
  trackAPICall(
    url: string,
    method: string,
    startTime: number,
    endTime: number,
    status: number,
    responseSize: number = 0,
    cached: boolean = false
  ): void {
    const duration = endTime - startTime
    
    this.apiCalls.push({
      url,
      method,
      duration,
      status,
      size: responseSize,
      cached,
      timestamp: Date.now()
    })

    this.addMetric({
      name: 'api_call_duration',
      value: duration,
      timestamp: Date.now(),
      category: 'api',
      metadata: { url, method, status, cached }
    })

    // Keep only recent API calls
    if (this.apiCalls.length > this.maxMetrics) {
      this.apiCalls = this.apiCalls.slice(-this.maxMetrics / 2)
    }
  }

  /**
   * Get API performance statistics
   */
  getAPIStats() {
    if (this.apiCalls.length === 0) return null

    const totalCalls = this.apiCalls.length
    const cachedCalls = this.apiCalls.filter(call => call.cached).length
    const failedCalls = this.apiCalls.filter(call => call.status >= 400).length
    
    const durations = this.apiCalls.map(call => call.duration)
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / totalCalls
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)

    return {
      totalCalls,
      cachedCalls,
      failedCalls,
      cacheHitRate: ((cachedCalls / totalCalls) * 100).toFixed(2),
      errorRate: ((failedCalls / totalCalls) * 100).toFixed(2),
      avgDuration: Math.round(avgDuration),
      maxDuration,
      minDuration
    }
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    return {
      timestamp: Date.now(),
      api: this.getAPIStats(),
      totalMetrics: this.metrics.length
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
    this.apiCalls = []
    this.renderTimes.clear()
    this.memoryUsage = []
  }

  // Private methods
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2)
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Helper function to wrap fetch with performance tracking
export const trackedFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const startTime = performance.now()
  const method = options?.method || 'GET'
  
  try {
    const response = await fetch(url, options)
    const endTime = performance.now()
    
    // Get response size if possible
    const contentLength = response.headers.get('content-length')
    const size = contentLength ? parseInt(contentLength) : 0
    
    // Check if response was cached
    const cached = response.headers.get('x-cache-hit') === 'true'
    
    performanceMonitor.trackAPICall(
      url,
      method,
      startTime,
      endTime,
      response.status,
      size,
      cached
    )
    
    return response
  } catch (error) {
    const endTime = performance.now()
    performanceMonitor.trackAPICall(url, method, startTime, endTime, 0, 0, false)
    throw error
  }
}

export default performanceMonitor
