import React, { useState, useEffect } from 'react'
import { Bell, X, Check, AlertTriangle, BookOpen, Award, MessageSquare, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { notificationManager, Notification, NotificationPreferences } from '../../lib/notifications'

interface NotificationCenterProps {
  className?: string
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>(notificationManager.getPreferences())

  useEffect(() => {
    // Load initial notifications
    setNotifications(notificationManager.getNotifications())
    setUnreadCount(notificationManager.getUnreadCount())

    // Listen for new notifications
    const handleNewNotification = (event: CustomEvent<Notification>) => {
      setNotifications(notificationManager.getNotifications())
      setUnreadCount(notificationManager.getUnreadCount())
    }

    window.addEventListener('newNotification', handleNewNotification as EventListener)

    // Request notification permission
    notificationManager.requestNotificationPermission()

    return () => {
      window.removeEventListener('newNotification', handleNewNotification as EventListener)
    }
  }, [])

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assignment_due':
        return <BookOpen className="h-5 w-5 text-blue-500" />
      case 'grade_released':
        return <Award className="h-5 w-5 text-green-500" />
      case 'low_performance':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'achievement':
        return <Award className="h-5 w-5 text-yellow-500" />
      case 'announcement':
        return <MessageSquare className="h-5 w-5 text-purple-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50'
      case 'high':
        return 'border-l-orange-500 bg-orange-50'
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'low':
        return 'border-l-blue-500 bg-blue-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const handleMarkAsRead = (notificationId: string) => {
    notificationManager.markAsRead(notificationId)
    setNotifications(notificationManager.getNotifications())
    setUnreadCount(notificationManager.getUnreadCount())
  }

  const handleMarkAllAsRead = () => {
    notificationManager.markAllAsRead()
    setNotifications(notificationManager.getNotifications())
    setUnreadCount(0)
  }

  const handleClearAll = () => {
    notificationManager.clearNotifications()
    setNotifications([])
    setUnreadCount(0)
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    notificationManager.updatePreferences(newPreferences)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-1 text-gray-500 hover:text-gray-700 rounded"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 text-gray-500 hover:text-gray-700 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {notifications.length > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-600">
                      {unreadCount} unread of {notifications.length}
                    </span>
                    <div className="flex space-x-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={handleClearAll}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Notification Preferences</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(preferences).map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => handlePreferenceChange(key as keyof NotificationPreferences, e.target.checked)}
                          className="mr-2 rounded"
                        />
                        <span className="text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`px-4 py-3 hover:bg-gray-50 transition-colors duration-200 border-l-4 ${getPriorityColor(notification.priority)} ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.timestamp).toLocaleString()}
                                </p>
                              </div>
                              {!notification.read && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded"
                                  title="Mark as read"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
