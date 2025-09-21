import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Papa from 'papaparse'
import { ClassroomCourse, ClassroomStudent, ClassroomAssignment, ClassroomSubmission } from './google-classroom'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface ExportData {
  course: ClassroomCourse
  students: ClassroomStudent[]
  assignments: ClassroomAssignment[]
  submissions: ClassroomSubmission[]
  analytics: any
}

export class ExportManager {
  // Export student report as PDF
  static exportStudentReportPDF(studentData: any, analytics: any): void {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text('Student Performance Report', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Student: ${studentData.name}`, 20, 35)
    doc.text(`Email: ${studentData.email}`, 20, 45)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 55)
    
    // Performance Summary
    doc.setFontSize(16)
    doc.text('Performance Summary', 20, 75)
    
    const summaryData = [
      ['Metric', 'Value'],
      ['Current Grade', `${studentData.currentGrade}%`],
      ['Completion Rate', `${studentData.completionRate}%`],
      ['Assignments Completed', `${analytics.completedSubmissions}/${analytics.totalAssignments}`],
      ['Late Submissions', analytics.lateSubmissions.toString()],
      ['Average Grade', `${Math.round(analytics.averageGrade)}%`]
    ]
    
    doc.autoTable({
      startY: 85,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid'
    })
    
    // Recent Submissions
    doc.setFontSize(16)
    doc.text('Recent Submissions', 20, doc.lastAutoTable.finalY + 20)
    
    const submissionData = analytics.submissions.slice(0, 10).map((submission: any) => [
      `Assignment ${submission.courseWorkId.slice(-3)}`,
      submission.state,
      submission.late ? 'Yes' : 'No',
      submission.assignedGrade ? `${submission.assignedGrade}%` : 'Not Graded',
      new Date(submission.updateTime).toLocaleDateString()
    ])
    
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 30,
      head: [['Assignment', 'Status', 'Late', 'Grade', 'Date']],
      body: submissionData,
      theme: 'grid'
    })
    
    doc.save(`${studentData.name.replace(/\s+/g, '_')}_report.pdf`)
  }

  // Export class report as PDF
  static exportClassReportPDF(exportData: ExportData): void {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text('Class Performance Report', 20, 20)
    
    doc.setFontSize(12)
    doc.text(`Course: ${exportData.course.name}`, 20, 35)
    if (exportData.course.section) {
      doc.text(`Section: ${exportData.course.section}`, 20, 45)
    }
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 55)
    
    // Class Summary
    doc.setFontSize(16)
    doc.text('Class Summary', 20, 75)
    
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Students', exportData.students.length.toString()],
      ['Total Assignments', exportData.assignments.length.toString()],
      ['Average Completion Rate', `${Math.round(exportData.analytics.completionRate)}%`],
      ['Average Grade', `${Math.round(exportData.analytics.averageGrade)}%`],
      ['Total Submissions', exportData.analytics.totalSubmissions.toString()],
      ['Late Submissions', exportData.analytics.lateSubmissions.toString()]
    ]
    
    doc.autoTable({
      startY: 85,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid'
    })
    
    // Student Performance Table
    doc.setFontSize(16)
    doc.text('Student Performance', 20, doc.lastAutoTable.finalY + 20)
    
    const studentData = exportData.students.map(student => {
      const studentSubmissions = exportData.submissions.filter(s => s.userId === student.userId)
      const completed = studentSubmissions.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length
      const late = studentSubmissions.filter(s => s.late).length
      const averageGrade = studentSubmissions.length > 0 
        ? studentSubmissions.reduce((sum, s) => sum + (s.assignedGrade || 0), 0) / studentSubmissions.length 
        : 0
      
      return [
        student.profile.name.fullName,
        `${completed}/${exportData.assignments.length}`,
        late.toString(),
        averageGrade > 0 ? `${Math.round(averageGrade)}%` : 'N/A',
        `${Math.round((completed / exportData.assignments.length) * 100)}%`
      ]
    })
    
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 30,
      head: [['Student', 'Completed', 'Late', 'Avg Grade', 'Completion %']],
      body: studentData,
      theme: 'grid'
    })
    
    doc.save(`${exportData.course.name.replace(/\s+/g, '_')}_class_report.pdf`)
  }

  // Export student data as CSV
  static exportStudentDataCSV(exportData: ExportData): void {
    const csvData = exportData.students.map(student => {
      const studentSubmissions = exportData.submissions.filter(s => s.userId === student.userId)
      const completed = studentSubmissions.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length
      const late = studentSubmissions.filter(s => s.late).length
      const averageGrade = studentSubmissions.length > 0 
        ? studentSubmissions.reduce((sum, s) => sum + (s.assignedGrade || 0), 0) / studentSubmissions.length 
        : 0
      
      return {
        'Student Name': student.profile.name.fullName,
        'Email': student.profile.emailAddress,
        'Total Assignments': exportData.assignments.length,
        'Completed Assignments': completed,
        'Late Submissions': late,
        'Average Grade': Math.round(averageGrade),
        'Completion Rate': Math.round((completed / exportData.assignments.length) * 100),
        'Course': exportData.course.name,
        'Section': exportData.course.section || ''
      }
    })
    
    const csv = Papa.unparse(csvData)
    this.downloadFile(csv, `${exportData.course.name.replace(/\s+/g, '_')}_students.csv`, 'text/csv')
  }

  // Export assignment data as CSV
  static exportAssignmentDataCSV(exportData: ExportData): void {
    const csvData = exportData.assignments.map(assignment => {
      const assignmentSubmissions = exportData.submissions.filter(s => s.courseWorkId === assignment.id)
      const completed = assignmentSubmissions.filter(s => s.state === 'TURNED_IN' || s.state === 'RETURNED').length
      const late = assignmentSubmissions.filter(s => s.late).length
      const averageGrade = assignmentSubmissions.length > 0 
        ? assignmentSubmissions.reduce((sum, s) => sum + (s.assignedGrade || 0), 0) / assignmentSubmissions.length 
        : 0
      
      return {
        'Assignment Title': assignment.title,
        'Description': assignment.description || '',
        'Due Date': assignment.dueDate ? `${assignment.dueDate.year}-${assignment.dueDate.month}-${assignment.dueDate.day}` : '',
        'Max Points': assignment.maxPoints || '',
        'Total Submissions': assignmentSubmissions.length,
        'Completed Submissions': completed,
        'Late Submissions': late,
        'Average Grade': Math.round(averageGrade),
        'Completion Rate': Math.round((completed / exportData.students.length) * 100),
        'Course': exportData.course.name,
        'Created': new Date(assignment.creationTime).toLocaleDateString()
      }
    })
    
    const csv = Papa.unparse(csvData)
    this.downloadFile(csv, `${exportData.course.name.replace(/\s+/g, '_')}_assignments.csv`, 'text/csv')
  }

  // Export submission details as CSV
  static exportSubmissionDataCSV(exportData: ExportData): void {
    const csvData = exportData.submissions.map(submission => {
      const student = exportData.students.find(s => s.userId === submission.userId)
      const assignment = exportData.assignments.find(a => a.id === submission.courseWorkId)
      
      return {
        'Student Name': student?.profile.name.fullName || 'Unknown',
        'Student Email': student?.profile.emailAddress || 'Unknown',
        'Assignment Title': assignment?.title || 'Unknown',
        'Submission State': submission.state,
        'Grade': submission.assignedGrade || '',
        'Late': submission.late ? 'Yes' : 'No',
        'Submitted Date': new Date(submission.updateTime).toLocaleDateString(),
        'Course': exportData.course.name
      }
    })
    
    const csv = Papa.unparse(csvData)
    this.downloadFile(csv, `${exportData.course.name.replace(/\s+/g, '_')}_submissions.csv`, 'text/csv')
  }

  // Utility function to download files
  private static downloadFile(content: string, filename: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // Export all data in multiple formats
  static exportAllData(exportData: ExportData): void {
    this.exportClassReportPDF(exportData)
    this.exportStudentDataCSV(exportData)
    this.exportAssignmentDataCSV(exportData)
    this.exportSubmissionDataCSV(exportData)
  }
}
