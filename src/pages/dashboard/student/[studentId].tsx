import React from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../../lib/auth-context'
import StudentProfile from '../../../components/classroom/StudentProfile'

export default function StudentProfilePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { studentId } = router.query

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
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

  return <StudentProfile studentId={studentId} />
}
