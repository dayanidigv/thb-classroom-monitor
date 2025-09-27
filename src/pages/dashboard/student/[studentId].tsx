import React from 'react'
import { useRouter } from 'next/router'
import { useOptionalAuth } from '../../../lib/auth-context'
import StudentProfile from '../../../components/classroom/StudentProfile'

export default function StudentProfilePage() {
  const router = useRouter()
  const { studentId } = router.query
  
  // Wait for router to be ready for dynamic routes
  if (!router.isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Check if this is public access (numeric student ID)
  const isNumericId = !!(studentId && typeof studentId === 'string' && /^\d+$/.test(studentId))
  
  // Use optional auth hook - returns null if no auth context available (public routes)
  const auth = useOptionalAuth()
  const user = auth?.user || null
  const isLoading = auth?.isLoading || false

  // Show loading only for private routes (non-numeric IDs)
  if (isLoading && !isNumericId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Only require authentication for non-public routes (non-numeric student IDs)
  if (!isNumericId && !user) {
    router.push('/login')
    return null
  }

  if (!studentId || typeof studentId !== 'string') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Invalid student ID</h3>
          <p className="mt-1 text-sm text-gray-500">Please select a valid student from the dashboard.</p>
        </div>
      </div>
    )
  }

  return <StudentProfile studentId={studentId} isPublicAccess={isNumericId} />
}
