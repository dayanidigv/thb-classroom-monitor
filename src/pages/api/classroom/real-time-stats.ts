import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Fetch attendance data to calculate real-time stats
    const attendanceResponse = await fetch(
      'https://script.google.com/macros/s/AKfycby2hkg41EwBSU2PBDTNi4nMz8j37DregPiAyM48gVdY2G9mtlZiWV6T4ciUrRsa7HnF/exec?apiKey=THB-TD-B1-0925'
    )

    if (!attendanceResponse.ok) {
      throw new Error(`Attendance API returned ${attendanceResponse.status}`)
    }

    const attendanceApiData = await attendanceResponse.json()
    
    if (attendanceApiData.status !== 'success' || !attendanceApiData.data) {
      throw new Error('Invalid attendance API response')
    }

    const attendanceStudents = attendanceApiData.data

    // Calculate real-time statistics
    const totalStudents = attendanceStudents.length
    
    // Get today's date in DD/MM/YYYY format to match session names
    const today = new Date()
    const todayString = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`
    const todayAltString = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`
    
    // Calculate current activity (today's sessions)
    let currentlyActive = 0
    let todaysAttendance = 0
    let todaysLateness = 0
    
    attendanceStudents.forEach((student: any) => {
      const todaySessions = student.sessions?.filter((session: any) => 
        session.sessionName && (
          session.sessionName.includes(todayString) || 
          session.sessionName.includes(todayAltString)
        )
      ) || []
      
      const hasAttendedToday = todaySessions.some((session: any) => 
        session.status === 'Present' || session.status === 'Late'
      )
      
      const wasLateToday = todaySessions.some((session: any) => 
        session.status === 'Late'
      )
      
      if (hasAttendedToday) {
        currentlyActive++
        todaysAttendance++
      }
      
      if (wasLateToday) {
        todaysLateness++
      }
    })

    // Calculate engagement trends (based on recent week's data)
    const engagementTrends = attendanceStudents.map((student: any) => {
      const recentSessions = student.sessions?.filter((session: any) => 
        session.sessionName && 
        !session.sessionName.startsWith('Column') &&
        session.status !== null
      ).slice(-7) || []
      
      const presentCount = recentSessions.filter((s: any) => s.status === 'Present').length
      const engagementScore = recentSessions.length > 0 ? 
        Math.round((presentCount / recentSessions.length) * 100) : 0
      
      return {
        studentName: student.name,
        engagementScore: engagementScore,
        totalPoints: student.totalPoints || 0
      }
    })

    const averageEngagement = engagementTrends.length > 0 ?
      Math.round(engagementTrends.reduce((sum: number, student: any) => sum + student.engagementScore, 0) / engagementTrends.length) : 0

    // Find upcoming deadlines (simulated - in real implementation would fetch from calendar)
    const upcomingDeadlines = [
      {
        title: 'AI Assignment Submission',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        type: 'assignment'
      },
      {
        title: 'MERN Project Demo',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        type: 'project'
      },
      {
        title: 'Mid-term Assessment',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        type: 'exam'
      }
    ]

    // Activity feed (recent significant events)
    const activityFeed = [
      {
        type: 'attendance',
        message: `${todaysAttendance} students attended today's sessions`,
        timestamp: new Date().toISOString(),
        priority: 'normal'
      },
      {
        type: 'performance',
        message: `Class average engagement: ${averageEngagement}%`,
        timestamp: new Date().toISOString(),
        priority: 'info'
      },
      {
        type: 'alert',
        message: todaysLateness > 0 ? `${todaysLateness} students were late today` : 'No tardiness reported today',
        timestamp: new Date().toISOString(),
        priority: todaysLateness > totalStudents * 0.2 ? 'high' : 'low'
      }
    ]

    const realTimeStats = {
      currentActivity: {
        activeStudents: currentlyActive,
        totalStudents: totalStudents,
        activityRate: totalStudents > 0 ? Math.round((currentlyActive / totalStudents) * 100) : 0,
        todaysAttendance: todaysAttendance,
        todaysLateness: todaysLateness
      },
      engagementTrends: {
        averageEngagement: averageEngagement,
        trendingUp: engagementTrends.filter((s: any) => s.engagementScore >= 80).length,
        needingAttention: engagementTrends.filter((s: any) => s.engagementScore < 60).length,
        topEngaged: engagementTrends
          .sort((a: any, b: any) => b.engagementScore - a.engagementScore)
          .slice(0, 3)
          .map((s: any) => ({ name: s.studentName, score: s.engagementScore }))
      },
      upcomingDeadlines: upcomingDeadlines,
      activityFeed: activityFeed,
      lastUpdated: new Date().toISOString()
    }

    res.status(200).json(realTimeStats)
  } catch (error) {
    console.error('Real-time stats API error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch real-time statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}