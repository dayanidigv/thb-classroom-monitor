import { io, Socket } from 'socket.io-client'

export interface Notification {
  id: string
  type: 'assignment_due' | 'grade_released' | 'low_performance' | 'missing_submission' | 'achievement' | 'announcement'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: Date
  read: boolean
  studentId?: string
  assignmentId?: string
  metadata?: Record<string, any>
}

export interface NotificationPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  assignmentReminders: boolean
  gradeAlerts: boolean
  performanceAlerts: boolean
  achievementNotifications: boolean
}

class NotificationManager {
  private static instance: NotificationManager
  private socket: Socket | null = null
  private notifications: Notification[] = []
  private preferences: NotificationPreferences = {
    emailNotifications: true,
    pushNotifications: true,
    assignmentReminders: true,
    gradeAlerts: true,
    performanceAlerts: true,
    achievementNotifications: true
  }

  private constructor() {
    this.initializeSocket()
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  private initializeSocket() {
    if (typeof window !== 'undefined') {
      this.socket = io('/api/notifications', {
        transports: ['websocket', 'polling']
      })

      this.socket.on('notification', (notification: Notification) => {
        this.addNotification(notification)
      })

      this.socket.on('connect', () => {
        console.log('Notification socket connected')
      })

      this.socket.on('disconnect', () => {
        console.log('Notification socket disconnected')
      })
    }
  }

  public addNotification(notification: Notification) {
    this.notifications.unshift(notification)
    
    // Limit to 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100)
    }

    // Show browser notification if enabled
    if (this.preferences.pushNotifications && 'Notification' in window) {
      this.showBrowserNotification(notification)
    }

    // Trigger custom event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }))
    }
  }

  private showBrowserNotification(notification: Notification) {
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      })
    }
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }

  public getNotifications(): Notification[] {
    return this.notifications
  }

  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  public markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  public markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
  }

  public clearNotifications() {
    this.notifications = []
  }

  public updatePreferences(preferences: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...preferences }
    localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences))
  }

  public getPreferences(): NotificationPreferences {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notificationPreferences')
      if (saved) {
        this.preferences = JSON.parse(saved)
      }
    }
    return this.preferences
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}

export const notificationManager = NotificationManager.getInstance()

// Utility functions for creating specific notification types
export const createAssignmentDueNotification = (assignmentTitle: string, dueDate: Date, studentId?: string): Notification => ({
  id: `assignment_due_${Date.now()}`,
  type: 'assignment_due',
  title: 'Assignment Due Soon',
  message: `"${assignmentTitle}" is due on ${dueDate.toLocaleDateString()}`,
  priority: 'high',
  timestamp: new Date(),
  read: false,
  studentId,
  assignmentId: assignmentTitle,
  metadata: { dueDate: dueDate.toISOString() }
})

export const createGradeReleasedNotification = (assignmentTitle: string, grade: number, studentId: string): Notification => ({
  id: `grade_released_${Date.now()}`,
  type: 'grade_released',
  title: 'New Grade Available',
  message: `Your grade for "${assignmentTitle}" is now available: ${grade}%`,
  priority: 'medium',
  timestamp: new Date(),
  read: false,
  studentId,
  assignmentId: assignmentTitle,
  metadata: { grade }
})

export const createLowPerformanceNotification = (studentName: string, completionRate: number): Notification => ({
  id: `low_performance_${Date.now()}`,
  type: 'low_performance',
  title: 'Student Needs Attention',
  message: `${studentName} has a completion rate of ${completionRate}% and may need additional support`,
  priority: 'urgent',
  timestamp: new Date(),
  read: false,
  metadata: { completionRate }
})

export const createAchievementNotification = (studentName: string, achievement: string): Notification => ({
  id: `achievement_${Date.now()}`,
  type: 'achievement',
  title: 'Achievement Unlocked!',
  message: `${studentName} has earned: ${achievement}`,
  priority: 'low',
  timestamp: new Date(),
  read: false,
  metadata: { achievement }
})
