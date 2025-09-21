import { google } from 'googleapis'

// Types for Google Classroom API
export interface ClassroomCourse {
  id: string
  name: string
  section?: string
  description?: string
  room?: string
  ownerId: string
  creationTime: string
  updateTime: string
  enrollmentCode?: string
  courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED'
  alternateLink: string
  teacherGroupEmail?: string
  courseGroupEmail?: string
  teacherFolder?: {
    id: string
    title: string
    alternateLink: string
  }
  guardiansEnabled: boolean
  calendarId?: string
}

export interface ClassroomStudent {
  courseId: string
  userId: string
  profile: {
    id: string
    name: {
      givenName: string
      familyName: string
      fullName: string
    }
    emailAddress: string
    photoUrl?: string
  }
}

export interface ClassroomTeacher {
  courseId: string
  userId: string
  profile: {
    id: string
    name: {
      givenName: string
      familyName: string
      fullName: string
    }
    emailAddress: string
    photoUrl?: string
  }
}

export interface ClassroomAssignment {
  courseId: string
  id: string
  title: string
  description?: string
  materials?: Array<{
    driveFile?: {
      driveFile: {
        id: string
        title: string
        alternateLink: string
        thumbnailUrl?: string
      }
      shareMode: 'UNKNOWN_SHARE_MODE' | 'VIEW' | 'EDIT' | 'STUDENT_COPY'
    }
    youtubeVideo?: {
      id: string
      title: string
      alternateLink: string
      thumbnailUrl?: string
    }
    link?: {
      url: string
      title?: string
      thumbnailUrl?: string
    }
    form?: {
      formUrl: string
      responseUrl: string
      title: string
      thumbnailUrl?: string
    }
  }>
  state: 'PUBLISHED' | 'DRAFT' | 'DELETED'
  alternateLink: string
  creationTime: string
  updateTime: string
  dueDate?: {
    year: number
    month: number
    day: number
  }
  dueTime?: {
    hours: number
    minutes: number
    seconds: number
    nanos: number
  }
  maxPoints?: number
  workType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION'
  assigneeMode: 'ALL_STUDENTS' | 'INDIVIDUAL_STUDENTS'
  individualStudentsOptions?: {
    studentIds: string[]
  }
  submissionModificationMode: 'MODIFIABLE_UNTIL_TURNED_IN' | 'MODIFIABLE'
  creatorUserId: string
  topicId?: string
}

export interface ClassroomSubmission {
  courseId: string
  courseWorkId: string
  id: string
  userId: string
  creationTime: string
  updateTime: string
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT'
  late: boolean
  draftGrade?: number
  assignedGrade?: number
  alternateLink: string
  courseWorkType: 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION'
  associatedWithDeveloper: boolean
  assignmentSubmission?: {
    attachments: Array<{
      driveFile?: {
        id: string
        title: string
        alternateLink: string
        thumbnailUrl?: string
      }
      youTubeVideo?: {
        id: string
        title: string
        alternateLink: string
        thumbnailUrl?: string
      }
      link?: {
        url: string
        title?: string
        thumbnailUrl?: string
      }
      form?: {
        formUrl: string
        responseUrl: string
        title: string
        thumbnailUrl?: string
      }
    }>
  }
  shortAnswerSubmission?: {
    answer: string
  }
  multipleChoiceSubmission?: {
    answer: string
  }
}

export interface ClassroomTopic {
  courseId: string
  topicId: string
  name: string
  updateTime: string
}

// Google Classroom API Service
export class GoogleClassroomService {
  private classroom: any
  private classroomId: string

  constructor(clientEmail: string, privateKey: string, classroomId: string) {
    const auth = new google.auth.JWT(
      clientEmail,
      undefined,
      privateKey.replace(/\\n/g, '\n'),
      [
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.rosters.readonly',
        'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
        'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
        'https://www.googleapis.com/auth/classroom.topics.readonly'
      ]
    )
    
    this.classroom = google.classroom({ 
      version: 'v1', 
      auth 
    })
    this.classroomId = classroomId
  }

  async getCourse(): Promise<ClassroomCourse> {
    try {
      const response = await this.classroom.courses.get({
        id: this.classroomId
      })
      return response.data
    } catch (error) {
      console.error('Error fetching course:', error)
      throw new Error('Failed to fetch course')
    }
  }

  async getCourseStudents(): Promise<ClassroomStudent[]> {
    try {
      const response = await this.classroom.courses.students.list({
        courseId: this.classroomId
      })
      return response.data.students || []
    } catch (error) {
      console.error('Error fetching students:', error)
      throw new Error('Failed to fetch students')
    }
  }

  async getCourseTeachers(): Promise<ClassroomTeacher[]> {
    try {
      const response = await this.classroom.courses.teachers.list({
        courseId: this.classroomId
      })
      return response.data.teachers || []
    } catch (error) {
      console.error('Error fetching teachers:', error)
      throw new Error('Failed to fetch teachers')
    }
  }

  async getCourseAssignments(): Promise<ClassroomAssignment[]> {
    try {
      const response = await this.classroom.courses.courseWork.list({
        courseId: this.classroomId,
        courseWorkStates: ['PUBLISHED', 'DRAFT']
      })
      return response.data.courseWork || []
    } catch (error) {
      console.error('Error fetching assignments:', error)
      throw new Error('Failed to fetch assignments')
    }
  }

  async getAssignmentSubmissions(courseWorkId: string): Promise<ClassroomSubmission[]> {
    try {
      const response = await this.classroom.courses.courseWork.studentSubmissions.list({
        courseId: this.classroomId,
        courseWorkId
      })
      return response.data.studentSubmissions || []
    } catch (error) {
      console.error('Error fetching submissions:', error)
      throw new Error('Failed to fetch submissions')
    }
  }

  async getCourseTopics(): Promise<ClassroomTopic[]> {
    try {
      const response = await this.classroom.courses.topics.list({
        courseId: this.classroomId
      })
      return response.data.topic || []
    } catch (error) {
      console.error('Error fetching topics:', error)
      throw new Error('Failed to fetch topics')
    }
  }

  async getClassroomAnalytics() {
    try {
      const [course, students, assignments, topics] = await Promise.all([
        this.getCourse(),
        this.getCourseStudents(),
        this.getCourseAssignments(),
        this.getCourseTopics()
      ])

      // Get all submissions for all assignments
      const submissionsPromises = assignments.map(assignment =>
        this.getAssignmentSubmissions(assignment.id)
      )
      const submissionsArrays = await Promise.all(submissionsPromises)
      const submissions = submissionsArrays.flat()

      // Calculate analytics
      const totalStudents = students.length
      const totalAssignments = assignments.length
      const totalTopics = topics.length
      const totalSubmissions = submissions.length
      const completedSubmissions = submissions.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length
      const lateSubmissions = submissions.filter(s => s.late).length
      
      const completionRate = totalStudents > 0 && totalAssignments > 0 
        ? (completedSubmissions / (totalStudents * totalAssignments)) * 100 
        : 0

      const gradedSubmissions = submissions.filter(s => s.assignedGrade !== undefined && s.assignedGrade !== null)
      const averageGrade = gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.assignedGrade || 0), 0) / gradedSubmissions.length
        : 0

      return {
        course,
        students,
        assignments,
        topics,
        submissions,
        analytics: {
          totalStudents,
          totalAssignments,
          totalTopics,
          totalSubmissions,
          completedSubmissions,
          lateSubmissions,
          completionRate,
          averageGrade
        }
      }
    } catch (error) {
      console.error('Error fetching classroom analytics:', error)
      throw new Error('Failed to fetch classroom analytics')
    }
  }

  async getStudentAnalytics(studentId: string) {
    try {
      const assignments = await this.getCourseAssignments()
      
      const submissionsPromises = assignments.map(assignment =>
        this.getAssignmentSubmissions(assignment.id)
      )
      const submissionsArrays = await Promise.all(submissionsPromises)
      const allSubmissions = submissionsArrays.flat()
      
      const studentSubmissions = allSubmissions.filter(s => s.userId === studentId)
      
      const completedSubmissions = studentSubmissions.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length
      const lateSubmissions = studentSubmissions.filter(s => s.late).length
      const gradedSubmissions = studentSubmissions.filter(s => s.assignedGrade !== undefined && s.assignedGrade !== null)
      
      const averageGrade = gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + (s.assignedGrade || 0), 0) / gradedSubmissions.length
        : 0
        
      const completionRate = assignments.length > 0 ? (completedSubmissions / assignments.length) * 100 : 0

      return {
        totalAssignments: assignments.length,
        completedSubmissions,
        lateSubmissions,
        averageGrade,
        completionRate,
        submissions: studentSubmissions
      }
    } catch (error) {
      console.error('Error fetching student analytics:', error)
      throw new Error('Failed to fetch student analytics')
    }
  }
}

// Utility functions
export function formatDueDate(dueDate?: { year: number; month: number; day: number }, dueTime?: { hours: number; minutes: number }): Date | null {
  if (!dueDate) return null
  
  const date = new Date(dueDate.year, dueDate.month - 1, dueDate.day)
  
  if (dueTime) {
    date.setHours(dueTime.hours, dueTime.minutes)
  }
  
  return date
}

export function isAssignmentOverdue(assignment: ClassroomAssignment): boolean {
  const dueDate = formatDueDate(assignment.dueDate, assignment.dueTime)
  if (!dueDate) return false
  
  return new Date() > dueDate
}

export function getSubmissionStatus(submission: ClassroomSubmission): 'submitted' | 'late' | 'missing' | 'returned' {
  if (submission.state === 'RETURNED') return 'returned'
  if (submission.state === 'TURNED_IN') return submission.late ? 'late' : 'submitted'
  return 'missing'
}
