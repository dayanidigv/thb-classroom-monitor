import type { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
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

    const result = await classroom.courses.get({ id: classroomId })
    res.status(200).json(result.data)
  } catch (error) {
    console.error('Course fetch error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch course',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
