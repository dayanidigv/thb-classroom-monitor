import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
    const privateKey = process.env.GOOGLE_PRIVATE_KEY

    if (!clientEmail || !privateKey) {
      return res.status(500).json({ 
        error: 'Missing environment variables',
        details: {
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKey
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
        'https://www.googleapis.com/auth/classroom.rosters.readonly'
      ]
    )

    const classroom = google.classroom({ 
      version: 'v1', 
      auth 
    })

    // List all courses accessible to the service account
    const response = await classroom.courses.list({
      teacherId: 'me'
    })

    const courses = response.data.courses || []

    res.status(200).json({
      success: true,
      message: `Found ${courses.length} accessible classrooms`,
      classrooms: courses.map(course => ({
        id: course.id,
        name: course.name,
        section: course.section,
        courseState: course.courseState,
        alternateLink: course.alternateLink,
        enrollmentCode: course.enrollmentCode
      })),
      serviceAccount: clientEmail
    })

  } catch (error: any) {
    console.error('List classrooms error:', error)
    
    res.status(500).json({ 
      error: 'Failed to list classrooms',
      details: error.message || 'Unknown error',
      errorCode: error.code || 'UNKNOWN',
      errorStatus: error.status || 'UNKNOWN',
      suggestion: 'Make sure the service account is added as a teacher to your Google Classroom'
    })
  }
}
