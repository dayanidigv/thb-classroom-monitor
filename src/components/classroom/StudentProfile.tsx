import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeft, User, Mail, Calendar, BookOpen, CheckCircle, Clock, AlertTriangle, TrendingUp, Award, Target } from 'lucide-react'
import Link from 'next/link'

interface StudentProfileProps {
  studentId: string
}

interface StudentData {
  profile: {
    name: {
      fullName: string
      givenName: string
      familyName: string
    }
    emailAddress: string
  }
  userId: string
}

interface Assignment {
  id: string
  title: string
  dueDate?: any
  dueTime?: any
  maxPoints?: number
}

interface Submission {
  id: string
  courseWorkId: string
  userId: string
  state: string
  assignedGrade?: number
  submissionHistory?: any[]
  creationTime: string
  updateTime: string
}

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

export default function StudentProfile({ studentId }: StudentProfileProps) {
  const router = useRouter()
  const [student, setStudent] = useState<StudentData | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true)
        
        // Fetch student analytics
        const analyticsResponse = await fetch(`/api/classroom/student-analytics?studentId=${studentId}`)
        if (!analyticsResponse.ok) throw new Error('Failed to fetch student analytics')
        const analyticsData = await analyticsResponse.json()
        
        // Fetch all students to find this specific student
        const studentsResponse = await fetch('/api/classroom/students')
        if (!studentsResponse.ok) throw new Error('Failed to fetch students')
        const studentsData = await studentsResponse.json()
        
        // Fetch assignments
        const assignmentsResponse = await fetch('/api/classroom/assignments')
        if (!assignmentsResponse.ok) throw new Error('Failed to fetch assignments')
        const assignmentsData = await assignmentsResponse.json()
        
        const foundStudent = studentsData.find((s: StudentData) => s.userId === studentId)
        if (!foundStudent) throw new Error('Student not found')
        
        setStudent(foundStudent)
        setAssignments(assignmentsData)
        setSubmissions(analyticsData.submissions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      fetchStudentData()
    }
  }, [studentId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading student data</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <Link href="/dashboard" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const studentSubmissions = submissions.filter(s => s.userId === studentId)
  const completedSubmissions = studentSubmissions.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED')
  const lateSubmissions = studentSubmissions.filter(s => {
    const assignment = assignments.find(a => a.id === s.courseWorkId)
    return assignment && isAssignmentOverdue(assignment) && s.state === 'TURNED_IN'
  })
  
  const totalAssignments = assignments.length
  const completionRate = totalAssignments > 0 ? Math.round((completedSubmissions.length / totalAssignments) * 100) : 0
  const averageGrade = completedSubmissions.length > 0 
    ? Math.round(completedSubmissions.reduce((sum, s) => sum + (s.assignedGrade || 0), 0) / completedSubmissions.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link href="/dashboard" className="mr-4 p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Student Profile</h1>
          </div>
        </div>

        {/* Student Info Card */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6 mb-8">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-20 w-20">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">
                  {student.profile?.name?.givenName?.[0] || 'U'}{student.profile?.name?.familyName?.[0] || 'N'}
                </span>
              </div>
            </div>
            <div className="ml-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {student.profile?.name?.fullName || 'Unknown Student'}
              </h2>
              <div className="flex items-center mt-2 text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                <span>{student.profile?.emailAddress || 'No email'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center p-3 rounded-lg bg-blue-50 text-blue-700">
                  <BookOpen className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{completedSubmissions.length}/{totalAssignments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center p-3 rounded-lg bg-green-50 text-green-700">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center p-3 rounded-lg bg-yellow-50 text-yellow-700">
                  <Award className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Grade</p>
                <p className="text-2xl font-bold text-gray-900">{averageGrade > 0 ? `${averageGrade}%` : 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center p-3 rounded-lg bg-red-50 text-red-700">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Late Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{lateSubmissions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Details */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Assignment Details</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {assignments.map((assignment) => {
              const submission = studentSubmissions.find(s => s.courseWorkId === assignment.id)
              const dueDate = formatDueDate(assignment.dueDate, assignment.dueTime)
              const isOverdue = isAssignmentOverdue(assignment)
              
              const getStatusColor = () => {
                if (!submission) return 'bg-gray-100 text-gray-800'
                if (submission.state === 'TURNED_IN' || submission.state === 'RETURNED') {
                  return isOverdue ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }
                return 'bg-red-100 text-red-800'
              }
              
              const getStatusText = () => {
                if (!submission) return 'Not Submitted'
                if (submission.state === 'TURNED_IN') return 'Submitted'
                if (submission.state === 'RETURNED') return 'Graded'
                return 'In Progress'
              }

              return (
                <div key={assignment.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        <BookOpen className="h-5 w-5 text-blue-500 mr-3" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {assignment.title}
                          </h4>
                          <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {dueDate !== 'No due date' ? `Due ${dueDate}` : 'No due date'}
                            </div>
                            {assignment.maxPoints && (
                              <div className="flex items-center">
                                <Target className="h-4 w-4 mr-1" />
                                {assignment.maxPoints} points
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
                        {getStatusText()}
                      </span>
                      {submission?.assignedGrade !== undefined && (
                        <div className="mt-1 text-sm font-medium text-gray-900">
                          Grade: {submission.assignedGrade}
                          {assignment.maxPoints && `/${assignment.maxPoints}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
