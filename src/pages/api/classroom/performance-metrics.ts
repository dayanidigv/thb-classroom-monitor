import { NextApiRequest, NextApiResponse } from 'next'
import { GoogleAuthManager } from '../../../lib/google-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Fetch both Google Classroom data and attendance data in parallel
    const [classroomDataResult, attendanceDataResult] = await Promise.all([
      (async () => {
        const authManager = GoogleAuthManager.getInstance()
        const classroom = await authManager.getClassroomService()
        const classroomId = process.env.CLASSROOM_ID

        if (!classroomId) {
          throw new Error('CLASSROOM_ID not configured')
        }

        const [studentsResponse, assignmentsResponse] = await Promise.all([
          classroom.courses.students.list({ courseId: classroomId }),
          classroom.courses.courseWork.list({ 
            courseId: classroomId,
            courseWorkStates: ['PUBLISHED']
          })
        ])

        // Fetch submissions for each assignment
        const submissionsPromises = (assignmentsResponse.data.courseWork || []).map(assignment =>
          classroom.courses.courseWork.studentSubmissions.list({
            courseId: classroomId,
            courseWorkId: assignment.id!
          })
        )
        const submissionsArrays = await Promise.all(submissionsPromises)
        const allSubmissions = submissionsArrays.flatMap(result => result.data.studentSubmissions || [])

        return {
          students: studentsResponse.data.students || [],
          assignments: assignmentsResponse.data.courseWork || [],
          submissions: allSubmissions
        }
      })(),
      fetch('https://script.google.com/macros/s/AKfycby2hkg41EwBSU2PBDTNi4nMz8j37DregPiAyM48gVdY2G9mtlZiWV6T4ciUrRsa7HnF/exec?apiKey=THB-TD-B1-0925')
        .then(res => res.json())
    ])

    const { students, assignments, submissions } = classroomDataResult
    const attendanceData = attendanceDataResult.status === 'success' ? attendanceDataResult.data : []

    // Enhanced name matching system (same as attendance API)
    const createNameMatcher = (name: string) => {
      const normalized = name.toLowerCase().trim()
      // Split on both spaces and dots to handle "d.k.pavithran"
      const words = normalized.split(/[\s\.]+/).filter(w => w.length > 1) // Filter out single characters
      const allParts = normalized.split(/[\s\.]+/).filter(w => w.length > 0) // Keep all parts including single chars
      return {
        exact: normalized,
        reversed: words.slice().reverse().join(' '), // "John Doe" -> "doe john"
        firstLast: words.length >= 2 ? `${words[0]} ${words[words.length - 1]}` : normalized,
        lastFirst: words.length >= 2 ? `${words[words.length - 1]} ${words[0]}` : normalized,
        words: words, // Only words longer than 1 char for matching
        allParts: allParts, // All parts for comprehensive matching
        initials: allParts.map(w => w[0]).join('')
      }
    }

    // Create lookup maps for attendance data by name
    const attendanceByName = new Map()
    
    attendanceData.forEach((student: any) => {
      if (student.name) {
        const matcher = createNameMatcher(student.name)
        
        // Store by various name formats for flexible matching
        attendanceByName.set(matcher.exact, student)
        attendanceByName.set(matcher.reversed, student)
        attendanceByName.set(matcher.firstLast, student)
        attendanceByName.set(matcher.lastFirst, student)
      }
    })

    // Function to find attendance student by classroom name
    const findAttendanceMatch = (classroomName: string) => {
      if (!classroomName) return null
      
      const matcher = createNameMatcher(classroomName)
      
      // Try exact match first
      let found = attendanceByName.get(matcher.exact)
      if (found) return found
      
      // Try reversed name
      found = attendanceByName.get(matcher.reversed)
      if (found) return found
      
      // Try first-last combination
      found = attendanceByName.get(matcher.firstLast)
      if (found) return found
      
      // Try last-first combination  
      found = attendanceByName.get(matcher.lastFirst)
      if (found) return found
      
      // Try partial matches using includes/contains
      const attendanceEntries = Array.from(attendanceByName.entries())
      for (const [attendanceName, studentData] of attendanceEntries) {
        const attendanceMatcher = createNameMatcher(attendanceName)
        
        // Check if any words match (stricter matching to prevent Anisha/Anushree confusion)
        const hasCommonWords = matcher.words.some(word => 
          attendanceMatcher.words.some(aWord => {
            // Exact match first
            if (word === aWord) return true;
            
            // Strict includes matching - prevent short substring matches
            const minLength = Math.min(word.length, aWord.length);
            const maxLength = Math.max(word.length, aWord.length);
            
            // Only allow includes if:
            // 1. Minimum length is at least 4 characters
            // 2. Length difference is not more than 50%
            // 3. The overlap is significant (70%+ of shorter word)
            if (minLength >= 4 && maxLength <= minLength * 1.5) {
              if (word.includes(aWord) && aWord.length >= word.length * 0.7) return true;
              if (aWord.includes(word) && word.length >= aWord.length * 0.7) return true;
            }
            
            return false;
          })
        ) || matcher.allParts.some(part => 
          attendanceMatcher.allParts.some(aPart => {
            // Exact match first
            if (part === aPart) return true;
            
            // More restrictive partial matching
            if (part.length > 3 && aPart.length > 3 && Math.abs(part.length - aPart.length) <= 2) {
              if (part.includes(aPart) && aPart.length >= part.length * 0.8) return true;
              if (aPart.includes(part) && part.length >= aPart.length * 0.8) return true;
            }
            
            return false;
          })
        )
        
        if (hasCommonWords && matcher.words.length >= 2) {
          return studentData
        }
      }
      
      // Try initials match as last resort
      const attendanceValues = Array.from(attendanceByName.values())
      found = attendanceValues.find(student => {
        const studentMatcher = createNameMatcher(student.name)
        return studentMatcher.initials === matcher.initials
      })
      
      return found || null
    }

    // Calculate performance metrics for each student
    const studentPerformance = students.map(student => {
      const studentId = student.userId!
      const studentName = student.profile?.name?.fullName || 'Unknown Student'
      
      // Get attendance data for this student using fuzzy matching
      const attendanceInfo = findAttendanceMatch(studentName) || null
      
      // Get all submissions for this student from Google Classroom
      const studentSubmissions = submissions.filter((sub: any) => sub.userId === studentId)
      
      // Calculate Classroom-based metrics
      const totalAssignments = assignments.length
      const completedSubmissions = studentSubmissions.filter((sub: any) => 
        sub.state === 'TURNED_IN' || sub.state === 'RETURNED'
      ).length
      
      const gradedSubmissions = studentSubmissions.filter((sub: any) => 
        sub.assignedGrade !== undefined && sub.assignedGrade !== null
      )
      
      const classroomAverageGrade = gradedSubmissions.length > 0 
        ? Math.round(gradedSubmissions.reduce((sum: number, sub: any) => sum + (sub.assignedGrade || 0), 0) / gradedSubmissions.length)
        : 0
      
      const completionRate = totalAssignments > 0 
        ? Math.round((completedSubmissions / totalAssignments) * 100)
        : 0
      
      const lateSubmissions = studentSubmissions.filter((sub: any) => sub.late).length
      
      // Use attendance data for points and attendance metrics
      const attendancePoints = attendanceInfo?.totalPoints || 0
      const attendanceRate = attendanceInfo?.attendancePercentage || 0
      
      // Calculate combined performance metrics
      const combinedGrade = attendanceInfo ? 
        Math.round((classroomAverageGrade * 0.6) + ((attendancePoints / 10) * 0.4)) : // Scale attendance points to 0-100
        classroomAverageGrade
      
      // Performance trend based on recent attendance sessions
      let trend = 'stable'
      if (attendanceInfo?.sessions && Array.isArray(attendanceInfo.sessions)) {
        const validSessions = attendanceInfo.sessions
          .filter((session: any) => 
            session && 
            session.status !== null && 
            session.status !== undefined &&
            !session.sessionName?.startsWith('Column') &&
            typeof session.points === 'number'
          )
          .slice(-8) // Look at last 8 sessions for better trend analysis
        
        if (validSessions.length >= 4) {
          const recent = validSessions.slice(-2) // Last 2 sessions
          const older = validSessions.slice(-4, -2) // 2 sessions before that
          
          const recentAvg = recent.length > 0 
            ? recent.reduce((sum: number, session: any) => sum + (session.points || 0), 0) / recent.length
            : 0
          const olderAvg = older.length > 0
            ? older.reduce((sum: number, session: any) => sum + (session.points || 0), 0) / older.length
            : 0
          
          const difference = recentAvg - olderAvg
          if (difference > 0.5) trend = 'improving'
          else if (difference < -0.5) trend = 'declining'
          // else remains 'stable'
        }
      }
      
      return {
        name: studentName,
        studentId: studentId,
        photoUrl: student.profile?.photoUrl || null, // Add photoUrl from Google Classroom profile
        email: student.profile?.emailAddress || 'No email',
        grade: combinedGrade,
        points: attendancePoints,
        completion: completionRate,
        trend: trend,
        totalAssignments: totalAssignments,
        completedAssignments: completedSubmissions,
        averageGrade: combinedGrade,
        lateSubmissions: lateSubmissions,
        attendanceRate: attendanceRate,
        riskLevel: combinedGrade < 30 || completionRate < 40 || attendanceRate < 50 ? 'high' : 
                   combinedGrade < 50 || completionRate < 60 || attendanceRate < 70 ? 'medium' : 'low'
      }
    })

    // Calculate class-level metrics
    const classAverageGrade = studentPerformance.length > 0
      ? Math.round(studentPerformance.reduce((sum, student) => sum + student.grade, 0) / studentPerformance.length)
      : 0
    
    const totalClassPoints = studentPerformance.reduce((sum, student) => sum + student.points, 0)
    const improvingStudents = studentPerformance.filter(s => s.trend === 'improving').length
    const atRiskStudents = studentPerformance.filter(s => s.riskLevel === 'high')

    // Top performers (sorted by combined grade, top 5)
    const topPerformers = [...studentPerformance]
      .sort((a, b) => b.grade - a.grade)
      .slice(0, 5)
      .map(student => ({
        name: student.name,
        grade: student.grade,
        points: student.points
      }))

    // Students needing attention
    const needsAttention = atRiskStudents.map(student => {
      const issues = []
      if (student.grade < 60) issues.push('Low overall performance')
      if (student.completion < 70) issues.push('Missing assignments')
      if (student.lateSubmissions > 2) issues.push('Late submissions')
      if (student.attendanceRate < 70) issues.push('Poor attendance')
      if (student.trend === 'declining') issues.push('Declining performance')
      
      return {
        name: student.name,
        grade: student.grade,
        points: student.points,
        issues: issues
      }
    })

    // Calculate average possible points per student from attendance data
    // Based on API analysis: 19 total sessions, ~4 sessions have all students with 0 points
    // First, identify sessions where all students got 0 points (invalid sessions)
    const allSessionNames = new Set<string>()
    attendanceData.forEach((student: any) => {
      const sessions = student.sessions || []
      sessions.forEach((session: any) => {
        if (session.sessionName && !session.sessionName.startsWith('Column')) {
          allSessionNames.add(session.sessionName)
        }
      })
    })
    
    // Check which sessions are invalid (all students got 0 points)
    const invalidSessions = new Set<string>()
    Array.from(allSessionNames).forEach((sessionName: string) => {
      const allPointsInSession = attendanceData.map((student: any) => {
        const session = (student.sessions || []).find((s: any) => s.sessionName === sessionName)
        return session?.points || 0
      })
      
      const hasAnyNonZeroPoints = allPointsInSession.some((points: number) => points > 0)
      if (!hasAnyNonZeroPoints) {
        invalidSessions.add(sessionName)
        console.log(`Excluding invalid session: ${sessionName} (all students got 0 points)`)
      }
    })
    
    console.log(`Total sessions found: ${allSessionNames.size}, Invalid sessions: ${invalidSessions.size}`)
    
    const averageTotalPointsPossible = attendanceData.length > 0 
      ? Math.round(attendanceData.reduce((sum: number, student: any) => {
          // Get the maximum possible points for this student from valid sessions
          const sessions = student.sessions || []
          const validSessions = sessions.filter((session: any) => 
            session.sessionName && 
            !session.sessionName.startsWith('Column') &&
            session.status !== null &&
            !invalidSessions.has(session.sessionName) // Exclude sessions where all students got 0 points
          )
          
          // Use actual max points from valid sessions (10 points per session as standard)
          const studentMaxPoints = validSessions.length * 10
          return sum + studentMaxPoints
        }, 0) / attendanceData.length)
      : 100

    const performanceMetrics = {
      classMetrics: {
        averageGrade: classAverageGrade,
        averagePointsEarned: Math.round(totalClassPoints / Math.max(studentPerformance.length, 1)), // Fix: Add expected property
        totalPointsPossible: averageTotalPointsPossible, // Use average possible points per student
        studentsImproving: improvingStudents, // Fix: Add expected property
        studentsDeclining: studentPerformance.filter(s => s.trend === 'declining').length, // Fix: Add expected property
        studentsAtRisk: atRiskStudents.length, // Fix: Add expected property
        totalPoints: totalClassPoints,
        improvingCount: improvingStudents,
        atRiskCount: atRiskStudents.length,
        topPerformers: topPerformers,
        needsAttention: needsAttention
      },
      studentPerformance: studentPerformance
    }

    res.status(200).json(performanceMetrics)
  } catch (error) {
    console.error('Performance metrics API error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch performance metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}