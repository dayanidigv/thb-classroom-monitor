import { NextApiRequest, NextApiResponse } from 'next'
import { GoogleAuthManager } from '../../../lib/google-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Fetch both attendance data and classroom student data in parallel
    const [attendanceResponse, classroomStudentsResult] = await Promise.all([
      fetch('https://script.google.com/macros/s/AKfycby2hkg41EwBSU2PBDTNi4nMz8j37DregPiAyM48gVdY2G9mtlZiWV6T4ciUrRsa7HnF/exec?apiKey=THB-TD-B1-0925'),
      (async () => {
        try {
          const authManager = GoogleAuthManager.getInstance()
          const classroom = await authManager.getClassroomService()
          const classroomId = process.env.CLASSROOM_ID
          
          if (!classroomId) {
            throw new Error('CLASSROOM_ID not configured')
          }

          const studentsResponse = await classroom.courses.students.list({ courseId: classroomId })
          return studentsResponse.data.students || []
        } catch (error) {
          console.error('Error fetching classroom students:', error)
          return []
        }
      })()
    ])

    if (!attendanceResponse.ok) {
      throw new Error(`Attendance API returned ${attendanceResponse.status}`)
    }

    const attendanceApiData = await attendanceResponse.json()
    
    if (attendanceApiData.status !== 'success' || !attendanceApiData.data) {
      throw new Error('Invalid attendance API response')
    }

    const attendanceStudents = attendanceApiData.data

    // Create a comprehensive lookup map using multiple name matching strategies
    const createNameMatcher = (name: string) => {
      const normalized = name.toLowerCase().trim()
      const words = normalized.split(/\s+/)
      return {
        exact: normalized,
        reversed: words.reverse().join(' '), // "John Doe" -> "doe john"
        firstLast: words.length >= 2 ? `${words[0]} ${words[words.length - 1]}` : normalized,
        lastFirst: words.length >= 2 ? `${words[words.length - 1]} ${words[0]}` : normalized,
        words: words,
        initials: words.map(w => w[0]).join('')
      }
    }

    // Create lookup maps for Google Classroom students
    const classroomByName = new Map()
    const classroomByEmail = new Map()
    
    classroomStudentsResult.forEach(student => {
      const profile = student.profile
      if (profile?.name?.fullName) {
        const matcher = createNameMatcher(profile.name.fullName)
        const studentData = {
          userId: student.userId,
          photoUrl: profile.photoUrl || null,
          email: profile.emailAddress || null,
          fullName: profile.name.fullName
        }
        
        // Store by various name formats for flexible matching
        classroomByName.set(matcher.exact, studentData)
        classroomByName.set(matcher.reversed, studentData)
        classroomByName.set(matcher.firstLast, studentData)
        classroomByName.set(matcher.lastFirst, studentData)
        
        if (profile.emailAddress) {
          classroomByEmail.set(profile.emailAddress.toLowerCase(), studentData)
        }
      }
    })

    // Function to find classroom student by attendance name
    const findClassroomStudent = (attendanceName: string) => {
      if (!attendanceName) return null
      
      const matcher = createNameMatcher(attendanceName)
      
      // Try exact match first
      let found = classroomByName.get(matcher.exact)
      if (found) return found
      
      // Try reversed name
      found = classroomByName.get(matcher.reversed)
      if (found) return found
      
      // Try first-last combination
      found = classroomByName.get(matcher.firstLast)
      if (found) return found
      
      // Try last-first combination  
      found = classroomByName.get(matcher.lastFirst)
      if (found) return found
      
      // Try partial matches using includes/contains
      const classroomEntries = Array.from(classroomByName.entries())
      for (const [classroomName, studentData] of classroomEntries) {
        const classroomMatcher = createNameMatcher(classroomName)
        
        // Check if any words match (improved matching)
        const hasCommonWords = matcher.words.some(word => 
          classroomMatcher.words.some(cWord => 
            word.includes(cWord) || cWord.includes(word) || word === cWord ||
            // Handle cases like "d.k.pavithran" vs "pavithran"
            word.split('.').some(part => part === cWord || cWord.includes(part)) ||
            cWord.split('.').some(part => part === word || word.includes(part))
          )
        )
        
        if (hasCommonWords && matcher.words.length >= 2) {
          return studentData
        }
      }
      
      // Try initials match as last resort
      const classroomValues = Array.from(classroomByName.values())
      found = classroomValues.find(student => {
        const studentMatcher = createNameMatcher(student.fullName)
        return studentMatcher.initials === matcher.initials
      })
      
      return found || null
    }

    // First pass: Identify sessions where all students have 0 or null points
    const allSessionNames = new Set<string>()
    const sessionPointsData = new Map<string, number[]>()
    
    // Collect all session names and their points data
    attendanceStudents.forEach((student: any) => {
      const sessions = student.sessions || []
      sessions.forEach((session: any) => {
        if (session.sessionName && 
            !session.sessionName.startsWith('Column') && 
            session.status !== null) {
          
          allSessionNames.add(session.sessionName)
          
          if (!sessionPointsData.has(session.sessionName)) {
            sessionPointsData.set(session.sessionName, [])
          }
          
          const points = session.points || 0
          sessionPointsData.get(session.sessionName)?.push(points)
        }
      })
    })
    
    // Identify sessions where ALL students have 0 or null points
    const invalidSessions = new Set<string>()
    sessionPointsData.forEach((pointsArray, sessionName) => {
      const hasAnyValidPoints = pointsArray.some(points => points > 0)
      if (!hasAnyValidPoints) {
        invalidSessions.add(sessionName)
        console.log(`Excluding session "${sessionName}" - all students have 0 points`)
      }
    })

    // Process attendance data for each student
    const studentAttendance = attendanceStudents.map((student: any) => {
      const sessions = student.sessions || []
      
      // Filter out empty/null sessions AND sessions where all students have 0 points
      const validSessions = sessions.filter((session: any) => 
        session.sessionName && 
        !session.sessionName.startsWith('Column') &&
        session.status !== null &&
        !invalidSessions.has(session.sessionName) // NEW: Exclude sessions with all-zero points
      )
      
      // Calculate metrics
      const totalSessions = validSessions.length
      const presentSessions = validSessions.filter((s: any) => s.status === 'Present').length
      const lateSessions = validSessions.filter((s: any) => s.status === 'Late').length
      const absentSessions = validSessions.filter((s: any) => s.status === 'Absent ' || s.status === 'Absent').length
      
      const attendanceRate = student.attendancePercentage || 0
      const punctualityRate = totalSessions > 0 
        ? Math.round((presentSessions / (presentSessions + lateSessions)) * 100) || 0
        : 100
      
      // Calculate engagement score based on points and attendance
      // Only count points from valid sessions (excluding sessions where all students got 0)
      const totalPointsFromValidSessions = validSessions.reduce((sum: number, session: any) => {
        return sum + (session.points || 0)
      }, 0)
      
      const maxPossiblePoints = validSessions.reduce((sum: number, session: any) => {
        // Only count sessions that have valid point data (not excluded)
        return sum + (session.points >= 0 ? 10 : 0) // Assume 10 as max per session
      }, 0)
      
      const pointsEfficiency = maxPossiblePoints > 0 
        ? Math.round((totalPointsFromValidSessions / maxPossiblePoints) * 100)
        : 0
      
      const engagementScore = Math.round((attendanceRate * 0.6) + (pointsEfficiency * 0.4))
      
      // Risk assessment
      let riskLevel = 'low'
      if (attendanceRate < 60 || engagementScore < 50) riskLevel = 'high'
      else if (attendanceRate < 80 || engagementScore < 70) riskLevel = 'medium'
      
      // Recent activity (last 7 sessions)
      const recentSessions = validSessions.slice(-7)
      const recentActivity = recentSessions.filter((s: any) => s.status === 'Present').length
      
      // Find matching classroom student by name
      const attendanceName = student.name || ''
      const classroomStudent = findClassroomStudent(attendanceName)
      
      // Use classroom student ID if found, otherwise use attendance s_no
      const studentId = classroomStudent?.userId || student.s_no?.toString() || ''

      return {
        studentId: studentId,
        name: student.name || 'Unknown Student',
        attendanceRate: attendanceRate,
        punctualityRate: punctualityRate,
        engagementScore: engagementScore,
        totalSessions: totalSessions,
        presentSessions: presentSessions,
        lateSessions: lateSessions,
        absentSessions: absentSessions,
        // Fix: Add expected field names for dashboard table
        submittedOnTime: presentSessions,
        lateSubmissions: lateSessions,
        missedAssignments: absentSessions,
        totalPoints: totalPointsFromValidSessions,
        pointsEfficiency: pointsEfficiency,
        recentActivity: recentActivity,
        riskLevel: riskLevel,
        photoUrl: classroomStudent?.photoUrl || null,
        email: classroomStudent?.email || null,
        sessions: validSessions.map((session: any) => ({
          name: session.sessionName,
          status: session.status,
          points: session.points || 0
        }))
      }
    })

    // Calculate class-level metrics
    const classMetrics = {
      totalStudents: studentAttendance.length,
      averageAttendanceRate: studentAttendance.length > 0
        ? Math.round(studentAttendance.reduce((sum: number, student: any) => sum + student.attendanceRate, 0) / studentAttendance.length)
        : 0,
      averagePunctualityRate: studentAttendance.length > 0
        ? Math.round(studentAttendance.reduce((sum: number, student: any) => sum + student.punctualityRate, 0) / studentAttendance.length)
        : 0,
      averageEngagementScore: studentAttendance.length > 0
        ? Math.round(studentAttendance.reduce((sum: number, student: any) => sum + student.engagementScore, 0) / studentAttendance.length)
        : 0,
      studentsAtRisk: studentAttendance.filter((s: any) => s.riskLevel === 'high').length,
      studentsNeedingSupport: studentAttendance.filter((s: any) => s.riskLevel === 'medium').length,
      totalSessions: studentAttendance.length > 0 ? studentAttendance[0].totalSessions : 0,
      totalPoints: studentAttendance.reduce((sum: number, student: any) => sum + student.totalPoints, 0),
      averagePoints: studentAttendance.length > 0
        ? Math.round(studentAttendance.reduce((sum: number, student: any) => sum + student.totalPoints, 0) / studentAttendance.length)
        : 0
    }

    // Most engaged students (top 5 by engagement score)
    const mostEngaged = [...studentAttendance]
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 5)
      .map(student => ({
        studentId: student.studentId,
        name: student.name,
        engagementScore: student.engagementScore,
        attendanceRate: student.attendanceRate,
        totalPoints: student.totalPoints,
        photoUrl: student.photoUrl,
        email: student.email
      }))

    // Students needing attention
    const needsAttention = studentAttendance
      .filter((student: any) => student.riskLevel === 'high')
      .map((student: any) => ({
        studentId: student.studentId,
        name: student.name,
        attendanceRate: student.attendanceRate,
        engagementScore: student.engagementScore,
        absentSessions: student.absentSessions,
        photoUrl: student.photoUrl,
        email: student.email,
        issues: [
          student.attendanceRate < 60 ? 'Low attendance' : null,
          student.lateSessions > 3 ? 'Frequent tardiness' : null,
          student.engagementScore < 50 ? 'Low engagement' : null,
          student.pointsEfficiency < 40 ? 'Poor performance' : null
        ].filter(Boolean)
      }))

    const attendanceData = {
      classStats: classMetrics, // Fix: Use classStats to match dashboard expectations
      classMetrics: classMetrics, // Keep for backward compatibility
      studentMetrics: studentAttendance, // Fix: Use studentMetrics to match dashboard
      studentAttendance: studentAttendance, // Keep for backward compatibility
      mostEngaged: mostEngaged,
      needsAttention: needsAttention
    }

    res.status(200).json(attendanceData)
  } catch (error) {
    console.error('Attendance API error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch attendance data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}