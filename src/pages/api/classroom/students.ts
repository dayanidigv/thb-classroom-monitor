import type { NextApiRequest, NextApiResponse } from 'next'
import { getClassroomService } from '../../../lib/google-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const classroom = getClassroomService()
    const classroomId = process.env.CLASSROOM_ID

    if (!classroomId) {
      return res.status(500).json({ 
        error: 'Missing CLASSROOM_ID environment variable' 
      })
    }

    const result = await classroom.courses.students.list({ 
      courseId: classroomId,
      pageSize: 100
    })
    
    const students = result.data.students || []
    
    // Enhanced student data with additional metadata
    const enhancedStudents = students.map(student => {
      const givenName = student.profile?.name?.givenName || ''
      const familyName = student.profile?.name?.familyName || ''
      const fullName = student.profile?.name?.fullName || 'Unknown Student'
      
      // Calculate initials properly
      let initials = ''
      if (givenName) initials += givenName[0].toUpperCase()
      if (familyName) initials += familyName[0].toUpperCase()
      if (!initials) {
        // Fallback to first two letters of full name or given name
        const nameToUse = fullName !== 'Unknown Student' ? fullName : givenName
        if (nameToUse.length >= 2) {
          initials = nameToUse.substring(0, 2).toUpperCase()
        } else {
          initials = 'UN'
        }
      }
      
      return {
        ...student,
        displayName: fullName,
        initials,
        joinedDate: student.profile?.verifiedTeacher ? null : new Date().toISOString()
      }
    })
    
    res.status(200).json(enhancedStudents)
  } catch (error) {
    console.error('Students fetch error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch students',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
