import React from 'react'
import { useAppStore } from './store'

export class DataSyncManager {
  private syncInterval: NodeJS.Timeout | null = null
  private isOnline = true
  private lastSyncTime: Date | null = null

  constructor(private intervalMs: number = 30000) { // 30 seconds default
    this.setupOnlineListener()
  }

  private setupOnlineListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.startSync()
      })

      window.addEventListener('offline', () => {
        this.isOnline = false
        this.stopSync()
      })

      this.isOnline = navigator.onLine
    }
  }

  startSync() {
    if (!this.isOnline || this.syncInterval) return

    this.syncInterval = setInterval(async () => {
      await this.performSync()
    }, this.intervalMs)

    // Perform initial sync
    this.performSync()
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  private async performSync() {
    const { fetchClassroomData, setError } = useAppStore.getState()
    
    if (!this.isOnline) return

    // Check if we have required environment variables
    if (!process.env.GOOGLE_API_KEY || !process.env.CLASSROOM_ID) {
      setError('Missing Google API key or Classroom ID in environment variables')
      return
    }

    try {
      console.log('Performing classroom data sync...')
      await fetchClassroomData()
      this.lastSyncTime = new Date()
      setError(null)
    } catch (error) {
      console.error('Sync failed:', error)
      setError('Failed to sync classroom data. Please check your connection.')
    }
  }

  getLastSyncTime() {
    return this.lastSyncTime
  }

  isConnected() {
    return this.isOnline
  }

  forceSync() {
    return this.performSync()
  }
}

// React hook for using the sync manager
export function useSyncManager(intervalMs?: number) {
  const [syncManager] = React.useState(() => new DataSyncManager(intervalMs))
  const [lastSync, setLastSync] = React.useState<Date | null>(null)
  const [isOnline, setIsOnline] = React.useState(true)

  React.useEffect(() => {
    syncManager.startSync()

    const checkSyncStatus = setInterval(() => {
      setLastSync(syncManager.getLastSyncTime())
      setIsOnline(syncManager.isConnected())
    }, 1000)

    return () => {
      syncManager.stopSync()
      clearInterval(checkSyncStatus)
    }
  }, [syncManager])

  return {
    lastSync,
    isOnline,
    forceSync: () => syncManager.forceSync()
  }
}

// Utility function to format sync time
export function formatSyncTime(date: Date | null): string {
  if (!date) return 'Never'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  
  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  return date.toLocaleDateString()
}
