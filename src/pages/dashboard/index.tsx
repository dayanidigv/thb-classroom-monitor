import React, { useEffect } from 'react'
import Head from 'next/head'
import { useAuth } from '../../lib/auth-context'
import { useRouter } from 'next/router'
import ClassroomMonitor from '../../components/classroom/ClassroomMonitor'

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    // Role-based access control
    if (user.role === 'student') {
      // Redirect students to their individual profile page
      // Use email to find student ID from classroom data
      router.push(`/dashboard/student/${encodeURIComponent(user.email)}`)
      return
    }

    // Only super-admin and admin can access the main dashboard
    if (user.role !== 'super-admin' && user.role !== 'admin') {
      router.push('/login')
      return
    }
  }, [user, router])

  if (!user) {
    return null
  }

  // Show loading while redirecting students
  if (user.role === 'student') {
    return (
      <>
        <Head>
          <title>Redirecting - The Half Brick Talent Development</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800">Redirecting to your profile...</h2>
            <p className="text-gray-600 mt-2">Please wait a moment</p>
          </div>
        </div>
      </>
    )
  }

  // Only super-admin and admin can see the full dashboard
  if (user.role !== 'super-admin' && user.role !== 'admin') {
    return (
      <>
        <Head>
          <title>Access Denied - The Half Brick Talent Development</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-50">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-md">
            <img 
              src="/logo.png" 
              alt="The Half Brick Foundation" 
              className="h-16 w-16 object-contain mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to access this dashboard.</p>
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Dashboard - The Half Brick Talent Development</title>
      </Head>
      <ClassroomMonitor />
    </>
  )
}
