/**
 * Optimized Data Fetching Hook for THB Classroom Monitor
 * Provides caching, deduplication, and efficient data fetching
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { cacheManager, CACHE_KEYS } from '../lib/cache-manager'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastFetched: number | null
}

interface UseOptimizedDataOptions {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
  cacheTime?: number
}

/**
 * Hook for optimized student data fetching with caching
 */
export function useOptimizedStudentData(
  studentId: string, 
  options: UseOptimizedDataOptions = {}
) {
  const { 
    enabled = true, 
    refetchInterval, 
    staleTime = 30000, // 30 seconds
    cacheTime = 300000 // 5 minutes 
  } = options

  const [state, setState] = useState<FetchState<any>>({
    data: null,
    loading: false,
    error: null,
    lastFetched: null
  })

  const timeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!studentId || !enabled) return

    const cacheKey = CACHE_KEYS.STUDENT_LOOKUP(studentId)
    
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
      const cached = cacheManager.get(cacheKey)
      if (cached) {
        setState(prev => ({
          ...prev,
          data: cached,
          loading: false,
          error: null,
          lastFetched: Date.now()
        }))
        return cached
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(
        `/api/classroom/student-lookup?identifier=${encodeURIComponent(studentId)}`,
        { signal: abortControllerRef.current.signal }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch student data: ${response.status}`)
      }

      const data = await response.json()
      const now = Date.now()

      setState({
        data,
        loading: false,
        error: null,
        lastFetched: now
      })

      return data
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return // Request was cancelled
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      
      throw error
    }
  }, [studentId, enabled, staleTime])

  const refetch = useCallback(() => fetchData(true), [fetchData])

  // Initial fetch
  useEffect(() => {
    if (enabled && studentId) {
      fetchData()
    }
  }, [studentId, enabled, fetchData])

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && enabled && studentId) {
      timeoutRef.current = setInterval(() => {
        fetchData()
      }, refetchInterval)

      return () => {
        if (timeoutRef.current) {
          clearInterval(timeoutRef.current)
        }
      }
    }
  }, [refetchInterval, enabled, studentId, fetchData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    ...state,
    refetch,
    isStale: state.lastFetched ? Date.now() - state.lastFetched > staleTime : false
  }
}

/**
 * Hook for optimized assignments data fetching
 */
export function useOptimizedAssignments(courseId?: string) {
  const [state, setState] = useState<FetchState<any[]>>({
    data: null,
    loading: false,
    error: null,
    lastFetched: null
  })

  const fetchAssignments = useCallback(async () => {
    if (!courseId) return

    const cacheKey = CACHE_KEYS.ASSIGNMENTS(courseId)
    const cached = cacheManager.get(cacheKey)
    
    if (cached && Array.isArray(cached)) {
      setState(prev => ({
        ...prev,
        data: cached,
        loading: false,
        lastFetched: Date.now()
      }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch('/api/classroom/assignments')
      if (!response.ok) throw new Error('Failed to fetch assignments')
      
      const data = await response.json()
      cacheManager.set(cacheKey, data, 120000) // Cache for 2 minutes
      
      setState({
        data,
        loading: false,
        error: null,
        lastFetched: Date.now()
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [courseId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  return {
    ...state,
    refetch: fetchAssignments
  }
}

/**
 * Hook for batch data fetching with deduplication
 */
export function useOptimizedBatchData(requests: Array<{ key: string; url: string }>) {
  const [state, setState] = useState<Record<string, FetchState<any>>>({})
  
  const fetchBatch = useCallback(async () => {
    const promises = requests.map(async ({ key, url }) => {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`${response.status}`)
        const data = await response.json()
        return { key, data, error: null }
      } catch (error) {
        return { 
          key, 
          data: null, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    const results = await Promise.allSettled(promises)
    const newState: Record<string, FetchState<any>> = {}
    
    results.forEach((result, index) => {
      const key = requests[index].key
      if (result.status === 'fulfilled') {
        const { data, error } = result.value
        newState[key] = {
          data,
          loading: false,
          error,
          lastFetched: Date.now()
        }
      } else {
        newState[key] = {
          data: null,
          loading: false,
          error: 'Promise rejected',
          lastFetched: Date.now()
        }
      }
    })

    setState(newState)
  }, [requests])

  useEffect(() => {
    if (requests.length > 0) {
      setState(prev => {
        const newState = { ...prev }
        requests.forEach(({ key }) => {
          newState[key] = { 
            data: null, 
            loading: true, 
            error: null, 
            lastFetched: null 
          }
        })
        return newState
      })
      
      fetchBatch()
    }
  }, [fetchBatch])

  return { 
    data: state, 
    refetch: fetchBatch,
    loading: Object.values(state).some(s => s.loading),
    hasError: Object.values(state).some(s => s.error)
  }
}

export default { 
  useOptimizedStudentData, 
  useOptimizedAssignments, 
  useOptimizedBatchData 
}
