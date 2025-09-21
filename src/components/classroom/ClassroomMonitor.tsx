import React, { useEffect, useState } from 'react'
import { useAppStore, useClassroomCourse, useClassroomStudents, useClassroomAssignments, useClassroomAnalytics, useClassroomSubmissions, useSubmissionStats, useStudentStats } from '../../lib/store'
import { Users, BookOpen, TrendingUp, Clock, CheckCircle, AlertTriangle, FileText, Download, Award, Calendar, Target, Star, User, GraduationCap, Brain, BarChart3, Bell, Settings, Filter } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import NotificationCenter from '../notifications/NotificationCenter'
import AdvancedAnalytics from '../analytics/AdvancedAnalytics'
import AIInsightsPanel from '../analytics/AIInsightsPanel'
import { analyticsEngine } from '../../lib/analytics-engine'
import { pdfGenerator } from '../../lib/pdf-generator'
import { notificationManager } from '../../lib/notifications'

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
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`inline-flex items-center justify-center p-4 rounded-xl ${colorClasses[color]} shadow-lg`}>
              {icon}
            </div>
          </div>
          <div className="ml-6 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-600 truncate uppercase tracking-wide">{title}</dt>
              <dd className="text-3xl font-bold text-gray-900 mt-1">{value}</dd>
              <dd className="text-sm text-gray-500 mt-1">{subtitle}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function StudentList({ students, analytics, assignments, submissions, studentStats }: { students: any[], analytics: any, assignments: any[], submissions: any[], studentStats: any[] }) {
  return (
    <div className="bg-white shadow-lg rounded-xl border border-gray-100">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Students Overview</h3>
          <span className="text-sm text-gray-500">{students.length} students</span>
        </div>
      </div>
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
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
              <div className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
                        <span className="text-sm font-semibold text-white">
                          {student.initials || '#'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {student.profile?.name?.fullName || 'Unknown Student'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.profile?.emailAddress || 'No email'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-900">
                        {submissionCount}/{assignments?.length || 0}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(completionRate)}`}>
                        {completionRate}%
                      </span>
                    </div>
                    <div className="mt-1">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
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
  const course = useClassroomCourse()
  const students = useClassroomStudents()
  const assignments = useClassroomAssignments()
  const analytics = useClassroomAnalytics()
  const submissions = useClassroomSubmissions()
  const submissionStats = useSubmissionStats()
  const studentStats = useStudentStats()
  const { classroomData } = useAppStore()
  const topics = classroomData?.topicAnalytics || []
  
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'students'>('overview')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  useEffect(() => {
    fetchClassroomData()
  }, [fetchClassroomData])

  const handleExport = async (format: 'csv' | 'pdf' = 'csv') => {
    if (!course || !students || !assignments || !analytics) {
      toast.error('No data available for export')
      return
    }

    setIsGeneratingReport(true)
    toast.loading('Generating report...', { id: 'export' })

    try {
      if (format === 'csv') {
        // Enhanced CSV export
        const csvData = [
          ['Student Name', 'Email', 'Current Grade', 'Assignments Completed', 'Total Assignments', 'Completion Rate', 'Risk Level', 'Trend'],
          ...students.map(student => {
            const studentPerformance = analyticsEngine.analyzeStudentPerformance(student, assignments, submissions || [])
            return [
              student.profile?.name?.fullName || 'Unknown',
              student.profile?.emailAddress || 'No email',
              `${Math.round(studentPerformance.currentGrade)}%`,
              studentPerformance.submissionCount,
              assignments.length,
              `${Math.round(studentPerformance.completionRate)}%`,
              studentPerformance.riskLevel,
              studentPerformance.trend
            ]
          })
        ]
        
        const csvContent = csvData.map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `talent-development-report-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        // PDF export
        const classAnalytics = analyticsEngine.analyzeClassPerformance(students, assignments, submissions || [])
        const studentPerformances = students.map(student => {
          const analytics_data = analyticsEngine.analyzeStudentPerformance(student, assignments, submissions || [])
          return {
            ...analytics_data,
            overallGrade: analytics_data.currentGrade,
            studentName: student.profile?.name?.fullName || 'Unknown Student',
            assignments: assignments.map((a: any) => ({ ...a, isCompleted: true })) // Mock assignments data
          }
        })
        
        const reportData = {
          course,
          students,
          assignments,
          analytics: classAnalytics,
          studentPerformances,
          generatedAt: new Date()
        }
        
        const pdfBlob = await pdfGenerator.generateClassReport(reportData, {
          includeCharts: true,
          includeStudentDetails: true,
          includeRecommendations: true,
          includeAnalytics: true,
          timeframe: 'month',
          format: 'detailed'
        })
        
        const url = window.URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `talent-development-report-${new Date().toISOString().split('T')[0]}.pdf`
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
    console.log('Dashboard Data:', { analytics, students, assignments, submissions, studentStats });
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                  <Image 
                    src="/logo.png" 
                    alt="Classroom Analytics Logo" 
                    width={40} 
                    height={40}
                    className="rounded-lg"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Talent Development</h1>
                  <p className="text-lg text-gray-600">{course.name}</p>
                </div>
              </div>
              {course.section && (
                <p className="text-sm text-gray-600 mt-2">Section: {course.section}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                AI-Powered Classroom Analytics & Student Success Platform
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <NotificationCenter />
              <div className="flex items-center space-x-2">
                {/* <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Filter className="h-5 w-5" />
                </button> */}
                <div className="relative">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={isGeneratingReport}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </button>
                </div>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isGeneratingReport}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGeneratingReport ? 'Generating...' : 'PDF Report'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'analytics', name: 'Advanced Analytics', icon: Brain },
                { id: 'students', name: 'Student Management', icon: Users }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as any)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeView === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
          <MetricCard
            title="Total Students"
            value={students?.length || 0}
            subtitle={`${students.filter(s => {
              const check_submissions = submissions?.filter((sub: any) => sub.studentId == s.userId) || []
              return check_submissions.length > 0
            }).length} active`}
            icon={<Users className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Assignments"
            value={assignments?.length || assignments?.length || 0}
            subtitle={`${assignments.filter(isAssignmentOverdue).length} overdue`}
            icon={<BookOpen className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Topics"
            value={analytics?.totalTopics || 0}
            subtitle="course topics"
            icon={<FileText className="h-6 w-6" />}
            color="purple"
          />
          <MetricCard
            title="Completion Rate"
            value={`${Math.round(submissionStats?.averageCompletionRate || 0)}%`}
            subtitle="overall progress"
            icon={<TrendingUp className="h-6 w-6" />}
            color="yellow"
          />
          <MetricCard
            title="Average Grade"
            value={submissionStats?.averageClassGrade ? `${Math.round(submissionStats.averageClassGrade)}%` : 'N/A'}
            subtitle="class average"
            icon={<Award className="h-6 w-6" />}
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
              className="mb-6 bg-white rounded-xl shadow-lg border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Filters & Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleBulkAction('email')}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      Email Selected
                    </button>
                    <button
                      onClick={() => handleBulkAction('report')}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
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
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                {/* Left Column */}
                <div className="xl:col-span-2 space-y-6 lg:space-y-8">
                  <StudentList students={students} analytics={analytics} assignments={assignments} submissions={submissions} studentStats={studentStats} />
                  <AssignmentsList assignments={assignments} analytics={analytics} submissions={submissions} students={students} />
                  <TopicsList topics={topics} />
                </div>

                {/* Right Column */}
                <div className="space-y-6 lg:space-y-8">
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

          {activeView === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics</h3>
                <p className="text-gray-600">Analytics features coming soon...</p>
              </div>
              {/* <AIInsightsPanel
                studentData={students}
                classAnalytics={analytics}
                assignments={assignments}
                submissions={analytics?.submissions || []}
                selectedStudent={selectedStudent}
              />
              <AdvancedAnalytics
                students={students}
                assignments={assignments}
                submissions={analytics?.submissions || []}
                onStudentSelect={handleStudentSelect}
              /> */}
            </motion.div>
          )}

          {activeView === 'students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Management</h3>
                <p className="text-gray-600">Student management features coming soon...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Toaster position="top-right" />
      </div>
    </div>
  )
}
