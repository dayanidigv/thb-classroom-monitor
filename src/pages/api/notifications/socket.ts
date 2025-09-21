import { NextApiRequest, NextApiResponse } from 'next'
import { Server as HTTPServer } from 'http'
import { Socket as NetSocket } from 'net'
import { Server as IOServer } from 'socket.io'
import { getClassroomService } from '../../../lib/google-auth'

interface SocketServer extends HTTPServer {
  io?: IOServer | undefined
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    res.end()
    return
  }
  
  const io = new IOServer(res.socket.server, {
    path: '/api/notifications/socket',
    addTrailingSlash: false,
  })
  res.socket.server.io = io

  io.on('connection', (socket) => {
    socket.on('join_classroom', (classroomId: string) => {
      socket.join(`classroom_${classroomId}`)
    })

    socket.on('disconnect', () => {
      // Client disconnected
    })
  })

  // Start monitoring for notifications
  startNotificationMonitoring(io)
  
  res.end()
}

async function startNotificationMonitoring(io: IOServer) {
  const classroomId = process.env.CLASSROOM_ID
  if (!classroomId) return

  // Check for assignment due dates every hour
  setInterval(async () => {
    await checkAssignmentDeadlines(io, classroomId)
  }, 60 * 60 * 1000) // 1 hour

  // Check for new submissions every 5 minutes
  setInterval(async () => {
    await checkNewSubmissions(io, classroomId)
  }, 5 * 60 * 1000) // 5 minutes

  // Check for performance issues daily
  setInterval(async () => {
    await checkPerformanceAlerts(io, classroomId)
  }, 24 * 60 * 60 * 1000) // 24 hours
}

async function checkAssignmentDeadlines(io: IOServer, classroomId: string) {
  try {
    const classroom = getClassroomService()
    const assignments = await classroom.courses.courseWork.list({
      courseId: classroomId,
      courseWorkStates: ['PUBLISHED']
    })

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    for (const assignment of assignments.data.courseWork || []) {
      if (assignment.dueDate) {
        const dueDate = new Date(
          assignment.dueDate.year!,
          assignment.dueDate.month! - 1,
          assignment.dueDate.day!
        )

        // Notify if due within 24 hours
        if (dueDate <= tomorrow && dueDate > now) {
          const notification = {
            id: `assignment_due_${assignment.id}_${Date.now()}`,
            type: 'assignment_due',
            title: 'Assignment Due Soon',
            message: `"${assignment.title}" is due on ${dueDate.toLocaleDateString()}`,
            priority: 'high',
            timestamp: new Date(),
            read: false,
            assignmentId: assignment.id,
            metadata: { dueDate: dueDate.toISOString() }
          }

          io.to(`classroom_${classroomId}`).emit('notification', notification)
        }
      }
    }
  } catch (error) {
    console.error('Error checking assignment deadlines:', error)
  }
}

async function checkNewSubmissions(io: IOServer, classroomId: string) {
  try {
    const classroom = getClassroomService()
    const assignments = await classroom.courses.courseWork.list({
      courseId: classroomId,
      courseWorkStates: ['PUBLISHED']
    })

    for (const assignment of assignments.data.courseWork || []) {
      const submissions = await classroom.courses.courseWork.studentSubmissions.list({
        courseId: classroomId,
        courseWorkId: assignment.id!
      })

      for (const submission of submissions.data.studentSubmissions || []) {
        if (submission.assignedGrade !== undefined && submission.assignedGrade !== null) {
          const notification = {
            id: `grade_released_${submission.id}_${Date.now()}`,
            type: 'grade_released',
            title: 'New Grade Available',
            message: `Grade for "${assignment.title}" is now available`,
            priority: 'medium',
            timestamp: new Date(),
            read: false,
            studentId: submission.userId,
            assignmentId: assignment.id,
            metadata: { grade: submission.assignedGrade }
          }

          io.to(`classroom_${classroomId}`).emit('notification', notification)
        }
      }
    }
  } catch (error) {
    console.error('Error checking new submissions:', error)
  }
}

async function checkPerformanceAlerts(io: IOServer, classroomId: string) {
  try {
    const classroom = getClassroomService()
    const [students, assignments] = await Promise.all([
      classroom.courses.students.list({ courseId: classroomId }),
      classroom.courses.courseWork.list({ 
        courseId: classroomId,
        courseWorkStates: ['PUBLISHED']
      })
    ])

    const totalAssignments = assignments.data.courseWork?.length || 0

    for (const student of students.data.students || []) {
      const submissionsPromises = (assignments.data.courseWork || []).map(assignment =>
        classroom.courses.courseWork.studentSubmissions.list({
          courseId: classroomId,
          courseWorkId: assignment.id!,
          userId: student.userId!
        })
      )

      const submissionsArrays = await Promise.all(submissionsPromises)
      const studentSubmissions = submissionsArrays.flatMap(result => result.data.studentSubmissions || [])
      const completedSubmissions = studentSubmissions.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length
      const completionRate = totalAssignments > 0 ? (completedSubmissions / totalAssignments) * 100 : 0

      // Alert if completion rate is below 70%
      if (completionRate < 70) {
        const notification = {
          id: `low_performance_${student.userId}_${Date.now()}`,
          type: 'low_performance',
          title: 'Student Needs Attention',
          message: `${student.profile?.name?.fullName || 'Student'} has a completion rate of ${Math.round(completionRate)}%`,
          priority: 'urgent',
          timestamp: new Date(),
          read: false,
          studentId: student.userId,
          metadata: { completionRate: Math.round(completionRate) }
        }

        io.to(`classroom_${classroomId}`).emit('notification', notification)
      }
    }
  } catch (error) {
    console.error('Error checking performance alerts:', error)
  }
}
