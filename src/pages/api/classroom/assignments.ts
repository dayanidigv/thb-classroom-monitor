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

    const result = await classroom.courses.courseWork.list({ 
      courseId: classroomId,
      courseWorkStates: ['PUBLISHED', 'DRAFT'],
      orderBy: 'dueDate desc'
    })

    const assignments = result.data.courseWork || []
    
    // Enhanced assignment data with additional metadata
    const enhancedAssignments = assignments.map(assignment => ({
      ...assignment,
      isOverdue: assignment.dueDate && assignment.dueDate.year && assignment.dueDate.month && assignment.dueDate.day ? 
        new Date(
          assignment.dueDate.year, 
          assignment.dueDate.month - 1, 
          assignment.dueDate.day
        ) < new Date() : false,
      formattedDueDate: assignment.dueDate && assignment.dueDate.year && assignment.dueDate.month && assignment.dueDate.day ? 
        new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day).toLocaleDateString() : 
        null
    }))

    res.status(200).json(enhancedAssignments)
  } catch (error) {
    console.error('Assignments fetch error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch assignments',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
