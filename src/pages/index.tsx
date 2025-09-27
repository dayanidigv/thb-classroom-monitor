import React, { useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth-context'

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Role-based routing
        if (user.role === 'student') {
          // Students go directly to their profile page
          router.push(`/dashboard/student/${encodeURIComponent(user.email)}`)
        } else {
          // Super-admin and admin go to main dashboard
          router.push('/dashboard')
        }
      } else {
        router.push('/login')
      }
    }
  }, [user, isLoading, router])

  return (
    <>
      <Head>
        <title>The Half Brick - Talent Development Dashboard</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-gray-50 to-red-100">
        <div className="text-center">
          <img 
            src="/logo.png" 
            alt="The Half Brick Foundation" 
            className="h-20 w-20 object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            THE HALF BRICK
          </h1>
          <p className="text-lg font-semibold text-red-600 mb-4">
            Talent Development Program
          </p>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    </>
  )
}
