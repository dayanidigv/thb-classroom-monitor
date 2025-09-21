import { NextApiRequest, NextApiResponse } from 'next'
import { GoogleAuthManager } from '../../../lib/google-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authManager = GoogleAuthManager.getInstance()
    const classroom = await authManager.getClassroomService()
    const classroomId = process.env.CLASSROOM_ID

    if (!classroomId) {
      return res.status(500).json({ error: 'CLASSROOM_ID not configured' })
    }

    // Fetch all coursework (assignments)
    const courseworkResponse = await classroom.courses.courseWork.list({
      courseId: classroomId,
      courseWorkStates: ['PUBLISHED', 'DRAFT']
    })

    const coursework = courseworkResponse.data.courseWork || []
    
    // Fetch submissions for each assignment
    const submissionsData = []
    
    for (const assignment of coursework) {
      try {
        const submissionsResponse = await classroom.courses.courseWork.studentSubmissions.list({
          courseId: classroomId,
          courseWorkId: assignment.id!
        })

        const submissions = submissionsResponse.data.studentSubmissions || []
        
        for (const submission of submissions) {
          const submissionData = {
            assignmentId: assignment.id || '',
            assignmentTitle: assignment.title || 'Untitled Assignment',
            assignmentMaxPoints: assignment.maxPoints || 100,
            assignmentDueDate: assignment.dueDate,
            studentId: submission.userId || '',
            submissionId: submission.id || '',
            state: submission.state || 'CREATED',
            creationTime: submission.creationTime || '',
            updateTime: submission.updateTime || '',
            submissionHistory: submission.submissionHistory || [],
            assignedGrade: submission.assignedGrade,
            draftGrade: submission.draftGrade,
            alternateLink: submission.alternateLink,
            courseWorkType: assignment.workType,
            late: submission.late || false,
            // Calculate if submitted
            isSubmitted: submission.state === 'TURNED_IN' || submission.state === 'RETURNED',
            // Calculate if graded
            isGraded: submission.assignedGrade !== undefined && submission.assignedGrade !== null,
            // Calculate grade percentage
            gradePercentage: submission.assignedGrade && assignment.maxPoints 
              ? (submission.assignedGrade / assignment.maxPoints) * 100 
              : null
          }
          
          submissionsData.push(submissionData)
        }
      } catch (error) {
        console.error(`Error fetching submissions for assignment ${assignment.id}:`, error)
        // Continue with other assignments even if one fails
      }
    }

    // Group submissions by student
    const studentSubmissions = submissionsData.reduce((acc, submission) => {
      const studentId = submission.studentId
      if (studentId && !acc[studentId]) {
        acc[studentId] = []
      }
      if (studentId) {
        acc[studentId].push(submission)
      }
      return acc
    }, {} as Record<string, typeof submissionsData>)

    // Calculate student statistics
    const studentStats = Object.entries(studentSubmissions).map(([studentId, submissions]) => {
      const totalAssignments = coursework.length // Use total coursework count, not just submissions
      const submittedCount = submissions.filter(s => s.isSubmitted).length
      const gradedCount = submissions.filter(s => s.isGraded).length
      const lateCount = submissions.filter(s => s.late).length
      
      const grades = submissions
        .filter(s => s.gradePercentage !== null && s.gradePercentage !== undefined)
        .map(s => s.gradePercentage!)
      
      const averageGrade = grades.length > 0 
        ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length 
        : 0

      return {
        studentId,
        totalAssignments,
        submittedCount,
        gradedCount,
        lateCount,
        submissionCount: submissions.length, // Add this for compatibility
        completionRate: totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 100) : 0,
        averageGrade: Math.round(averageGrade * 100) / 100,
        submissions: submissions.sort((a, b) => 
          new Date(b.updateTime || '').getTime() - new Date(a.updateTime || '').getTime()
        )
      }
    })

    // Calculate class statistics
    const classStats = {
      totalStudents: studentStats.length,
      totalAssignments: coursework.length,
      totalSubmissions: submissionsData.length,
      submittedSubmissions: submissionsData.filter(s => s.isSubmitted).length,
      gradedSubmissions: submissionsData.filter(s => s.isGraded).length,
      lateSubmissions: submissionsData.filter(s => s.late).length,
      averageCompletionRate: studentStats.length > 0 
        ? studentStats.reduce((sum, student) => sum + student.completionRate, 0) / studentStats.length 
        : 0,
      averageClassGrade: studentStats.length > 0 
        ? studentStats.reduce((sum, student) => sum + student.averageGrade, 0) / studentStats.length 
        : 0
    }

    res.status(200).json({
      classStats,
      studentStats,
      rawSubmissions: submissionsData,
      coursework: coursework.map((cw: any) => ({
        id: cw.id,
        title: cw.title,
        maxPoints: cw.maxPoints,
        dueDate: cw.dueDate,
        workType: cw.workType,
        state: cw.state
      }))
    })

  } catch (error) {
    console.error('Error fetching submissions:', error)
    res.status(500).json({ 
      error: 'Failed to fetch submissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
