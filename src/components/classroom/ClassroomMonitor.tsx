import React, { useEffect, useState } from 'react'
import { useAppStore, useClassroomCourse, useClassroomStudents, useClassroomAssignments, useClassroomAnalytics, useClassroomSubmissions, useSubmissionStats, useStudentStats } from '../../lib/store'
import { Users, BookOpen, TrendingUp, Clock, CheckCircle, AlertTriangle, FileText, Download, Award, Calendar, Target, Star, User, GraduationCap, Brain, BarChart3, Settings, Filter } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import { analyticsEngine } from '../../lib/analytics-engine'
// PDF generator removed - using inline jsPDF generation


// Helper functions to replace removed imports
const formatDueDate = (dueDate: any, dueTime?: any) => {
  if (!dueDate) return 'No due date'
  const date = new Date(dueDate.year, dueDate.month - 1, dueDate.day)
  if (dueTime) {
    date.setHours(dueTime.hours || 0, dueTime.minutes || 0)
  }
  return date.toLocaleDateString()
}

const isAssignmentOverdue = (assignment: any) => {
  if (!assignment.dueDate) return false
  const date = new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day)
  if (assignment.dueTime) {
    date.setHours(assignment.dueTime.hours || 0, assignment.dueTime.minutes || 0)
  }
  return date < new Date()
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200 shadow-blue-100',
    green: 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-green-200 shadow-green-100',
    yellow: 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200 shadow-yellow-100',
    red: 'bg-gradient-to-br from-red-50 to-red-100 text-red-700 border-red-200 shadow-red-100',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 border-purple-200 shadow-purple-100'
  }

  return (
    <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="p-4 sm:p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`inline-flex items-center justify-center p-3 sm:p-4 rounded-xl ${colorClasses[color]} shadow-lg`}>
              <div className="h-4 w-4 sm:h-6 sm:w-6">
                {icon}
              </div>
            </div>
          </div>
          <div className="ml-4 sm:ml-6 w-0 flex-1 min-w-0">
            <dl>
              <dt className="text-xs sm:text-sm font-medium text-gray-600 truncate uppercase tracking-wide">{title}</dt>
              <dd className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 truncate">{value}</dd>
              {subtitle && <dd className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{subtitle}</dd>}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function StudentList({ 
  students, 
  analytics, 
  assignments, 
  submissions, 
  studentStats, 
  photoErrors, 
  handlePhotoError 
}: { 
  students: any[], 
  analytics: any, 
  assignments: any[], 
  submissions: any[], 
  studentStats: any[],
  photoErrors: Set<string>,
  handlePhotoError: (studentId: string) => void
}) {

  return (
    <div className="bg-white shadow-lg rounded-xl border border-gray-100">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Students Overview</h3>
          <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {students.length} students
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-100 max-h-80 sm:max-h-96 overflow-y-auto">
        {students.map((student) => {
          // Fix field name mismatch: submissions use 'studentId', students use 'userId'
          const studentStat = studentStats?.find((stat: any) => 
            stat.studentId === student.userId || 
            stat.userId === student.userId ||
            stat.studentId === String(student.userId)
          )
          const studentSubmissions = submissions?.filter((s: any) => 
            s.studentId === student.userId || 
            s.userId === student.userId ||
            s.studentId === String(student.userId)
          ) || []
          
          // Fallback: use studentStats data if direct filtering fails
          const submittedCount = studentStat?.submittedCount || studentSubmissions.filter((s: any) => s.state === 'RETURNED' || s.state === 'TURNED_IN').length
          const totalAssignments = assignments?.length || 0
          const completionRate = studentStat?.completionRate || (totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 100) : 0)
          
          // Calculate average grade from actual submissions or use studentStats
          const gradedSubmissions = studentSubmissions.filter((s: any) => s.assignedGrade !== undefined && s.assignedGrade !== null)
          const currentGrade = studentStat?.averageGrade || (gradedSubmissions.length > 0 
            ? Math.round(gradedSubmissions.reduce((sum: number, s: any) => sum + (s.assignedGrade || 0), 0) / gradedSubmissions.length)
            : 0)
          
          const submissionCount = submittedCount
          const lateSubmissions = studentStat?.lateCount || studentSubmissions.filter((s: any) => s.late).length
          
          const getPerformanceColor = (rate: number) => {
            if (rate >= 90) return 'text-green-600 bg-green-50'
            if (rate >= 70) return 'text-yellow-600 bg-yellow-50'
            return 'text-red-600 bg-red-50'
          }
          
          return (
            <Link key={student.userId} href={`/dashboard/student/${student.userId}`}>
              <div className="px-3 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1 mr-4">
                    <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                      {student.profile?.photoUrl &&  (
                        <img
                          src={`/api/photo-proxy?url=${encodeURIComponent('https:' + student.profile.photoUrl)}`}
                          alt={`${student.profile?.name?.fullName || 'Student'}'s profile photo`}
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border border-gray-200 shadow-md"
                          onError={() => {
                            console.log(`Photo failed to load for ${student.profile?.name?.fullName}, using initials fallback`)
                            handlePhotoError(student.userId)
                          }}
                        />
                      ) }
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                        {student.profile?.name?.fullName || 'Unknown Student'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 truncate">
                        {student.profile?.emailAddress || 'No email'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-0">
                        {submissionCount}/{assignments?.length || 0}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(completionRate)}`}>
                        {completionRate}%
                      </span>
                    </div>
                    <div className="mt-1 sm:mt-2">
                      <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-1.5 sm:h-2">
                        <div 
                          className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                            completionRate >= 90 ? 'bg-green-500' : 
                            completionRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function AssignmentsList({ assignments, analytics, submissions, students }: { assignments: any[], analytics: any, submissions: any[], students: any[] }) {
  return (
    <div className="bg-white shadow-lg rounded-xl border border-gray-100">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Assignments</h3>
          <span className="text-sm text-gray-500">{assignments.length} total</span>
        </div>
      </div>
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {assignments.slice(0, 10).map((assignment) => {
          const dueDate = formatDueDate(assignment.dueDate, assignment.dueTime)
          const isOverdue = isAssignmentOverdue(assignment)
          const assignmentSubmissions = submissions?.filter((s: any) => s.assignmentId === assignment.id) || []
          const completed = assignmentSubmissions.filter((s: any) => s.isSubmitted).length
          const total = students?.length || 0
          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
          
          return (
            <div key={assignment.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-2">
                    <div className="flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-blue-500 mr-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {assignment.title}
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {dueDate !== 'No due date' ? `Due ${dueDate}` : 'No due date'}
                        </span>
                        {isOverdue && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {completed}/{total}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      completionRate >= 90 ? 'text-green-600 bg-green-50' :
                      completionRate >= 70 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'
                    }`}>
                      {completionRate}%
                    </span>
                  </div>
                  <div className="w-20">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          completionRate >= 90 ? 'bg-green-500' : 
                          completionRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface TopicAnalytics {
  id: string
  name: string
  description: string
  assignmentCount: number
  completionRate: number
  submissions: number
  completedSubmissions: number
}

function TopicsList({ topics = [] }: { topics?: TopicAnalytics[] }) {
  if (!topics || topics.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Topics</h3>
        <p className="text-sm text-gray-500">No topics available</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Topics</h3>
        <div className="text-sm text-gray-500">{topics.length} total</div>
      </div>
      <div className="space-y-4">
        {topics.map((topic) => (
          <div key={topic.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                <span className="text-sm font-semibold text-blue-800">{topic.name}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                topic.completionRate === 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {topic.completionRate}%
              </span>
            </div>
            
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Assignments: {topic.assignmentCount}</span>
                <span>Submissions: {topic.completedSubmissions}/{topic.submissions}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${topic.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PerformanceChart({ analytics, submissionStats, submissions }: { analytics: any, submissionStats?: any, submissions?: any[] }) {
  const completedSubmissions = submissionStats?.submittedSubmissions || submissions?.filter((s: any) => s.isSubmitted)?.length || 0
  const totalSubmissions = submissionStats?.totalSubmissions || submissions?.length || 0
  const lateSubmissions = submissionStats?.lateSubmissions || submissions?.filter((s: any) => s.late)?.length || 0
  
  const data = [
    { name: 'Completed', value: completedSubmissions, color: '#10B981' },
    { name: 'Pending', value: Math.max(0, totalSubmissions - completedSubmissions), color: '#F59E0B' },
    { name: 'Late', value: lateSubmissions, color: '#EF4444' }
  ]
  
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Submission Analytics</h3>
      
      {/* Donut Chart */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-200"
              stroke="currentColor"
              strokeWidth="3"
              fill="transparent"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100
              const offset = data.slice(0, index).reduce((sum, prev) => sum + (prev.value / total) * 100, 0)
              return (
                <path
                  key={index}
                  stroke={item.color}
                  strokeWidth="3"
                  strokeDasharray={`${percentage} ${100 - percentage}`}
                  strokeDashoffset={-offset}
                  fill="transparent"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-3" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900">{item.value}</span>
                <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ClassroomMonitor() {
  const { fetchClassroomData, isLoading, error } = useAppStore()
  const { user } = useAuth()
  const course = useClassroomCourse()
  const students = useClassroomStudents()
  const assignments = useClassroomAssignments()
  const analytics = useClassroomAnalytics()
  const submissions = useClassroomSubmissions()
  const submissionStats = useSubmissionStats()
  const studentStats = useStudentStats()
  const { classroomData } = useAppStore()
  const topics = classroomData?.topicAnalytics || []
  
  // Enhanced state management
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'students' | 'attendance' | 'performance'>('overview')
  const [photoErrors, setPhotoErrors] = useState<Set<string>>(new Set())

  const handlePhotoError = (studentId: string) => {
    setPhotoErrors(prev => {
      const newSet = new Set(prev)
      newSet.add(studentId)
      return newSet
    })
  }
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [attendanceData, setAttendanceData] = useState<any>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const [realTimeStats, setRealTimeStats] = useState<any>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())

  // Enhanced data fetching with parallel API calls and caching
  useEffect(() => {
    const fetchEnhancedData = async () => {
      try {
        // Parallel fetch of all data with optimized timing
        const dataFetchPromises = [
          fetchClassroomData(), // Main classroom data
          fetchAttendanceData(), // New attendance API
          fetchPerformanceMetrics(), // Enhanced performance metrics
          fetchRealTimeStats() // Real-time statistics
        ]

        await Promise.all(dataFetchPromises)
        setLastUpdateTime(new Date())
      } catch (error) {
        console.error('Error fetching enhanced data:', error)
      }
    }

    fetchEnhancedData()
    
    // Set up auto-refresh for real-time data (every 30 seconds for real-time stats)
    const realTimeInterval = setInterval(() => {
      fetchRealTimeStats()
    }, 30000)

    // Set up periodic refresh for attendance (every 5 minutes)
    const attendanceInterval = setInterval(() => {
      fetchAttendanceData()
    }, 300000)

    return () => {
      clearInterval(realTimeInterval)
      clearInterval(attendanceInterval)
    }
  }, [])

  // New optimized API functions
  const fetchAttendanceData = async () => {
    try {
      const token = localStorage.getItem('googleAccessToken')
      const response = await fetch('/api/classroom/attendance', {
        method: 'GET',
        headers: { 
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAttendanceData(data)
      } else {
        console.error('Attendance API error:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Error fetching attendance:', error)
    }
  }

  const fetchPerformanceMetrics = async () => {
    try {
      const token = localStorage.getItem('googleAccessToken')
      const response = await fetch('/api/classroom/performance-metrics', {
        method: 'GET',
        headers: { 
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPerformanceMetrics(data)
        console.log('Performance metrics loaded:', data)
      } else {
        console.error('Performance metrics API error:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
    }
  }

  const fetchRealTimeStats = async () => {
    try {
      const token = localStorage.getItem('googleAccessToken')
      const response = await fetch('/api/classroom/real-time-stats', {
        method: 'GET',
        headers: { 
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setRealTimeStats(data)
        console.log('Real-time stats loaded:', data)
      } else {
        console.error('Real-time stats API error:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Error fetching real-time stats:', error)
    }
  }



  const handleExport = async (format: 'csv' | 'pdf' = 'csv') => {
    if (!course || !students || !assignments) {
      toast.error('No data available for export')
      return
    }

    setIsGeneratingReport(true)
    toast.loading('Generating report...', { id: 'export' })

    try {
      if (format === 'csv') {
        // CSV export using actual performance metrics data
        const headers = [
          'Student Name', 'Email', 'Google Classroom Grade (%)', 'Session Points', 'Attendance Rate (%)', 
          'Combined Score (%)', 'Assignments Completed', 'Total Assignments', 'Completion Rate (%)', 
          'Late Submissions', 'Performance Trend', 'Risk Level', 'Engagement Score (%)', 'Status'
        ]
        
        // Use performance metrics data if available, otherwise calculate from store data
        let studentData = []
        if (performanceMetrics?.studentPerformance) {
          // Use the same data as the Performance tab
          studentData = performanceMetrics.studentPerformance.map((student: any) => [
            student.name,
            student.email,
            student.grade - Math.round((student.points / 10) * 0.4), // Reverse calculate classroom grade
            student.points,
            student.attendanceRate,
            student.grade,
            student.completedAssignments,
            student.totalAssignments,
            student.completion,
            student.lateSubmissions,
            student.trend,
            student.riskLevel,
            // Calculate engagement score using attendance data
            attendanceData?.studentMetrics?.find((a: any) => a.name === student.name)?.engagementScore || 0,
            student.grade >= 90 ? 'Excellent' : 
            student.grade >= 70 ? 'Good' : 
            student.grade >= 50 ? 'Satisfactory' : 'Needs Attention'
          ])
        } else {
          // Fallback to store data
          studentData = students.map(student => {
            const studentSubmissions = submissions?.filter((sub: any) => sub.userId === student.userId) || []
            const completedSubmissions = studentSubmissions.filter((sub: any) => 
              sub.state === 'TURNED_IN' || sub.state === 'RETURNED'
            ).length
            const lateSubmissions = studentSubmissions.filter((sub: any) => sub.late).length
            
            return [
              student.profile?.name?.fullName || 'Unknown',
              student.profile?.emailAddress || 'No email',
              0, // No classroom grade available
              0, // No session points available
              0, // No attendance rate available
              0, // No combined score available
              completedSubmissions,
              assignments.length,
              assignments.length > 0 ? Math.round((completedSubmissions / assignments.length) * 100) : 0,
              lateSubmissions,
              'stable', // Default trend
              completedSubmissions < assignments.length * 0.7 ? 'high' : 'low',
              0, // No engagement score available
              'Needs Data'
            ]
          })
        }
        
        const csvData = [headers, ...studentData]
        
        // Create CSV content with proper escaping
        const csvContent = csvData.map(row => 
          row.map((cell: any) => {
            const cellStr = String(cell || '')
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          }).join(',')
        ).join('\n')
        
        // Add UTF-8 BOM for proper Excel compatibility
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `the-half-brick-classroom-monitor-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        // The Half Brick branded PDF export
        const { jsPDF } = await import('jspdf')
        const pdf = new jsPDF()
        
        // The Half Brick Brand Colors
        const thbRed = [204, 51, 51] // #CC3333
        const thbDarkGray = [51, 51, 51] // #333333
        const thbLightGray = [128, 128, 128] // #808080
        
        // Header with brand styling
        pdf.setFillColor(thbRed[0], thbRed[1], thbRed[2])
        pdf.rect(0, 0, 210, 25, 'F') // Red header bar
        
        pdf.setTextColor(255, 255, 255) // White text
        pdf.setFontSize(18)
        pdf.setFont('helvetica', 'bold')
        pdf.text('THE HALF BRICK', 15, 12)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'normal')
        pdf.text('SKILL AND SOCIAL WELFARE FOUNDATION', 15, 19)
        
        // Subtitle bar
        pdf.setTextColor(thbDarkGray[0], thbDarkGray[1], thbDarkGray[2])
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Talent Development Program - Performance Report', 15, 35)
        
        // Course Information Box
        pdf.setDrawColor(thbRed[0], thbRed[1], thbRed[2])
        pdf.setLineWidth(0.5)
        pdf.rect(15, 45, 180, 25) // Border box
        
        pdf.setTextColor(thbDarkGray[0], thbDarkGray[1], thbDarkGray[2])
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Course Information', 20, 55)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Course: ${course.name}`, 20, 62)
        pdf.text(`Report Generated: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`, 110, 55)
        pdf.text(`Total Students: ${students.length}`, 110, 62)
        pdf.text(`Total Assignments: ${assignments.length}`, 20, 67)
        
        // Performance Summary Section
        let yPos = 85
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(thbRed[0], thbRed[1], thbRed[2])
        pdf.text('Performance Overview', 15, yPos)
        
        yPos += 10
        pdf.setDrawColor(thbLightGray[0], thbLightGray[1], thbLightGray[2])
        pdf.rect(15, yPos, 180, 30)
        
        yPos += 10
        pdf.setTextColor(thbDarkGray[0], thbDarkGray[1], thbDarkGray[2])
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'normal')
        
        if (performanceMetrics?.classAverage) {
          pdf.text(`Class Average Performance: ${performanceMetrics.classAverage.toFixed(1)}%`, 20, yPos)
          pdf.text(`Total Session Points Available: ${performanceMetrics.totalSessionPoints || 'N/A'}`, 110, yPos)
          yPos += 7
          pdf.text(`Average Attendance Rate: ${performanceMetrics.averageAttendance?.toFixed(1) || 'N/A'}%`, 20, yPos)
          
          // Risk level summary
          const riskCounts = performanceMetrics.studentPerformance?.reduce((acc: any, student: any) => {
            acc[student.riskLevel] = (acc[student.riskLevel] || 0) + 1
            return acc
          }, {}) || {}
          
          pdf.text(`Students at Risk: High(${riskCounts.high || 0}) Medium(${riskCounts.medium || 0}) Low(${riskCounts.low || 0})`, 110, yPos)
        } else {
          pdf.text('Performance metrics are being calculated...', 20, yPos)
        }
        
        // Student Performance Table - New Page
        pdf.addPage()
        
        // Header for second page
        pdf.setFillColor(thbRed[0], thbRed[1], thbRed[2])
        pdf.rect(0, 0, 210, 15, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Student Performance Details', 15, 10)
        
        // Table headers
        yPos = 35
        pdf.setFillColor(240, 240, 240)
        pdf.rect(15, yPos - 8, 180, 10, 'F')
        
        pdf.setTextColor(thbDarkGray[0], thbDarkGray[1], thbDarkGray[2])
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        
        const headers = ['Student Name', 'Grade', 'Points', 'Attendance', 'Risk Level']
        const colWidths = [60, 25, 25, 30, 30]
        let xPos = 20
        
        headers.forEach((header, i) => {
          pdf.text(header, xPos, yPos - 2)
          xPos += colWidths[i]
        })
        
        yPos += 5
        
        // Table data
        const tableData = performanceMetrics?.studentPerformance?.map((student: any) => [
          student.name.length > 25 ? student.name.substring(0, 25) + '...' : student.name,
          `${student.grade}%`,
          `${student.points}`,
          `${student.attendanceRate}%`,
          student.riskLevel.toUpperCase()
        ]) || students.slice(0, 15).map(student => [
          (student.profile?.name?.fullName || 'Unknown').length > 25 ? 
            (student.profile?.name?.fullName || 'Unknown').substring(0, 25) + '...' : 
            (student.profile?.name?.fullName || 'Unknown'),
          'N/A',
          'N/A', 
          'N/A',
          'PENDING'
        ])
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        
        tableData.slice(0, 25).forEach((row: any[], index: number) => {
          // Alternate row colors
          if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250)
            pdf.rect(15, yPos - 3, 180, 8, 'F')
          }
          
          // Risk level color coding
          pdf.setTextColor(thbDarkGray[0], thbDarkGray[1], thbDarkGray[2])
          if (row[4] === 'HIGH') {
            pdf.setTextColor(204, 51, 51) // Red for high risk
          } else if (row[4] === 'MEDIUM') {
            pdf.setTextColor(255, 140, 0) // Orange for medium risk
          } else if (row[4] === 'LOW') {
            pdf.setTextColor(34, 139, 34) // Green for low risk
          }
          
          xPos = 20
          row.forEach((cell: any, cellIndex: number) => {
            if (cellIndex === 4) {
              // Keep risk level color
              pdf.text(String(cell), xPos, yPos)
            } else {
              pdf.setTextColor(thbDarkGray[0], thbDarkGray[1], thbDarkGray[2])
              pdf.text(String(cell), xPos, yPos)
            }
            xPos += colWidths[cellIndex]
          })
          
          yPos += 8
          
          if (yPos > 270) {
            pdf.addPage()
            // Add header to new page
            pdf.setFillColor(thbRed[0], thbRed[1], thbRed[2])
            pdf.rect(0, 0, 210, 15, 'F')
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(12)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Student Performance Details (Continued)', 15, 10)
            yPos = 35
          }
        })
        
        // Footer
        const pageCount = pdf.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i)
          pdf.setFontSize(8)
          pdf.setTextColor(thbLightGray[0], thbLightGray[1], thbLightGray[2])
          pdf.text(`© ${new Date().getFullYear()} The Half Brick Foundation | Page ${i} of ${pageCount}`, 15, 287)
          pdf.text('Empowering talent through education and community building', 110, 287)
        }
        
        const pdfBlob = pdf.output('blob')
        const url = window.URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `thb-talent-development-report-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
      
      toast.success(`${format.toUpperCase()} report generated successfully!`, { id: 'export' })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to generate report', { id: 'export' })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleStudentSelect = (studentId: string) => {
    // Navigate to student detail or open modal
    window.open(`/dashboard/student/${studentId}`, '_blank')
  }

  const handleBulkAction = (action: string) => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students first')
      return
    }
    
    switch (action) {
      case 'email':
        toast.success(`Email sent to ${selectedStudents.length} students`)
        break
      case 'report':
        toast.success(`Individual reports generated for ${selectedStudents.length} students`)
        break
      default:
        break
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  } else {
    console.log('Classroom data loaded');
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading classroom data</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={() => fetchClassroomData()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No classroom data found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please check your environment configuration and try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
                  <Image 
                    src="/logo.png" 
                    alt="The Half Brick Logo" 
                    width={32} 
                    height={32}
                    className="sm:w-10 sm:h-10 rounded-lg"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                    The Half Brick
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 truncate">
                    Talent Development - {course.name}
                  </p>
                </div>
              </div>
              {course.section && (
                <p className="text-xs sm:text-sm text-gray-600 mt-2 ml-13 sm:ml-15">Section: {course.section}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

              
              {/* Current User Info */}
              {user && (
                <div className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm order-2 sm:order-1">
                  <div className="flex items-center space-x-2">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-white">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {user.role === 'super-admin' ? 'Super Admin' : 
                         user.role === 'admin' ? 'Admin' : 
                         user.role === 'student' ? 'Student' : user.role}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 order-1 sm:order-2">
                {/* <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Filter className="h-5 w-5" />
                </button> */}
                <button
                  onClick={() => handleExport('csv')}
                  disabled={isGeneratingReport}
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 flex-1 sm:flex-initial"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isGeneratingReport}
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex-1 sm:flex-initial"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{isGeneratingReport ? 'Generating...' : 'PDF Report'}</span>
                  <span className="sm:hidden">{isGeneratingReport ? '...' : 'PDF'}</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Enhanced Navigation Tabs */}
          <div className="mt-4 sm:mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Last: {lastUpdateTime.toLocaleTimeString()}</span>
                {realTimeStats && (
                  <div className="flex items-center space-x-1 ml-2 sm:ml-4">
                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="hidden sm:inline">{realTimeStats.currentlyActive} online</span>
                    <span className="sm:hidden">{realTimeStats.currentlyActive}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  fetchRealTimeStats()
                  setLastUpdateTime(new Date())
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors self-end sm:self-auto"
                title="Refresh data"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            {/* Mobile Tab Navigation */}
            <div className="sm:hidden mb-4">
              <select
                value={activeView}
                onChange={(e) => setActiveView(e.target.value as any)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="overview">Overview</option>
                <option value="attendance">Attendance & Engagement</option>
                <option value="performance">Performance & Points</option>
              </select>
            </div>

            {/* Desktop Tab Navigation */}
            <div className="hidden sm:block border-b border-gray-200">
              <nav className="-mb-px flex space-x-6 lg:space-x-8">
                {[
                  { id: 'overview', name: 'Overview', shortName: 'Overview', icon: BarChart3 },
                  { id: 'attendance', name: 'Attendance & Engagement', shortName: 'Attendance', icon: Calendar },
                  { id: 'performance', name: 'Performance & Points', shortName: 'Performance', icon: Award },
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveView(tab.id as any)}
                      className={`flex items-center py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                        activeView === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className="md:hidden">{tab.shortName}</span>
                      <span className="hidden md:inline">{tab.name}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Enhanced Real-time Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <MetricCard
            title="Total Students"
            value={students?.length || 0}
            subtitle='From Classroom'
            icon={<Users className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Attendance Rate"
            value={attendanceData ? `${attendanceData.classStats?.averageAttendanceRate || 0}%` : 'Loading...'}
            subtitle={attendanceData ? `${attendanceData.classStats?.studentsAtRisk || 0} at risk` : 'calculating'}
            icon={<Calendar className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Average Points"
            value={performanceMetrics ? `${performanceMetrics.classMetrics?.averagePointsEarned || 0}` : 'Loading...'}
            subtitle={performanceMetrics ? `${performanceMetrics.classMetrics?.totalPointsPossible || 0} total` : 'calculating'}
            icon={<Award className="h-6 w-6" />}
            color="purple"
          />
          <MetricCard
            title="Engagement Score"
            value={attendanceData ? `${attendanceData.classStats?.averageEngagementScore || 0}%` : 'Loading...'}
            subtitle={realTimeStats ? `${realTimeStats.recentActivity?.last24Hours || 0} today` : 'recent activity'}
            icon={<TrendingUp className="h-6 w-6" />}
            color="yellow"
          />
          <MetricCard
            title="Assignments"
            value={assignments?.length || 0}
            subtitle={`${assignments.filter(isAssignmentOverdue).length} overdue`}
            icon={<BookOpen className="h-6 w-6" />}
            color="red"
          />
          <MetricCard
            title="Class Grade"
            value={performanceMetrics ? `${performanceMetrics.classMetrics?.averageGrade || 0}%` : (submissionStats?.averageClassGrade ? `${Math.round(submissionStats.averageClassGrade)}%` : 'N/A')}
            subtitle={performanceMetrics ? (performanceMetrics.classMetrics?.studentsImproving > performanceMetrics.classMetrics?.studentsDeclining ? '📈 improving' : '📉 declining') : 'class average'}
            icon={<Star className="h-6 w-6" />}
            color="green"
          />
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 sm:mb-6 bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6"
            >
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Advanced Filters & Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Performance Filter</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>All Students</option>
                    <option>High Performers (90%+)</option>
                    <option>At Risk (&lt; 70%)</option>
                    <option>Improving Trend</option>
                    <option>Declining Trend</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>All Assignments</option>
                    <option>Overdue</option>
                    <option>Due This Week</option>
                    <option>Recently Graded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bulk Actions</label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                    <button
                      onClick={() => handleBulkAction('email')}
                      className="px-3 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Email Selected
                    </button>
                    <button
                      onClick={() => handleBulkAction('report')}
                      className="px-3 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Generate Reports
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content - Conditional Rendering */}
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {/* Left Column */}
                <div className="xl:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                  <StudentList 
                    students={students} 
                    analytics={analytics} 
                    assignments={assignments} 
                    submissions={submissions} 
                    studentStats={studentStats}
                    photoErrors={photoErrors}
                    handlePhotoError={handlePhotoError}
                  />
                  <AssignmentsList assignments={assignments} analytics={analytics} submissions={submissions} students={students} />
                  <TopicsList topics={topics} />
                </div>

                {/* Right Column */}
                <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                  <PerformanceChart analytics={analytics} submissionStats={submissionStats} submissions={submissions} />
                  
                  {/* Quick Stats */}
                  <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Stats</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-gray-600">Total Submissions</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 bg-blue-50 px-2 py-1 rounded-lg">
                          {submissionStats?.totalSubmissions || submissions?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-red-500 mr-2" />
                          <span className="text-sm font-medium text-gray-600">Late Submissions</span>
                        </div>
                        <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                          {submissionStats?.lateSubmissions || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                          <span className="text-sm font-medium text-gray-600">Overdue Assignments</span>
                        </div>
                        <span className="text-sm font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                          {assignments.filter(isAssignmentOverdue).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <div className="flex items-center">
                          <Target className="h-4 w-4 text-purple-500 mr-2" />
                          <span className="text-sm font-medium text-gray-600">Active Topics</span>
                        </div>
                        <span className="text-sm font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                          {topics.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'attendance' && (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Attendance Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Average Attendance</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceData?.classStats?.averageAttendanceRate || 0}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Punctuality Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceData?.classStats?.averagePunctualityRate || 0}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Students at Risk</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceData?.classStats?.studentsAtRisk || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Engagement Score</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {attendanceData?.classStats?.averageEngagementScore || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Attendance Table */}
              <div className="bg-white shadow-lg rounded-xl border border-gray-100">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Student Attendance Details</h3>
                  
                  {/* Calculation Guide for Attendance */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-relaxed">
                          <span className="font-medium">Engagement:</span> 60% attendance rate + 40% points efficiency (earned/max possible × 100). Sessions with all-zero points are excluded. 
                          <span className="font-medium ml-2">Status:</span> Excellent ≥90%, Good 70-89%, At Risk &lt;70% attendance.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">On Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                          <div className="flex items-center space-x-1">
                            <span>Engagement</span>
                            <div className="group relative inline-block">
                              <svg className="h-3 w-3 text-gray-400 cursor-help hover:text-gray-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                              <div className="invisible group-hover:visible absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-[9999] w-64">
                                <div className="text-left leading-relaxed">
                                  <div className="font-semibold mb-1">Engagement Calculation:</div>
                                  • 60% Attendance Rate + 40% Points Efficiency<br/>
                                  • Points Efficiency = (Earned Points ÷ Max Possible) × 100<br/>
                                  • Invalid sessions (all 0 points) are excluded
                                </div>
                                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                              </div>
                            </div>
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                          <div className="flex items-center space-x-1">
                            <span>Status</span>
                            <div className="group relative inline-block">
                              <svg className="h-3 w-3 text-gray-400 cursor-help hover:text-gray-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                              <div className="invisible group-hover:visible absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-[9999] w-48">
                                <div className="text-left leading-relaxed">
                                  <div className="font-semibold mb-1">Status Criteria:</div>
                                  • <span className="text-green-400">Excellent:</span> ≥90% attendance<br/>
                                  • <span className="text-yellow-400">Good:</span> 70-89% attendance<br/>
                                  • <span className="text-red-400">At Risk:</span> &lt;70% attendance
                                </div>
                                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                              </div>
                            </div>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceData?.studentMetrics?.map((student: any) => (
                        <tr key={student.studentId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {student.photoUrl && !photoErrors.has(student.studentId) ? (
                                <img 
                                  src={`/api/photo-proxy?url=${encodeURIComponent(student.photoUrl.startsWith('//') ? 'https:' + student.photoUrl : student.photoUrl)}`}
                                  alt={student.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                  onError={() => handlePhotoError(student.studentId)}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {student.name.split(' ').map((n: string) => n[0]).join('')}
                                  </span>
                                </div>
                              )}
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                {/* <div className="text-sm text-gray-500">{student.email}</div> */}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">{student.attendanceRate}%</div>
                              <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${student.attendanceRate >= 90 ? 'bg-green-500' : student.attendanceRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${student.attendanceRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.submittedOnTime}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.lateSubmissions}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.missedAssignments}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${student.engagementScore >= 80 ? 'bg-green-100 text-green-800' : student.engagementScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {student.engagementScore}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${student.attendanceRate >= 90 ? 'bg-green-100 text-green-800' : student.attendanceRate >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {student.attendanceRate >= 90 ? 'Excellent' : student.attendanceRate >= 70 ? 'Good' : 'At Risk'}
                            </span>
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                            {attendanceData ? 'No attendance data available' : 'Loading attendance data...'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center">
                    <Award className="h-8 w-8 text-yellow-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Class Average</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {performanceMetrics?.classMetrics?.averageGrade || 0}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center">
                    <Star className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Average Points</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {performanceMetrics?.classMetrics?.averagePointsEarned || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Improving</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {performanceMetrics?.classMetrics?.studentsImproving || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex items-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">At Risk</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {performanceMetrics?.classMetrics?.studentsAtRisk || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Rankings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Performers</h3>
                  <div className="space-y-4">
                    {performanceMetrics?.classMetrics?.topPerformers?.map((student: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <span className="text-lg font-bold text-yellow-600">#{index + 1}</span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.points}% points achieved</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-green-600">{student.grade}%</span>
                        </div>
                      </div>
                    )) || <p className="text-gray-500">Loading top performers...</p>}
                  </div>
                </div>

                {/* Students Needing Attention */}
                <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Needs Attention</h3>
                  <div className="space-y-4">
                    {performanceMetrics?.classMetrics?.needsAttention?.map((student: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.issues?.join(', ')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-red-600">{student.grade}%</span>
                        </div>
                      </div>
                    )) || <p className="text-gray-500">Loading attention list...</p>}
                  </div>
                </div>
              </div>

              {/* Detailed Performance Table */}
              <div className="bg-white shadow-lg rounded-xl border border-gray-100">
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Detailed Performance & Points</h3>
                    <div className="mt-2 sm:mt-0 text-xs sm:text-sm text-gray-500">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full mr-2">
                        60% Classroom
                      </span>
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        40% Sessions
                      </span>
                    </div>
                  </div>
                  
                  {/* Calculation Guide */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-relaxed">
                          <span className="font-medium">Trend:</span> Compares last 2 sessions vs previous 2 sessions (±0.5pt threshold). 
                          <span className="font-medium ml-2">Risk:</span> High: &lt;30% grade OR &lt;40% completion OR &lt;50% attendance. Medium: &lt;50% grade OR &lt;60% completion OR &lt;70% attendance.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mobile-friendly cards on small screens */}
                <div className="block sm:hidden">
                  {performanceMetrics?.studentPerformance?.map((student: any) => (
                    <div key={student.studentId} className="p-4 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-start space-x-3">
                        {student.photoUrl && !photoErrors.has(student.studentId) ? (
                          <img 
                            src={`/api/photo-proxy?url=${encodeURIComponent(student.photoUrl.startsWith('//') ? 'https:' + student.photoUrl : student.photoUrl)}`}
                            alt={student.name}
                            className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                            onError={() => handlePhotoError(student.studentId)}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-white">
                              {student.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm truncate">{student.name}</div>
                          <div className="text-xs text-gray-500 truncate mb-2">{student.email}</div>
                          
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <div className="text-gray-600">Combined Score</div>
                              <div className="text-lg font-bold text-gray-900">{student.averageGrade}%</div>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg">
                              <div className="text-blue-600">Session Points</div>
                              <div className="text-lg font-bold text-blue-900">{student.points}</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded-lg">
                              <div className="text-green-600">Completion</div>
                              <div className="text-sm font-semibold text-green-900">{student.completion}%</div>
                            </div>
                            <div className="bg-purple-50 p-2 rounded-lg">
                              <div className="text-purple-600">Status</div>
                              <div className={`text-xs font-semibold px-1 py-0.5 rounded ${
                                student.riskLevel === 'low' ? 'bg-green-100 text-green-800' : 
                                student.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {student.riskLevel === 'low' ? 'Low Risk' : 
                                 student.riskLevel === 'medium' ? 'Medium Risk' : 
                                 'High Risk'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="p-4 text-center text-gray-500">
                      {performanceMetrics ? 'No performance data available' : 'Loading performance data...'}
                    </div>
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div>Combined Score</div>
                          <div className="text-xs font-normal text-gray-400 normal-case">60% Classroom + 40% Sessions</div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div>Session Points</div>
                          <div className="text-xs font-normal text-gray-400 normal-case">From Attendance & Engagement</div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div>Assignment Rate</div>
                          <div className="text-xs font-normal text-gray-400 normal-case">Google Classroom</div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                          <div className="flex items-center space-x-1">
                            <span>Trend</span>
                            <div className="group relative inline-block">
                              <svg className="h-3 w-3 text-gray-400 cursor-help hover:text-gray-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                              <div className="invisible group-hover:visible absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-[9999] w-56">
                                <div className="text-left leading-relaxed">
                                  <div className="font-semibold mb-1">Performance Trend:</div>
                                  Based on last 4+ sessions comparing Recent 2 vs Previous 2 sessions (±0.5pt threshold)
                                </div>
                                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                              </div>
                            </div>
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
                          <div className="flex items-center space-x-1">
                            <span>Risk Level</span>
                            <div className="group relative inline-block">
                              <svg className="h-3 w-3 text-gray-400 cursor-help hover:text-gray-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                              <div className="invisible group-hover:visible absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-[9999] w-64">
                                <div className="text-left leading-relaxed">
                                  <div className="font-semibold mb-1">Risk Assessment:</div>
                                  • <span className="text-red-400">High Risk:</span> &lt;30% grade OR &lt;40% completion OR &lt;50% attendance<br/>
                                  • <span className="text-yellow-400">Medium Risk:</span> &lt;50% grade OR &lt;60% completion OR &lt;70% attendance<br/>
                                  • <span className="text-green-400">Low Risk:</span> Above medium thresholds
                                </div>
                                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                              </div>
                            </div>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {performanceMetrics?.studentPerformance?.map((student: any) => (
                        <tr key={student.studentId} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {student.photoUrl && !photoErrors.has(student.studentId) ? (
                                <img 
                                  src={`/api/photo-proxy?url=${encodeURIComponent(student.photoUrl.startsWith('//') ? 'https:' + student.photoUrl : student.photoUrl)}`}
                                  alt={student.name}
                                  className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                                  onError={() => handlePhotoError(student.studentId)}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                                  <span className="text-sm font-medium text-white">
                                    {student.name.split(' ').map((n: string) => n[0]).join('')}
                                  </span>
                                </div>
                              )}
                              <div className="ml-3 min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 truncate">{student.name}</div>
                                <div className="text-xs text-gray-500 truncate">{student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="text-lg font-bold text-gray-900">{student.averageGrade}%</div>
                              <div className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                student.averageGrade >= 85 ? 'bg-green-100 text-green-800' : 
                                student.averageGrade >= 70 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {student.averageGrade >= 85 ? 'Excellent' : 
                                 student.averageGrade >= 70 ? 'Good' : 'Needs Work'}
                              </div>
                            </div>
                            <div className="w-20 bg-gray-200 rounded-full h-2 mt-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  student.averageGrade >= 85 ? 'bg-green-500' : 
                                  student.averageGrade >= 70 ? 'bg-yellow-500' : 
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(student.averageGrade, 100)}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-md font-bold text-blue-600">{student.points}/{performanceMetrics.classMetrics?.totalPointsPossible || 0}</div>
                            <div className="text-xs text-green-600 font-medium mt-1">
                              Attendance: {student.attendanceRate || 0}%
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-gray-900">{student.completion}%</span>
                              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    student.completion >= 90 ? 'bg-green-500' : 
                                    student.completion >= 70 ? 'bg-yellow-500' : 
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(student.completion, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              student.trend === 'improving' ? 'bg-green-100 text-green-800' : 
                              student.trend === 'declining' ? 'bg-red-100 text-red-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {student.trend === 'improving' ? '📈 Improving' : 
                               student.trend === 'declining' ? '📉 Declining' : 
                               '➡️ Stable'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              student.riskLevel === 'low' ? 'bg-green-100 text-green-800' : 
                              student.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {student.riskLevel === 'low' ? 'Low Risk' : 
                               student.riskLevel === 'medium' ? 'Medium Risk' : 
                               'High Risk'}
                            </span>
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            {performanceMetrics ? 'No performance data available' : 'Loading performance data...'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
        
        <Toaster position="top-right" />
      </div>
    </div>
  )
}
