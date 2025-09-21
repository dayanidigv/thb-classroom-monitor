import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
    const classroomId = process.env.CLASSROOM_ID

    // Check if environment variables are set
    if (!clientEmail || !privateKey || !classroomId) {
      return res.status(500).json({ 
        error: 'Missing environment variables',
        details: {
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKey,
          hasClassroomId: !!classroomId
        }
      })
    }

    // Test authentication setup
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

    const classroom = google.classroom({ 
      version: 'v1', 
      auth 
    })

    // Test basic API access - try to get the course
    const response = await classroom.courses.get({
      id: classroomId
    })

    res.status(200).json({
      success: true,
      message: 'Google Classroom API is working!',
      course: {
        id: response.data.id,
        name: response.data.name,
        section: response.data.section,
        courseState: response.data.courseState
      },
      auth: {
        clientEmail: clientEmail,
        classroomId: classroomId
      }
    })

  } catch (error: any) {
    console.error('Google API test error:', error)
    
    res.status(500).json({ 
      error: 'Google API test failed',
      details: error.message || 'Unknown error',
      errorCode: error.code || 'UNKNOWN',
      errorStatus: error.status || 'UNKNOWN'
    })
  }
}
