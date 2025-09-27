import type { NextApiRequest, NextApiResponse } from 'next'
import { getClassroomService } from '../../../lib/google-auth'
import { cacheManager, CACHE_KEYS } from '../../../lib/cache-manager'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { identifier } = req.query

  if (!identifier || typeof identifier !== 'string') {
    return res.status(400).json({ error: 'Student identifier (email or ID) is required' })
  }

  try {
    // Check cache first for better performance
    const cacheKey = CACHE_KEYS.STUDENT_LOOKUP(identifier)
    const cachedResult = cacheManager.get(cacheKey)
    
    if (cachedResult) {
      return res.status(200).json(cachedResult)
    }

    const classroom = getClassroomService()
    const classroomId = process.env.CLASSROOM_ID

    if (!classroomId) {
      return res.status(500).json({ 
        error: 'Missing CLASSROOM_ID environment variable' 
      })
    }

    // Fetch students list with caching
    const studentsKey = CACHE_KEYS.STUDENTS_LIST(classroomId)
    const students = await cacheManager.getOrSet(studentsKey, async () => {
      const result = await classroom.courses.students.list({ 
        courseId: classroomId,
        pageSize: 100
      })
      return result.data.students || []
    }, 2 * 60 * 1000) // Cache for 2 minutes

    // Try to find student by email first, then by ID
    let student = students.find(s => 
      s.profile?.emailAddress?.toLowerCase() === decodeURIComponent(identifier).toLowerCase()
    )

    // If not found by email, try by userId
    if (!student) {
      student = students.find(s => s.userId === identifier)
    }

    // If still not found, try by URL-encoded email
    if (!student) {
      student = students.find(s => 
        s.profile?.emailAddress?.toLowerCase() === identifier.toLowerCase()
      )
    }

    if (!student) {
      return res.status(404).json({ 
        error: 'Student not found',
        message: `No student found with identifier: ${identifier}`,
        availableStudents: students.map(s => ({
          id: s.userId,
          email: s.profile?.emailAddress,
          name: s.profile?.name?.fullName
        }))
      })
    }

    // Get student analytics directly - no internal API calls for better performance!
    const [assignments, allSubmissionsArrays] = await Promise.all([
      classroom.courses.courseWork.list({ 
        courseId: classroomId,
        courseWorkStates: ['PUBLISHED', 'DRAFT']
      }),
      classroom.courses.courseWork.list({ 
        courseId: classroomId,
        courseWorkStates: ['PUBLISHED', 'DRAFT']
      }).then(async (assignments) => {
        const submissionsPromises = (assignments.data.courseWork || []).map(assignment =>
          classroom.courses.courseWork.studentSubmissions.list({
            courseId: classroomId,
            courseWorkId: assignment.id!
          })
        )
        return Promise.all(submissionsPromises)
      })
    ])

    const allSubmissions = allSubmissionsArrays.flatMap(result => result.data.studentSubmissions || [])
    
    // Filter submissions for this specific student
    const studentSubmissions = allSubmissions.filter(sub => sub.userId === student!.userId)
    
    // Calculate analytics directly
    const totalAssignments = assignments.data.courseWork?.length || 0
    const completedSubmissions = studentSubmissions.filter(sub => 
      sub.state === 'TURNED_IN' || sub.state === 'RETURNED'
    ).length
    const completionRate = totalAssignments > 0 ? (completedSubmissions / totalAssignments) * 100 : 0
    
    const gradedSubmissions = studentSubmissions.filter(sub => sub.assignedGrade !== undefined)
    const averageGrade = gradedSubmissions.length > 0 
      ? gradedSubmissions.reduce((sum, sub) => sum + (sub.assignedGrade || 0), 0) / gradedSubmissions.length
      : 0
      
    const lateSubmissions = studentSubmissions.filter(sub => sub.late).length

    const studentAnalytics = {
      submissions: studentSubmissions,
      totalAssignments,
      completedSubmissions,
      completionRate,
      averageGrade,
      lateSubmissions,
      gradedSubmissions: gradedSubmissions.length
    }

    // Enhanced response with complete student information
    const response = {
      success: true,
      student: {
        ...student,
        displayName: student.profile?.name?.fullName || 'Unknown Student',
        initials: getInitials({
          givenName: student.profile?.name?.givenName || undefined,
          familyName: student.profile?.name?.familyName || undefined,
          fullName: student.profile?.name?.fullName || undefined,
        }),
        profile: {
          ...student.profile,
          photoUrl: student.profile?.photoUrl ? (
            student.profile.photoUrl.startsWith('//') 
              ? `https:${student.profile.photoUrl}`
              : student.profile.photoUrl
          ) : null
        }
      },
      studentId: student.userId,
      email: student.profile?.emailAddress,
      name: student.profile?.name?.fullName,
      photoUrl: student.profile?.photoUrl ? (
        student.profile.photoUrl.startsWith('//') 
          ? `https:${student.profile.photoUrl}`
          : student.profile.photoUrl
      ) : null,
      analytics: studentAnalytics,
      metadata: {
        foundByEmail: students.some(s => 
          s.profile?.emailAddress?.toLowerCase() === decodeURIComponent(identifier).toLowerCase()
        ),
        foundById: student.userId === identifier,
        searchTerm: identifier,
        cacheHit: false // First time fetch
      }
    }

    // Cache the result for future requests (1 minute TTL for student data)
    cacheManager.set(cacheKey, response, 1 * 60 * 1000)

    res.status(200).json(response)
  } catch (error) {
    console.error('Student lookup error:', error)
    res.status(500).json({ 
      error: 'Failed to lookup student',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Helper function to generate initials
function getInitials(name?: { givenName?: string; familyName?: string; fullName?: string }) {
  if (!name) return 'UN'
  
  const givenName = name.givenName || ''
  const familyName = name.familyName || ''
  
  let initials = ''
  if (givenName) initials += givenName[0].toUpperCase()
  if (familyName) initials += familyName[0].toUpperCase()
  
  if (!initials && name.fullName) {
    const fullName = name.fullName
    if (fullName.length >= 2) {
      initials = fullName.substring(0, 2).toUpperCase()
    } else {
      initials = 'UN'
    }
  }
  
  return initials || 'UN'
}