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
    
    // Debug: Check for duplicate names in attendance data
    const nameCount = new Map()
    attendanceStudents.forEach((student: any) => {
      const name = student.name?.toLowerCase().trim()
      if (name && (name.includes('anish') || name.includes('anush'))) {
        nameCount.set(name, (nameCount.get(name) || 0) + 1)
        console.log(`🔍 Found in attendance data: "${student.name}" (s_no: ${student.s_no})`)
      }
    })
    
    // Log any duplicates
    nameCount.forEach((count, name) => {
      if (count > 1) {
        console.log(`⚠️ DUPLICATE in attendance data: "${name}" appears ${count} times`)
      }
    })

    // Create a comprehensive lookup map using multiple name matching strategies
    const createNameMatcher = (name: string) => {
      const normalized = name.toLowerCase().trim()
      // Handle dots in names like "d.k.pavithran" - split on spaces and dots
      const words = normalized.split(/[\s.]+/).filter(w => w.length > 0)
      return {
        exact: normalized,
        reversed: [...words].reverse().join(' '), // "John Doe" -> "doe john" (don't mutate original)
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
        
        // Check if any words match (stricter matching to prevent Anisha/Anushree confusion)
        const hasCommonWords = matcher.words.some(word => 
          classroomMatcher.words.some(cWord => {
            // Exact match first
            if (word === cWord) return true;
            
            // Handle cases like "d.k.pavithran" vs "pavithran" - exact part matches only
            if (word.includes('.') || cWord.includes('.')) {
              const wordParts = word.split('.');
              const cWordParts = cWord.split('.');
              return wordParts.some(part => part === cWord) || cWordParts.some(part => part === word);
            }
            
            // Strict includes matching - prevent short substring matches like Anisha/Anushree
            const minLength = Math.min(word.length, cWord.length);
            const maxLength = Math.max(word.length, cWord.length);
            
            // Only allow includes if:
            // 1. Minimum length is at least 4 characters
            // 2. Length difference is not more than 50%
            // 3. The overlap is significant (80%+ of shorter word)
            if (minLength >= 4 && maxLength <= minLength * 1.5) {
              if (word.includes(cWord) && cWord.length >= word.length * 0.8) return true;
              if (cWord.includes(word) && word.length >= cWord.length * 0.8) return true;
            }
            
            return false;
          })
        )
        
        if (hasCommonWords) {
          return studentData
        }
      }
      
      // Special case: Try direct substring matching for cases like "pavithran" in "d.k.pavithran"
      const classroomStudents = Array.from(classroomByName.values())
      for (const studentData of classroomStudents) {
        const normalizedClassroom = studentData.fullName.toLowerCase()
        const normalizedAttendance = matcher.exact
        
        // If attendance name is fully contained in classroom name and is substantial length
        if (normalizedAttendance.length >= 4 && normalizedClassroom.includes(normalizedAttendance)) {
          return studentData
        }
        
        // Handle case differences like "vimalanandh.k" vs "Vimalanandh"
        const attendanceClean = normalizedAttendance.replace(/[.\s]/g, '')
        const classroomClean = normalizedClassroom.replace(/[.\s]/g, '')
        if (attendanceClean.length >= 4 && (
          classroomClean.includes(attendanceClean) || 
          attendanceClean.includes(classroomClean)
        )) {
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

    // Deduplicate attendance students - merge records with the same normalized name OR same matched classroom student
    const deduplicatedStudents = new Map()
    const processedClassroomIds = new Set()
    
    attendanceStudents.forEach((student: any) => {
      const normalizedName = student.name?.toLowerCase().trim()
      if (!normalizedName) return
      
      // Find the classroom student this attendance record would match to
      const potentialClassroomStudent = findClassroomStudent(student.name || '')
      let classroomId = potentialClassroomStudent?.userId
      
      let keyToUse = normalizedName
      let shouldMerge = false
      let existingKey = null
      
      // Check for duplicate by name
      if (deduplicatedStudents.has(normalizedName)) {
        shouldMerge = true
        existingKey = normalizedName
      }
      // Check for duplicate by classroom ID ONLY if both students actually match the same classroom student strongly
      else if (classroomId && processedClassroomIds.has(classroomId)) {
        // Find which key has this classroom ID
        const entries = Array.from(deduplicatedStudents.entries())
        for (const [key, existingStudent] of entries) {
          const existingClassroomStudent = findClassroomStudent(existingStudent.name || '')
          
          // Only merge if BOTH students have strong matches to the SAME classroom student
          if (existingClassroomStudent?.userId === classroomId) {
            // Check if both names are reasonably similar to avoid false merging
            const namesSimilar = student.name && existingStudent.name &&
              (student.name.toLowerCase().includes(existingStudent.name.toLowerCase().substring(0, 4)) ||
               existingStudent.name.toLowerCase().includes(student.name.toLowerCase().substring(0, 4)))
            
            if (namesSimilar) {
              shouldMerge = true
              existingKey = key
              keyToUse = key // Use the existing key
              console.log(`🔄 Found duplicate classroom mapping: "${student.name}" → "${existingStudent.name}" (ID: ${classroomId})`)
            } else {
              console.log(`⚠️ Prevented false merge: "${student.name}" vs "${existingStudent.name}" (different names, same ID suggests one is mismatched)`)
              // Don't use this classroom ID for this student - treat as sheet-only
              classroomId = null
            }
            break
          }
        }
      }
      
      if (shouldMerge && existingKey) {
        // Merge sessions from duplicate records
        const existing = deduplicatedStudents.get(existingKey)
        existing.sessions = [...(existing.sessions || []), ...(student.sessions || [])]
        existing.attendancePercentage = Math.max(existing.attendancePercentage || 0, student.attendancePercentage || 0)
        console.log(`🔄 Merged duplicate: "${student.name}" into "${existing.name}"`)
      } else {
        deduplicatedStudents.set(keyToUse, { ...student })
        if (classroomId) {
          processedClassroomIds.add(classroomId)
        }
      }
    })
    
    const uniqueAttendanceStudents = Array.from(deduplicatedStudents.values())
    
    console.log(`📊 Attendance deduplication: ${attendanceStudents.length} → ${uniqueAttendanceStudents.length} unique students`)

    // First pass: Identify sessions where all students have 0 or null points
    const allSessionNames = new Set<string>()
    const sessionPointsData = new Map<string, number[]>()
    
    // Collect all session names and their points data
    uniqueAttendanceStudents.forEach((student: any) => {
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
        console.log(`Excluding session "${sessionName}" from POINTS calculation - all students have 0 points`)
      }
    })
    
    console.log(`Total sessions found: ${allSessionNames.size}, Sessions excluded from points: ${invalidSessions.size}`)
    console.log(`Attendance will include ALL ${allSessionNames.size} sessions, Points will only use ${allSessionNames.size - invalidSessions.size} sessions`)

    // Process attendance data for each student
    const studentAttendance = uniqueAttendanceStudents.map((student: any) => {
      const sessions = student.sessions || []
      
      // For ATTENDANCE: Include ALL valid sessions (don't exclude sessions with all-zero points)
      const allValidSessions = sessions.filter((session: any) => 
        session.sessionName && 
        !session.sessionName.startsWith('Column') &&
        session.status !== null
      )
      
      // For POINTS: Exclude sessions where all students have 0 points
      const validSessionsForPoints = sessions.filter((session: any) => 
        session.sessionName && 
        !session.sessionName.startsWith('Column') &&
        session.status !== null &&
        !invalidSessions.has(session.sessionName) // Exclude sessions with all-zero points for points calculation only
      )
      
      // Calculate ATTENDANCE metrics using ALL sessions
      const totalSessions = allValidSessions.length
      const presentSessions = allValidSessions.filter((s: any) => s.status === 'Present').length
      const lateSessions = allValidSessions.filter((s: any) => s.status === 'Late').length
      const absentSessions = allValidSessions.filter((s: any) => s.status === 'Absent ' || s.status === 'Absent').length
      
      const attendanceRate = student.attendancePercentage || 0
      const punctualityRate = totalSessions > 0 
        ? Math.round((presentSessions / (presentSessions + lateSessions)) * 100) || 0
        : 100
      
      // Calculate engagement score based on points and attendance
      // Only count points from valid sessions (excluding sessions where all students got 0)
      const totalPointsFromValidSessions = validSessionsForPoints.reduce((sum: number, session: any) => {
        return sum + (session.points || 0)
      }, 0)
      
      const maxPossiblePoints = validSessionsForPoints.reduce((sum: number, session: any) => {
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
      
      // Recent activity (last 7 sessions) - use ALL sessions for attendance tracking
      const recentSessions = allValidSessions.slice(-7)
      const recentActivity = recentSessions.filter((s: any) => s.status === 'Present').length
      
      // Find matching classroom student by name
      const attendanceName = student.name || ''
      const classroomStudent = findClassroomStudent(attendanceName)
      

      
      // Check if this is a strong match (not just partial)
      let isValidClassroomMatch = false
      if (classroomStudent) {
        const normalizedAttendanceName = attendanceName.toLowerCase().trim()
        const normalizedClassroomName = classroomStudent.fullName?.toLowerCase().trim()
        
        // Only consider it a valid match if:
        // 1. Names are very similar (80%+ overlap) OR
        // 2. First and last names match closely
        if (normalizedClassroomName) {
          const attendanceParts = normalizedAttendanceName.split(' ')
          const classroomParts = normalizedClassroomName.split(' ')
          
          // Check for strong name similarity
          const similarity = normalizedAttendanceName.length > 0 && normalizedClassroomName.length > 0
            ? Math.max(
                normalizedAttendanceName.includes(normalizedClassroomName) ? normalizedClassroomName.length / normalizedAttendanceName.length : 0,
                normalizedClassroomName.includes(normalizedAttendanceName) ? normalizedAttendanceName.length / normalizedClassroomName.length : 0
              )
            : 0
          
          // Strong match criteria - enhanced to handle common naming patterns
          isValidClassroomMatch = similarity >= 0.8 || (
            attendanceParts.length >= 1 && classroomParts.length >= 1 && (
              // First name matches exactly (handles multi-word names)
              (attendanceParts.length >= 2 && classroomParts.length >= 2 && attendanceParts[0] === classroomParts[0]) ||
              // Single word attendance name matches any classroom name part (e.g., "Pavithran" matches "d.k.pavithran")
              (attendanceParts.length === 1 && classroomParts.some((part: string) => part === attendanceParts[0])) ||
              // Case insensitive exact match for names with different casing (e.g., "ANUB. A" vs "Anub A")
              (normalizedAttendanceName.replace(/[.\s]/g, '') === normalizedClassroomName.replace(/[.\s]/g, '')) ||
              // Handle partial match where attendance name is contained in classroom name (e.g., "Nilesh" in "Nilesh Hebbare")
              (attendanceParts[0] && classroomParts.some((part: string) => part.startsWith(attendanceParts[0]) && attendanceParts[0].length >= 4))
            )
          )
        }
      }
      

      
      // Special handling for known problematic cases
      let finalClassroomStudent = classroomStudent
      let finalIsValidMatch = isValidClassroomMatch
      
      // Manual override for cases that should match but algorithm is failing
      if (!finalIsValidMatch || !finalClassroomStudent) {
        // Try manual lookup for known issues
        const manualMatches: Record<string, string> = {
          'pavithran': 'd.k.pavithran',
          'vimalanandh.k': 'vimalanandh'
        }
        
        // Debug logging for Suthinthararaj
        if (attendanceName.toLowerCase().includes('suthinth')) {
          console.log(`🔍 Debug Suthinth: "${attendanceName}" - No classroom match found (correct behavior)`)
        }
        
        const manualMatch = manualMatches[attendanceName.toLowerCase()]
        if (manualMatch) {
          const directMatch = Array.from(classroomByName.values()).find(student => 
            student.fullName.toLowerCase() === manualMatch.toLowerCase()
          )
          if (directMatch) {
            finalClassroomStudent = directMatch
            finalIsValidMatch = true
          }
        }
      }

      // Use classroom student ID ONLY if it's a valid match, otherwise use sheet-specific ID
      const studentId = (finalIsValidMatch && finalClassroomStudent) 
        ? finalClassroomStudent.userId 
        : `sheet_${student.s_no || attendanceName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`

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
        maxPossiblePoints: maxPossiblePoints,
        validSessions: validSessionsForPoints.length,
        pointsEfficiency: pointsEfficiency,
        recentActivity: recentActivity,
        riskLevel: riskLevel,
        photoUrl: (finalIsValidMatch && finalClassroomStudent) ? finalClassroomStudent.photoUrl : null,
        email: (finalIsValidMatch && finalClassroomStudent) ? finalClassroomStudent.email : null,
        // Add flags to indicate classroom status
        inClassroom: finalIsValidMatch && !!finalClassroomStudent,
        classroomStatus: (finalIsValidMatch && finalClassroomStudent) ? 'active' : 'not_joined',
        sessions: allValidSessions.map((session: any) => ({
          name: session.sessionName,
          status: session.status,
          points: session.points || 0,
          includedInPoints: !invalidSessions.has(session.sessionName) // Flag to show if this session is counted for points
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
        email: student.email,
        inClassroom: student.inClassroom,
        classroomStatus: student.classroomStatus
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
        inClassroom: student.inClassroom,
        classroomStatus: student.classroomStatus,
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