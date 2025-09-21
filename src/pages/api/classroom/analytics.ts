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

    // Fetch all data in parallel
    const [course, students, assignments, topics] = await Promise.all([
      classroom.courses.get({ id: classroomId }),
      classroom.courses.students.list({ courseId: classroomId }),
      classroom.courses.courseWork.list({ 
        courseId: classroomId,
        courseWorkStates: ['PUBLISHED', 'DRAFT']
      }),
      classroom.courses.topics.list({ courseId: classroomId })
    ])

    // Get all submissions for all assignments
    const submissionsPromises = (assignments.data.courseWork || []).map(assignment =>
      classroom.courses.courseWork.studentSubmissions.list({
        courseId: classroomId,
        courseWorkId: assignment.id!
      })
    )
    const submissionsArrays = await Promise.all(submissionsPromises)
    const submissions = submissionsArrays.flatMap(result => result.data.studentSubmissions || [])

    // Calculate analytics
    const totalStudents = students.data.students?.length || 0
    const totalAssignments = assignments.data.courseWork?.length || 0
    const totalTopics = topics.data.topic?.length || 0
    const totalSubmissions = submissions.length
    const completedSubmissions = submissions.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length
    const lateSubmissions = submissions.filter(s => s.late).length
    
    const completionRate = totalStudents > 0 && totalAssignments > 0 
      ? (completedSubmissions / (totalStudents * totalAssignments)) * 100 
      : 0

    const gradedSubmissions = submissions.filter(s => s.assignedGrade !== undefined && s.assignedGrade !== null)
    const averageGrade = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + (s.assignedGrade || 0), 0) / gradedSubmissions.length
      : 0

    // Calculate topic-based analytics
    const topicAnalytics = (topics.data.topic || []).map(topic => {
      const topicAssignments = (assignments.data.courseWork || []).filter(
        assignment => assignment.topicId === topic.topicId
      );
      const topicSubmissions = submissions.filter(sub => 
        topicAssignments.some(a => a.id === sub.courseWorkId)
      );
      const completedTopicSubmissions = topicSubmissions.filter(
        s => s.state === 'TURNED_IN' || s.state === 'RETURNED'
      ).length;
      const topicCompletionRate = totalStudents > 0 && topicAssignments.length > 0
        ? (completedTopicSubmissions / (totalStudents * topicAssignments.length)) * 100
        : 0;

      return {
        id: topic.topicId,
        name: topic.name || 'Untitled Topic',
        description: 'description' in topic ? topic.description : '',
        assignmentCount: topicAssignments.length,
        completionRate: topicCompletionRate,
        submissions: topicSubmissions.length,
        completedSubmissions: completedTopicSubmissions
      };
    });

    const analytics = {
      course: course.data,
      students: students.data.students || [],
      assignments: assignments.data.courseWork || [],
      topics: topics.data.topic || [],
      topicAnalytics,
      submissions,
      analytics: {
        totalStudents,
        totalAssignments,
        totalTopics,
        totalSubmissions,
        completedSubmissions,
        lateSubmissions,
        completionRate,
        averageGrade,
        topics: topicAnalytics
      }
    }

    res.status(200).json(analytics)
  } catch (error) {
    console.error('Classroom analytics error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch classroom analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
