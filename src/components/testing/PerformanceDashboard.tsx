/**
 * Performance Dashboard Component
 * Real-time monitoring of application performance metrics
 */

import React, { useState, useEffect } from 'react'
import { performanceMonitor } from '../../lib/performance-monitor'
import { cacheManager } from '../../lib/cache-manager'
import { Activity, Database, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface PerformanceDashboardProps {
  refreshInterval?: number
  isVisible?: boolean
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  refreshInterval = 5000,
  isVisible = false 
}) => {
  const [stats, setStats] = useState<any>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!isVisible) return

    const updateStats = () => {
      setStats(performanceMonitor.getPerformanceReport())
      setCacheStats(cacheManager.getStats())
    }

    updateStats()
    const interval = setInterval(updateStats, refreshInterval)

    return () => clearInterval(interval)
  }, [isVisible, refreshInterval])

  if (!isVisible) return null

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600 bg-green-50'
    if (value <= thresholds.warning) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white shadow-xl rounded-lg border border-gray-200 max-w-sm">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 border-b border-gray-200 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-gray-900">Performance Monitor</span>
          </div>
          <div className="flex items-center space-x-2">
            {stats?.api && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                parseFloat(stats.api.errorRate) < 5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {stats.api.errorRate}% errors
              </div>
            )}
            <button className="text-gray-400 hover:text-gray-600">
              {isExpanded ? '−' : '+'}
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-3 space-y-4 max-h-96 overflow-y-auto">
            {/* API Performance */}
            {stats?.api && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-900">API Performance</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-600">Total Calls</div>
                    <div className="font-medium">{stats.api.totalCalls}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-600">Avg Duration</div>
                    <div className={`font-medium ${getStatusColor(stats.api.avgDuration, { good: 200, warning: 500 })}`}>
                      {stats.api.avgDuration}ms
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-600">Error Rate</div>
                    <div className={`font-medium ${getStatusColor(parseFloat(stats.api.errorRate), { good: 2, warning: 5 })}`}>
                      {stats.api.errorRate}%
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-600">Cache Hit</div>
                    <div className="font-medium text-green-600">
                      {stats.api.cacheHitRate}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cache Performance */}
            {cacheStats && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-gray-900">Cache Performance</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-600">Hit Rate</div>
                    <div className={`font-medium ${getStatusColor(100 - cacheStats.hitRate, { good: 20, warning: 40 })}`}>
                      {cacheStats.hitRate}%
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-600">Cache Size</div>
                    <div className="font-medium">
                      {cacheStats.cacheSize}/{cacheStats.maxSize}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-600">Total Requests</div>
                    <div className="font-medium">{cacheStats.totalRequests}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-600">Evictions</div>
                    <div className="font-medium">{cacheStats.evictions}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Indicators */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-gray-900">Health Status</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>API Health</span>
                  <span className={
                    !stats?.api || parseFloat(stats.api.errorRate) < 5 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }>
                    {!stats?.api || parseFloat(stats.api.errorRate) < 5 ? '✓ Good' : '⚠ Issues'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cache Efficiency</span>
                  <span className={
                    !cacheStats || cacheStats.hitRate > 60 
                      ? 'text-green-600' 
                      : 'text-yellow-600'
                  }>
                    {!cacheStats || cacheStats.hitRate > 60 ? '✓ Good' : '○ Fair'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Response Time</span>
                  <span className={
                    !stats?.api || stats.api.avgDuration < 300 
                      ? 'text-green-600' 
                      : 'text-yellow-600'
                  }>
                    {!stats?.api || stats.api.avgDuration < 300 ? '✓ Fast' : '○ Slow'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-2 border-t border-gray-200">
              <button 
                onClick={() => {
                  cacheManager.clear()
                  performanceMonitor.clear()
                  setStats(null)
                  setCacheStats(null)
                }}
                className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-2 rounded"
              >
                Clear Data
              </button>
              <button 
                onClick={() => {
                  const data = {
                    performance: performanceMonitor.getPerformanceReport(),
                    cache: cacheManager.getStats(),
                    timestamp: new Date().toISOString()
                  }
                  
                  // Download as JSON
                  const blob = new Blob([JSON.stringify(data, null, 2)], { 
                    type: 'application/json' 
                  })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `performance-report-${Date.now()}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-2 rounded"
              >
                Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PerformanceDashboard