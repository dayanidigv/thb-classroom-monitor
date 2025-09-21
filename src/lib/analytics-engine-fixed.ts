import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'

export interface StudentData {
  id: string
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
  completionRate: number
  submissionCount: number
  lateSubmissions: number
  trend: 'improving' | 'declining' | 'stable'
  riskLevel: 'low' | 'medium' | 'high'
  predictions: {
    finalGrade: number
    completionProbability: number
  }
  recommendations: string[]
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
  }
  recommendations: string[]
  weeklyProgress: { week: string; averageGrade: number; completionRate: number }[]
}

export class AnalyticsEngine {
  private data: AnalyticsData

  constructor(data: AnalyticsData) {
    this.data = data
  }

  analyzeStudentPerformance(studentId: string): StudentAnalytics {
    const student = this.data.students.find(s => s.id === studentId)
    if (!student) {
      throw new Error(`Student with ID ${studentId} not found`)
    }

    // Get actual submission data for this student
    const studentSubmissions = this.data.submissions?.filter(s => s.studentId === studentId) || []
    const totalAssignments = this.data.assignments.length
    const submittedCount = studentSubmissions.filter(s => s.isSubmitted).length
    const gradedSubmissions = studentSubmissions.filter(s => s.isGraded && s.gradePercentage !== null)
    const lateSubmissions = studentSubmissions.filter(s => s.late).length

    // Calculate actual metrics from real data
    const currentGrade = gradedSubmissions.length > 0 
      ? gradedSubmissions.reduce((sum, s) => sum + (s.gradePercentage || 0), 0) / gradedSubmissions.length
      : 0

    const completionRate = totalAssignments > 0 ? (submittedCount / totalAssignments) * 100 : 0
    const trend = this.calculateTrendFromSubmissions(studentSubmissions)
    const riskLevel = this.assessRiskLevel(currentGrade, completionRate, lateSubmissions)
    const predictions = this.generatePredictions(currentGrade, completionRate, trend)
    const recommendations = this.generateRecommendations(riskLevel, currentGrade, completionRate, lateSubmissions)
    const weeklyProgress = this.calculateWeeklyProgressFromSubmissions(studentSubmissions)

    return {
      studentId,
      name: student.name,
      email: student.email,
      currentGrade: Math.round(currentGrade * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      submissionCount: submittedCount,
      lateSubmissions: lateSubmissions,
      trend,
      riskLevel,
      predictions,
      recommendations,
      weeklyProgress,
      recentSubmissions: studentSubmissions
        .sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime())
        .slice(0, 5)
    }
  }

  analyzeClassPerformance(): ClassAnalytics {
    const studentAnalytics = this.data.students.map(student => 
      this.analyzeStudentPerformance(student.id)
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

    const gradesTrend = this.calculateClassGradeTrend(studentAnalytics)
    const completionTrend = this.calculateClassCompletionTrend(studentAnalytics)
    const recommendations = this.generateClassRecommendations(studentAnalytics, averageGrade, averageCompletionRate)
    const weeklyProgress = this.calculateClassWeeklyProgress(studentAnalytics)

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
        completionTrend
      },
      recommendations,
      weeklyProgress
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

  private generatePredictions(grade: number, completionRate: number, trend: string): { finalGrade: number; completionProbability: number } {
    let finalGrade = grade
    let completionProbability = completionRate

    // Adjust based on trend
    if (trend === 'improving') {
      finalGrade = Math.min(100, grade + 5)
      completionProbability = Math.min(100, completionRate + 10)
    } else if (trend === 'declining') {
      finalGrade = Math.max(0, grade - 5)
      completionProbability = Math.max(0, completionRate - 10)
    }

    return {
      finalGrade: Math.round(finalGrade * 100) / 100,
      completionProbability: Math.round(completionProbability * 100) / 100
    }
  }

  private generateRecommendations(riskLevel: string, grade: number, completionRate: number, lateSubmissions: number): string[] {
    const recommendations: string[] = []

    if (riskLevel === 'high') {
      recommendations.push('Schedule immediate intervention meeting')
      recommendations.push('Provide additional tutoring resources')
    }

    if (grade < 70) {
      recommendations.push('Review assignment complexity and provide more scaffolding')
      recommendations.push('Implement additional support resources and review sessions')
    }

    if (completionRate < 70) {
      recommendations.push('Check in with student about assignment understanding')
      recommendations.push('Provide assignment reminders and deadline management support')
    }

    if (lateSubmissions > 2) {
      recommendations.push('Discuss time management strategies')
      recommendations.push('Consider flexible deadline arrangements if appropriate')
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current engagement strategies')
      recommendations.push('Consider advanced enrichment opportunities')
    }

    return recommendations
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
}
