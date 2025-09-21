import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ClassroomCourse, ClassroomStudent, ClassroomAssignment, ClassroomSubmission, ClassroomTopic } from './google-classroom'

interface TopicAnalytics {
  id: string
  name: string
  description: string
  assignmentCount: number
  completionRate: number
  submissions: number
  completedSubmissions: number
}

interface ClassroomAnalytics {
  totalStudents: number
  totalAssignments: number
  totalTopics: number
  totalSubmissions: number
  completedSubmissions: number
  lateSubmissions: number
  completionRate: number
  averageGrade: number
  topics: TopicAnalytics[]
  studentAnalytics?: Record<string, any>
}

interface ClassroomData {
  course: any
  students: any[]
  assignments: any[]
  analytics: ClassroomAnalytics | null
  topics: any[]
  topicAnalytics?: TopicAnalytics[]
  submissions?: any[]
  submissionStats?: any
  studentStats?: any[]
}

interface AppState {
  // Classroom data for single classroom
  classroomData: ClassroomData
  
  // Loading and error states
  isLoading: boolean
  error: string | null
  
  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Data fetching actions
  fetchClassroomData: () => Promise<void>
  fetchStudentAnalytics: (studentId: string) => Promise<any>
  syncAllData: () => Promise<void>
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      classroomData: {
        course: null,
        students: [],
        assignments: [],
        submissions: [],
        topics: [],
        topicAnalytics: [],
        analytics: null
      },
      isLoading: false,
      error: null,

      // Actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Data fetching actions
      fetchClassroomData: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const [courseResponse, studentsResponse, assignmentsResponse, analyticsResponse, submissionsResponse] = await Promise.all([
            fetch('/api/classroom/course'),
            fetch('/api/classroom/students'),
            fetch('/api/classroom/assignments'),
            fetch('/api/classroom/analytics'),
            fetch('/api/classroom/submissions')
          ])

          if (!courseResponse.ok || !studentsResponse.ok || !assignmentsResponse.ok || !analyticsResponse.ok || !submissionsResponse.ok) {
            throw new Error('Failed to fetch classroom data')
          }

          const [course, students, assignments, analytics, submissionsData] = await Promise.all([
            courseResponse.json(),
            studentsResponse.json(),
            assignmentsResponse.json(),
            analyticsResponse.json(),
            submissionsResponse.json()
          ])

          // Use the enhanced analytics engine with real submission data
          const { AnalyticsEngine } = await import('./analytics-engine')
          const engine = new AnalyticsEngine({
            students,
            assignments,
            topics: analytics.topics || [],
            submissions: submissionsData.rawSubmissions || []
          })

          const classAnalytics = engine.analyzeClassPerformance();
          const enhancedAnalytics: ClassroomAnalytics = {
            totalStudents: classAnalytics.totalStudents,
            totalAssignments: classAnalytics.totalAssignments,
            totalTopics: analytics.topics?.length || 0,
            // Calculate submission metrics from the raw submissions data
            totalSubmissions: submissionsData.rawSubmissions?.length || 0,
            completedSubmissions: submissionsData.rawSubmissions?.filter(
              (s: any) => s.state === 'TURNED_IN' || s.state === 'RETURNED'
            ).length || 0,
            lateSubmissions: submissionsData.rawSubmissions?.filter(
              (s: any) => s.late
            ).length || 0,
            completionRate: classAnalytics.averageCompletionRate,
            averageGrade: classAnalytics.averageGrade,
            topics: analytics.topics || [],
            studentAnalytics: {}
          };

          set({
            classroomData: {
              course,
              students,
              assignments,
              analytics: enhancedAnalytics,
              topics: analytics.topics || [],
              topicAnalytics: analytics.topicAnalytics || [],
              submissions: submissionsData.rawSubmissions || [],
              submissionStats: submissionsData.classStats || {},
              studentStats: submissionsData.studentStats || []
            },
            isLoading: false
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch classroom data',
            isLoading: false 
          })
        }
      },

      fetchStudentAnalytics: async (studentId: string) => {
        const { setError, classroomData } = get()

        try {
          // Use the enhanced analytics engine with real submission data
          const { AnalyticsEngine } = await import('./analytics-engine')
          const engine = new AnalyticsEngine({
            students: classroomData.students,
            assignments: classroomData.assignments,
            topics: classroomData.topics || [],
            submissions: classroomData.submissions || []
          })

          const studentAnalytics = engine.analyzeStudentPerformance(studentId)
          
          // Update the specific student's analytics in the store
          set((state) => ({
            ...state,
            classroomData: {
              ...state.classroomData,
              analytics: state.classroomData.analytics ? {
                ...state.classroomData.analytics,
                studentAnalytics: {
                  ...(state.classroomData.analytics.studentAnalytics || {}),
                  [studentId]: studentAnalytics
                }
              } : null
            }
          }))

          return studentAnalytics
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to fetch student analytics')
          throw error
        }
      },

      syncAllData: async () => {
        const { fetchClassroomData } = get()
        
        try {
          await fetchClassroomData()
        } catch (error) {
          console.error('Error syncing classroom data:', error)
        }
      },

      clearData: () => {
        set({
          classroomData: {
            course: null,
            students: [],
            assignments: [],
            submissions: [],
            topics: [],
            analytics: null
          },
          error: null,
          isLoading: false
        })
      }
    }),
    {
      name: 'classroom-dashboard-storage',
      partialize: (state) => ({
        classroomData: state.classroomData
      })
    }
  )
)

// Selectors for easier data access
export const useClassroomCourse = () => {
  const { classroomData } = useAppStore()
  return classroomData.course
}

export const useClassroomStudents = () => {
  const { classroomData } = useAppStore()
  return classroomData.students
}

export const useClassroomAssignments = () => {
  const { classroomData } = useAppStore()
  return classroomData.assignments
}

export const useClassroomAnalytics = () => {
  const { classroomData } = useAppStore()
  return classroomData.analytics
}

export const useClassroomSubmissions = () => {
  const { classroomData } = useAppStore()
  return classroomData.submissions || []
}

export const useSubmissionStats = () => {
  const { classroomData } = useAppStore()
  return classroomData.submissionStats || {}
}

export const useStudentStats = () => {
  const { classroomData } = useAppStore()
  return classroomData.studentStats || []
}

export const useTopicAnalytics = () => {
  const { classroomData } = useAppStore()
  return classroomData.topicAnalytics || []
}
