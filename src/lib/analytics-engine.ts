import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'

export interface StudentData {
  id: string
  userId?: string
  name: string
  email: string
  profile?: {
    name?: { fullName?: string }
    emailAddress?: string
    photoUrl?: string
  }
}

export interface AssignmentData {
  id: string
  title: string
  description?: string
  maxPoints?: number
  dueDate?: any
  state: string
  workType?: string
}

export interface TopicData {
  topicId: string
  name: string
}

export interface SubmissionData {
  assignmentId: string
  assignmentTitle: string
  assignmentMaxPoints: number
  studentId: string
  submissionId: string
  state: string
  isSubmitted: boolean
  isGraded: boolean
  assignedGrade?: number
  gradePercentage?: number
  late: boolean
  creationTime: string
  updateTime: string
}

export interface AnalyticsData {
  students: StudentData[]
  assignments: AssignmentData[]
  topics?: TopicData[]
  submissions?: SubmissionData[]
}

export interface StudentAnalytics {
  studentId: string
  name: string
  email: string
  currentGrade: number
  grade: number
  completionRate: number
  submissionCount: number
  lateSubmissions: number
  trend: 'improving' | 'declining' | 'stable'
  riskLevel: 'low' | 'medium' | 'high'
  weeklyProgress: { week: string; grade: number; completion: number }[]
  recentSubmissions: SubmissionData[]
}

export interface ClassAnalytics {
  totalStudents: number
  totalAssignments: number
  averageGrade: number
  averageCompletionRate: number
  studentsAtRisk: number
  topPerformers: StudentAnalytics[]
  strugglingStudents: StudentAnalytics[]
  trends: {
    gradesTrend: 'improving' | 'declining' | 'stable'
    completionTrend: 'improving' | 'declining' | 'stable'
    weeklyProgress: { week: string; averageGrade: number; completionRate: number }[]
    performanceDistribution: { range: string; count: number; percentage: number }[]
    submissionPatterns: { day: string; submissions: number; onTime: number; late: number }[]
  }
  weeklyProgress: { week: string; averageGrade: number; completionRate: number }[]
  overallPerformance?: {
    grade: number
    completion: number
    trend: string
    averageGrade: number
    completionRate: number
    activeStudents: number
    totalStudents: number
  }
  insights?: {
    topPerformers: StudentAnalytics[]
    strugglingStudents: StudentAnalytics[]
    atRiskStudents: StudentAnalytics[]
    improvingStudents: StudentAnalytics[]
  }
}

export class AnalyticsEngine {
  private data: AnalyticsData

  constructor(data: AnalyticsData) {
    this.data = data
  }

  private calculateStudentAnalytics(student: any, submissions: any[]): StudentAnalytics {
    const studentSubmissions = submissions.filter(s => 
      s.studentId === student.userId || 
      s.userId === student.userId || 
      s.studentId === student.profile?.id ||
      s.userId === student.profile?.id
    )
    
    if (studentSubmissions.length === 0) {
      return this.createPlaceholderStudentAnalytics(student.userId || student.profile?.id)
    }

    const totalSubmissions = studentSubmissions.length
    const submittedCount = studentSubmissions.filter(s => s.state === 'RETURNED' || s.state === 'TURNED_IN').length
    const gradedSubmissions = studentSubmissions.filter(s => s.assignedGrade !== null && s.assignedGrade !== undefined)
    const lateSubmissions = studentSubmissions.filter(s => s.late)
    
    const completionRate = totalSubmissions > 0 ? (submittedCount / totalSubmissions) * 100 : 0
    const averageGrade = gradedSubmissions.length > 0 
      ? gradedSubmissions.reduce((sum, s) => sum + ((s.assignedGrade / 100) * 100 || 0), 0) / gradedSubmissions.length 
      : 0

    // Simplified trend calculation
    const trend: 'improving' | 'declining' | 'stable' = averageGrade >= 80 ? 'improving' : averageGrade < 60 ? 'declining' : 'stable'
    
    // Simplified risk level calculation
    const riskLevel: 'low' | 'medium' | 'high' = averageGrade >= 80 && completionRate >= 90 ? 'low' : 
                                                 averageGrade >= 60 && completionRate >= 70 ? 'medium' : 'high'



    return {
      studentId: student.userId || student.id,
      name: student.profile?.name?.fullName || student.name || `Student ${(student.userId || student.id).slice(-4)}`,
      email: student.profile?.emailAddress || student.email || 'unknown@example.com',
      currentGrade: Math.round(averageGrade),
      grade: Math.round(averageGrade),
      completionRate: Math.round(completionRate),
      submissionCount: submittedCount,
      lateSubmissions: lateSubmissions.length,
      trend,
      riskLevel,

      weeklyProgress: [],
      recentSubmissions: studentSubmissions.slice(0, 5)
    }
  }

  analyzeStudentPerformance(studentId: string): StudentAnalytics {
    const student = this.data.students.find(s => s.id === studentId || s.userId === studentId)
    if (!student) {
      console.warn(`Student with ID ${studentId} not found, creating placeholder data`)
      // Return placeholder data instead of throwing error
      return this.createPlaceholderStudentAnalytics(studentId)
    }

    // Get actual submission data for this student
    const studentSubmissions = this.data.submissions?.filter(s => s.studentId === studentId) || []
    return this.calculateStudentAnalytics(student, studentSubmissions)
  }

  analyzeClassPerformance(): ClassAnalytics {
    const studentAnalytics = this.data.students.map(student => 
      this.analyzeStudentPerformance(student.userId || student.id)
    )

    const totalStudents = studentAnalytics.length
    const totalAssignments = this.data.assignments.length
    
    const averageGrade = totalStudents > 0 
      ? studentAnalytics.reduce((sum, student) => sum + student.currentGrade, 0) / totalStudents 
      : 0

    const averageCompletionRate = totalStudents > 0 
      ? studentAnalytics.reduce((sum, student) => sum + student.completionRate, 0) / totalStudents 
      : 0

    const studentsAtRisk = studentAnalytics.filter(s => s.riskLevel === 'high').length
    const topPerformers = studentAnalytics
      .filter(s => s.currentGrade >= 85 && s.completionRate >= 90)
      .sort((a, b) => b.currentGrade - a.currentGrade)
      .slice(0, 3)

    const strugglingStudents = studentAnalytics
      .filter(s => s.riskLevel === 'high' || s.currentGrade < 60)
      .sort((a, b) => a.currentGrade - b.currentGrade)
      .slice(0, 5)

    // Simplified trend calculations
    const gradesTrend: 'improving' | 'declining' | 'stable' = averageGrade >= 80 ? 'improving' : averageGrade < 60 ? 'declining' : 'stable'
    const completionTrend: 'improving' | 'declining' | 'stable' = averageCompletionRate >= 80 ? 'improving' : averageCompletionRate < 60 ? 'declining' : 'stable'
    

    
    // Simplified weekly progress
    const weeklyProgress: any[] = []
    
    // Performance distribution
    const performanceDistribution = [
      { range: '90-100%', count: studentAnalytics.filter(s => s.currentGrade >= 90).length, percentage: 0 },
      { range: '80-89%', count: studentAnalytics.filter(s => s.currentGrade >= 80 && s.currentGrade < 90).length, percentage: 0 },
      { range: '70-79%', count: studentAnalytics.filter(s => s.currentGrade >= 70 && s.currentGrade < 80).length, percentage: 0 },
      { range: '60-69%', count: studentAnalytics.filter(s => s.currentGrade >= 60 && s.currentGrade < 70).length, percentage: 0 },
      { range: 'Below 60%', count: studentAnalytics.filter(s => s.currentGrade < 60).length, percentage: 0 }
    ].map(item => ({
      ...item,
      percentage: totalStudents > 0 ? Math.round((item.count / totalStudents) * 100) : 0
    }))
    
    // Submission patterns
    const submissionPatterns = [
      { day: 'Mon', submissions: 0, onTime: 0, late: 0 },
      { day: 'Tue', submissions: 0, onTime: 0, late: 0 },
      { day: 'Wed', submissions: 0, onTime: 0, late: 0 },
      { day: 'Thu', submissions: 0, onTime: 0, late: 0 },
      { day: 'Fri', submissions: 0, onTime: 0, late: 0 },
      { day: 'Sat', submissions: 0, onTime: 0, late: 0 },
      { day: 'Sun', submissions: 0, onTime: 0, late: 0 }
    ]

    return {
      totalStudents,
      totalAssignments,
      averageGrade: Math.round(averageGrade * 100) / 100,
      averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
      studentsAtRisk,
      topPerformers,
      strugglingStudents,
      trends: {
        gradesTrend,
        completionTrend,
        weeklyProgress,
        performanceDistribution,
        submissionPatterns
      },
      weeklyProgress,
      overallPerformance: {
        grade: Math.round(averageGrade * 100) / 100,
        completion: Math.round(averageCompletionRate * 100) / 100,
        trend: gradesTrend,
        averageGrade: Math.round(averageGrade * 100) / 100,
        completionRate: Math.round(averageCompletionRate * 100) / 100,
        activeStudents: totalStudents,
        totalStudents: totalStudents
      },
      insights: {
        topPerformers,
        strugglingStudents,
        atRiskStudents: studentAnalytics.filter(s => s.riskLevel === 'high'),
        improvingStudents: studentAnalytics.filter(s => s.trend === 'improving')
      }
    }
  }

  private calculateTrendFromSubmissions(submissions: SubmissionData[]): 'improving' | 'declining' | 'stable' {
    if (submissions.length < 3) return 'stable'

    const recentSubmissions = submissions
      .filter(s => s.isGraded && s.gradePercentage !== null)
      .sort((a, b) => new Date(a.updateTime).getTime() - new Date(b.updateTime).getTime())
      .slice(-5)

    if (recentSubmissions.length < 3) return 'stable'

    const firstHalf = recentSubmissions.slice(0, Math.floor(recentSubmissions.length / 2))
    const secondHalf = recentSubmissions.slice(Math.floor(recentSubmissions.length / 2))

    const firstAvg = firstHalf.reduce((sum, s) => sum + (s.gradePercentage || 0), 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, s) => sum + (s.gradePercentage || 0), 0) / secondHalf.length

    const difference = secondAvg - firstAvg
    
    if (difference > 5) return 'improving'
    if (difference < -5) return 'declining'
    return 'stable'
  }

  private assessRiskLevel(grade: number, completionRate: number, lateSubmissions: number): 'low' | 'medium' | 'high' {
    let riskScore = 0

    // Grade risk
    if (grade < 60) riskScore += 3
    else if (grade < 70) riskScore += 2
    else if (grade < 80) riskScore += 1

    // Completion rate risk
    if (completionRate < 50) riskScore += 3
    else if (completionRate < 70) riskScore += 2
    else if (completionRate < 85) riskScore += 1

    // Late submission risk
    if (lateSubmissions > 3) riskScore += 2
    else if (lateSubmissions > 1) riskScore += 1

    if (riskScore >= 5) return 'high'
    if (riskScore >= 3) return 'medium'
    return 'low'
  }



  private calculateWeeklyProgressFromSubmissions(submissions: SubmissionData[]): { week: string; grade: number; completion: number }[] {
    const weeks: { week: string; grade: number; completion: number }[] = []
    const now = new Date()

    for (let i = 4; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(now, i * 7))
      const weekEnd = endOfWeek(weekStart)
      const weekLabel = format(weekStart, 'MMM dd')

      const weekSubmissions = submissions.filter(s => {
        const submissionDate = new Date(s.updateTime)
        return submissionDate >= weekStart && submissionDate <= weekEnd
      })

      const gradedWeekSubmissions = weekSubmissions.filter(s => s.isGraded && s.gradePercentage !== null)
      const weekGrade = gradedWeekSubmissions.length > 0
        ? gradedWeekSubmissions.reduce((sum, s) => sum + (s.gradePercentage || 0), 0) / gradedWeekSubmissions.length
        : 0

      const weekCompletion = weekSubmissions.length > 0
        ? (weekSubmissions.filter(s => s.isSubmitted).length / weekSubmissions.length) * 100
        : 0

      weeks.push({
        week: weekLabel,
        grade: Math.round(weekGrade * 100) / 100,
        completion: Math.round(weekCompletion * 100) / 100
      })
    }

    return weeks
  }

  private createPlaceholderStudentAnalytics(studentId: string): StudentAnalytics {
    // Try to find the student in the data to get their actual name
    const student = this.data.students.find(s => 
      s.id === studentId || 
      s.userId === studentId
    )
    
    const studentName = student ? 
      (student.profile?.name?.fullName || student.name || `Student ${studentId.slice(-4)}`) :
      `Student ${studentId.slice(-4)}`

    return {
      studentId,
      name: studentName,
      email: student?.profile?.emailAddress || student?.email || 'unknown@example.com',
      currentGrade: 0,
      grade: 0,
      completionRate: 0,
      submissionCount: 0,
      lateSubmissions: 0,
      trend: 'stable',
      riskLevel: 'high',

      weeklyProgress: [],
      recentSubmissions: []
    }
  }

  private calculateClassGradeTrend(studentAnalytics: StudentAnalytics[]): 'improving' | 'declining' | 'stable' {
    const trends = studentAnalytics.map(s => s.trend)
    const improving = trends.filter(t => t === 'improving').length
    const declining = trends.filter(t => t === 'declining').length

    if (improving > declining * 1.5) return 'improving'
    if (declining > improving * 1.5) return 'declining'
    return 'stable'
  }

  private calculateClassCompletionTrend(studentAnalytics: StudentAnalytics[]): 'improving' | 'declining' | 'stable' {
    const avgCompletion = studentAnalytics.reduce((sum, s) => sum + s.completionRate, 0) / studentAnalytics.length
    
    if (avgCompletion > 80) return 'improving'
    if (avgCompletion < 60) return 'declining'
    return 'stable'
  }

  private generateClassRecommendations(studentAnalytics: StudentAnalytics[], avgGrade: number, avgCompletion: number): string[] {
    const recommendations: string[] = []
    const highRiskCount = studentAnalytics.filter(s => s.riskLevel === 'high').length

    if (highRiskCount > studentAnalytics.length * 0.3) {
      recommendations.push('Consider implementing class-wide intervention strategies')
      recommendations.push('Review assignment complexity and provide more scaffolding')
    }

    if (avgGrade < 70) {
      recommendations.push('Review assignment complexity and provide more scaffolding')
      recommendations.push('Implement additional support resources and review sessions')
    }

    if (avgCompletion < 70) {
      recommendations.push('Implement additional support resources and review sessions')
      recommendations.push('Consider assignment deadline and workload adjustments')
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current teaching strategies')
      recommendations.push('Consider advanced enrichment opportunities for high performers')
    }

    return recommendations
  }

  private calculateClassWeeklyProgress(studentAnalytics: StudentAnalytics[]): { week: string; averageGrade: number; completionRate: number }[] {
    if (studentAnalytics.length === 0) return []

    const weeklyData: { week: string; averageGrade: number; completionRate: number }[] = []
    const sampleWeeklyProgress = studentAnalytics[0]?.weeklyProgress || []

    sampleWeeklyProgress.forEach((_, index) => {
      const weekGrades = studentAnalytics
        .map(s => s.weeklyProgress[index]?.grade || 0)
        .filter(grade => grade > 0)

      const weekCompletions = studentAnalytics
        .map(s => s.weeklyProgress[index]?.completion || 0)
        .filter(completion => completion > 0)

      const averageGrade = weekGrades.length > 0
        ? weekGrades.reduce((sum, grade) => sum + grade, 0) / weekGrades.length
        : 0

      const completionRate = weekCompletions.length > 0
        ? weekCompletions.reduce((sum, completion) => sum + completion, 0) / weekCompletions.length
        : 0

      weeklyData.push({
        week: sampleWeeklyProgress[index]?.week || `Week ${index + 1}`,
        averageGrade: Math.round(averageGrade * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100
      })
    })

    return weeklyData
  }

  private calculatePerformanceDistribution(studentAnalytics: StudentAnalytics[]): { range: string; count: number; percentage: number }[] {
    const ranges = [
      { range: '90-100%', min: 90, max: 100 },
      { range: '80-89%', min: 80, max: 89 },
      { range: '70-79%', min: 70, max: 79 },
      { range: '60-69%', min: 60, max: 69 },
      { range: 'Below 60%', min: 0, max: 59 }
    ]

    const total = studentAnalytics.length
    return ranges.map(range => {
      const count = studentAnalytics.filter(s => 
        s.currentGrade >= range.min && s.currentGrade <= range.max
      ).length
      return {
        range: range.range,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }
    })
  }

  private calculateSubmissionPatterns(): { day: string; submissions: number; onTime: number; late: number }[] {
    const submissions = this.data.submissions || []
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    return days.map(day => {
      const daySubmissions = submissions.filter(s => {
        const submissionDate = new Date(s.updateTime)
        return days[submissionDate.getDay()] === day
      })
      
      const onTime = daySubmissions.filter(s => !s.late).length
      const late = daySubmissions.filter(s => s.late).length
      
      return {
        day,
        submissions: daySubmissions.length,
        onTime,
        late
      }
    })
  }
}

// Export legacy interface for backward compatibility
export interface StudentPerformanceData {
  studentId: string
  name: string
  studentName: string
  email: string
  overallGrade: number
  currentGrade: number
  grade: number
  completionRate: number
  submissionCount: number
  lateSubmissions: number
  assignments: any[]
  riskLevel: 'low' | 'medium' | 'high'
  trend: 'improving' | 'declining' | 'stable'
  predictions: {
    finalGrade: number
    completionProbability: number
    likelyFinalGrade: number
    riskOfFailure: number
    nextAssignmentSuccess: number
    recommendedInterventions: string[]
    classAverageProjection: number
    interventionNeeded: boolean
    expectedCompletionRate: number
  }
  recommendations: string[]
  weeklyProgress: { week: string; grade: number; completion: number }[]
  recentSubmissions: any[]
}

// Export a singleton instance for backward compatibility
export const analyticsEngine = {
  analyzeStudentPerformance: (student: any, assignments: any[], submissions: any[]) => {
    try {
      // Normalize student data structure
      const normalizedStudent = {
        id: student.userId || student.id || student.profile?.id,
        userId: student.userId || student.id,
        name: student.profile?.name?.fullName || student.name || 'Unknown Student',
        email: student.profile?.emailAddress || student.email || 'unknown@example.com',
        profile: student.profile
      }

      const engine = new AnalyticsEngine({
        students: [normalizedStudent],
        assignments: assignments || [],
        topics: [],
        submissions: submissions || []
      })
      return engine.analyzeStudentPerformance(normalizedStudent.id)
    } catch (error) {
      console.error('Error in analyzeStudentPerformance:', error)
      // Return safe fallback data
      return {
        studentId: student.userId || student.id || 'unknown',
        name: student.profile?.name?.fullName || 'Unknown Student',
        email: student.profile?.emailAddress || 'unknown@example.com',
        currentGrade: 0,
        grade: 0,
        completionRate: 0,
        submissionCount: 0,
        lateSubmissions: 0,
        trend: 'stable' as const,
        riskLevel: 'medium' as const,
        predictions: {
          finalGrade: 0,
          completionProbability: 0,
          likelyFinalGrade: 0,
          riskOfFailure: 50,
          nextAssignmentSuccess: 0,
          recommendedInterventions: ['Data analysis error - please refresh'],
          classAverageProjection: 0,
          interventionNeeded: false,
          expectedCompletionRate: 0
        },
        recommendations: ['Data analysis error - please refresh'],
        weeklyProgress: [],
        recentSubmissions: []
      }
    }
  },
  analyzeClassPerformance: (students: any[], assignments: any[], submissions: any[]) => {
    try {
      // Normalize all student data
      const normalizedStudents = (students || []).map(student => ({
        id: student.userId || student.id || student.profile?.id || `student_${Math.random()}`,
        userId: student.userId || student.id,
        name: student.profile?.name?.fullName || student.name || 'Unknown Student',
        email: student.profile?.emailAddress || student.email || 'unknown@example.com',
        profile: student.profile
      }))

      const engine = new AnalyticsEngine({
        students: normalizedStudents,
        assignments: assignments || [],
        topics: [],
        submissions: submissions || []
      })
      return engine.analyzeClassPerformance()
    } catch (error) {
      console.error('Error in analyzeClassPerformance:', error)
      // Return safe fallback data
      return {
        totalStudents: students?.length || 0,
        totalAssignments: assignments?.length || 0,
        averageGrade: 0,
        averageCompletionRate: 0,
        studentsAtRisk: 0,
        topPerformers: [],
        strugglingStudents: [],
        trends: {
          gradesTrend: 'stable' as const,
          completionTrend: 'stable' as const,
          weeklyProgress: [],
          performanceDistribution: [],
          submissionPatterns: []
        },
        recommendations: ['Data analysis error - please refresh'],
        weeklyProgress: [],
        predictions: {
          finalGrade: 0,
          completionProbability: 0,
          likelyFinalGrade: 0,
          riskOfFailure: 0,
          nextAssignmentSuccess: 0,
          recommendedInterventions: [],
          classAverageProjection: 0,
          interventionNeeded: false,
          expectedCompletionRate: 0
        },
        overallPerformance: {
          grade: 0,
          completion: 0,
          trend: 'stable',
          averageGrade: 0,
          completionRate: 0,
          activeStudents: 0,
          totalStudents: students?.length || 0
        },
        insights: {
          topPerformers: [],
          strugglingStudents: [],
          recommendations: ['Data analysis error - please refresh'],
          atRiskStudents: [],
          improvingStudents: []
        }
      }
    }
  }
}
