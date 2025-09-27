/**
 * Optimized Cache Manager for THB Classroom Monitor
 * Provides in-memory caching with TTL and performance monitoring
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

class OptimizedCacheManager {
  private cache = new Map<string, CacheItem<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default
  private maxCacheSize = 100
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Update hit count and stats
    item.hits++
    this.stats.hits++
    return item.data
  }

  /**
   * Set item in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const itemTTL = ttl || this.defaultTTL

    // Evict old items if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed()
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: itemTTL,
      hits: 0
    })

    this.stats.sets++
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.resetStats()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
      cacheSize: this.cache.size,
      maxSize: this.maxCacheSize
    }
  }

  /**
   * Get or set with automatic caching
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    
    if (cached !== null) {
      return cached
    }

    const data = await fetchFunction()
    this.set(key, data, ttl)
    return data
  }

  /**
   * Evict least recently used items
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = ''
    let oldestTimestamp = Date.now()
    let lowestHits = Infinity

    this.cache.forEach((item, key) => {
      if (item.hits < lowestHits || 
         (item.hits === lowestHits && item.timestamp < oldestTimestamp)) {
        oldestKey = key
        oldestTimestamp = item.timestamp
        lowestHits = item.hits
      }
    })

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
    }
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    }
  }

  /**
   * Clean expired items
   */
  cleanExpired(): number {
    const now = Date.now()
    let cleaned = 0
    const keysToDelete: string[] = []

    this.cache.forEach((item, key) => {
      if (now > item.timestamp + item.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      cleaned++
    })

    return cleaned
  }
}

// Singleton instance
export const cacheManager = new OptimizedCacheManager()

// Cache keys for different data types
export const CACHE_KEYS = {
  STUDENT_LOOKUP: (identifier: string) => `student:${identifier}`,
  ASSIGNMENTS: (courseId: string) => `assignments:${courseId}`,
  STUDENTS_LIST: (courseId: string) => `students:${courseId}`,
  ANALYTICS: (studentId: string) => `analytics:${studentId}`,
  COURSE_DATA: (courseId: string) => `course:${courseId}`
} as const

export default cacheManager
