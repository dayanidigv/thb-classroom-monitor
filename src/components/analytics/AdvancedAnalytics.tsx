import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, Users, Target, Brain, AlertTriangle, 
  Award, BookOpen, Calendar, BarChart3, PieChart, LineChart,
  Filter, Download, RefreshCw
} from 'lucide-react'
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { AnalyticsEngine, ClassAnalytics, StudentAnalytics } from '../../lib/analytics-engine'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

interface AdvancedAnalyticsProps {
  students: any[]
  assignments: any[]
  submissions: any[]
  onStudentSelect?: (studentId: string) => void
}

export default function AdvancedAnalytics({ 
  students, 
  assignments, 
  submissions, 
  onStudentSelect 
}: AdvancedAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null)
  const [studentPerformances, setStudentPerformances] = useState<StudentAnalytics[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'semester'>('month')
  const [selectedMetric, setSelectedMetric] = useState<'grade' | 'completion' | 'engagement'>('grade')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (students.length > 0 && assignments.length > 0) {
      generateAnalytics()
    }
  }, [students, assignments, submissions])

  const generateAnalytics = async () => {
    setIsLoading(true)
    try {
      // Create analytics engine instance with proper data structure
      const engine = new AnalyticsEngine({
        students,
        assignments,
        submissions: submissions || []
      })
      
      const classAnalytics = engine.analyzeClassPerformance()
      const studentData = students.map(student => 
        engine.analyzeStudentPerformance(student.userId || student.id)
      )
      
      setAnalytics(classAnalytics)
      setStudentPerformances(studentData)
    } catch (error) {
      console.error('Error generating analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportAnalytics = () => {
    if (!analytics) return

    const data = {
      timestamp: new Date().toISOString(),
      classAnalytics: analytics,
      studentPerformances: studentPerformances
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `talent-development-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const weeklyProgressData = {
    labels: analytics.trends.weeklyProgress?.map(w => w.week) || [],
    datasets: [
      {
        label: 'Average Grade',
        data: analytics.trends.weeklyProgress?.map(w => w.averageGrade) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Completion Rate',
        data: analytics.trends.weeklyProgress?.map(w => w.completionRate) || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const performanceDistributionData = {
    labels: analytics.trends.performanceDistribution?.map(p => p.range) || [],
    datasets: [
      {
        data: analytics.trends.performanceDistribution?.map(p => p.percentage) || [],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  }

  const submissionPatternsData = {
    labels: analytics.trends.submissionPatterns?.map(p => p.day.slice(0, 3)) || [],
    datasets: [
      {
        label: 'Submissions',
        data: analytics.trends.submissionPatterns?.map(p => p.submissions) || [],
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 2
      }
    ]
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
          <p className="text-gray-600 mt-1">AI-powered insights and predictive analysis</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="semester">This Semester</option>
          </select>
          <button
            onClick={generateAnalytics}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={exportAnalytics}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Class Performance</p>
              <div className="text-2xl font-bold text-gray-900">{analytics.averageGrade?.toFixed(1) || 0}%</div>
            </div>
            <Brain className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">Current class average</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Students at Risk</p>
              <div className="text-2xl font-bold text-gray-900">{analytics.studentsAtRisk || 0}</div>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600">
              {Math.round(((analytics.studentsAtRisk || 0) / (analytics.totalStudents || 1)) * 100)}% of class
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Completion Rate</p>
              <div className="text-2xl font-bold text-gray-900">{analytics.averageCompletionRate?.toFixed(1) || 0}%</div>
            </div>
            <Target className="h-8 w-8 text-green-500" />
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600">
              Current class completion rate
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Students</p>
              <div className="text-2xl font-bold text-gray-900">{analytics.overallPerformance?.activeStudents || 0}/{analytics.overallPerformance?.totalStudents || 0}</div>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600">
              of {analytics.overallPerformance?.totalStudents || 0} total
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Progress Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
          <div className="h-64">
            <Line
              data={weeklyProgressData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Performance Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          <div className="h-64">
            <Doughnut
              data={performanceDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                }
              }}
            />
          </div>
        </div>

        {/* Submission Patterns */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submission Patterns</h3>
          <div className="h-64">
            <Bar
              data={submissionPatternsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <Brain className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Class average is {analytics?.averageGrade?.toFixed(1) || 0}% with {analytics?.studentsAtRisk || 0} students needing additional support.
              </p>
            </div>
            {analytics && analytics.averageGrade < 70 && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  Consider implementing additional support strategies to improve class performance.
                </p>
              </div>
            )}
            {analytics && analytics.averageGrade >= 80 && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <Target className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  Excellent class performance! Consider advanced enrichment opportunities.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Performance Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Student Performance Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentPerformances.map((student) => (
                <tr key={student.studentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {student.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {Math.round(student.currentGrade)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{Math.round(student.completionRate)}% completion</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTrendIcon(student.trend)}
                      <span className="ml-2 text-sm text-gray-900 capitalize">
                        {student.trend}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskColor(student.riskLevel)}`}>
                      {student.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {Math.round(student.completionRate)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onStudentSelect?.(student.studentId)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Performers & At-Risk Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performers */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            <Award className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {analytics.insights?.topPerformers?.map((student, index) => (
              <div key={student.studentId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{student.name}</p>
                    <p className="text-xs text-gray-600">{Math.round(student.currentGrade)}% • {Math.round(student.completionRate)}% completion</p>
                  </div>
                </div>
                {getTrendIcon(student.trend)}
              </div>
            ))}
          </div>
        </div>

        {/* At-Risk Students */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Students Needing Support</h3>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="space-y-3">
            {analytics.insights?.strugglingStudents?.map((student, index) => (
              <div key={student.studentId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    !
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{student.name}</p>
                    <p className="text-xs text-gray-600">{Math.round(student.currentGrade)}% • {Math.round(student.completionRate)}% completion</p>
                  </div>
                </div>
                <button
                  onClick={() => onStudentSelect?.(student.studentId)}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                >
                  Intervene
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
