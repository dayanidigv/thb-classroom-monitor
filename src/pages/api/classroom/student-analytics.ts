import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { studentId } = req.query

    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ error: 'Student ID is required' })
    }

    const auth = new google.auth.OAuth2(
      process.env.GCP_CLIENT_ID,
      process.env.GCP_CLIENT_SECRET,
      process.env.GCP_REDIRECT_URI
    )

    auth.setCredentials({
      refresh_token: process.env.GCP_REFRESH_TOKEN,
    })

    const classroom = google.classroom({ version: 'v1', auth })
    const classroomId = process.env.CLASSROOM_ID

    if (!classroomId) {
      return res.status(500).json({ 
        error: 'Missing CLASSROOM_ID environment variable' 
      })
    }

    // Get assignments
    const assignments = await classroom.courses.courseWork.list({ 
      courseId: classroomId,
      courseWorkStates: ['PUBLISHED', 'DRAFT']
    })

    // Get all submissions for all assignments
    const submissionsPromises = (assignments.data.courseWork || []).map(assignment =>
      classroom.courses.courseWork.studentSubmissions.list({
        courseId: classroomId,
        courseWorkId: assignment.id!
      })
    )
    const submissionsArrays = await Promise.all(submissionsPromises)
    const allSubmissions = submissionsArrays.flatMap(result => result.data.studentSubmissions || [])
    
    const studentSubmissions = allSubmissions.filter(s => s.userId === studentId)
    
    const completedSubmissions = studentSubmissions.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length
    const lateSubmissions = studentSubmissions.filter(s => s.late).length
    const gradedSubmissions = studentSubmissions.filter(s => s.assignedGrade !== undefined && s.assignedGrade !== null)
    
    const averageGrade = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.assignedGrade || 0), 0) / gradedSubmissions.length
      : 0
      
    const completionRate = assignments.data.courseWork?.length ? (completedSubmissions / assignments.data.courseWork.length) * 100 : 0

    const analytics = {
      totalAssignments: assignments.data.courseWork?.length || 0,
      completedSubmissions,
      lateSubmissions,
      averageGrade,
      completionRate,
      submissions: studentSubmissions
    }

    res.status(200).json(analytics)
  } catch (error) {
    console.error('Student analytics error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch student analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
