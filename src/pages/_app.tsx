import '../styles/globals.css'
import type { AppProps } from 'next/app'
import React from 'react'
import { useRouter } from 'next/router'
import { AuthProvider } from '../lib/auth-context'

// Component wrapper that conditionally applies auth
function AppWithConditionalAuth({ Component, pageProps }: AppProps) {
  const router = useRouter()
  
  // Check if this is a public student profile route (numeric student ID)
  // Use asPath to get the actual URL with the student ID
  const isPublicStudentRoute = () => {
    const path = router.pathname
    const asPath = router.asPath
    
    // Check if it's a student profile route
    if (path === '/dashboard/student/[studentId]') {
      // Extract studentId from the actual path
      const match = asPath.match(/\/dashboard\/student\/([^/?]+)/)
      if (match) {
        const studentId = decodeURIComponent(match[1])
        const isNumeric = /^\d+$/.test(studentId)
        return isNumeric
      }
    }
    
    return false
  }

  const isPublic = isPublicStudentRoute()

  // If it's a public route, render without auth context
  if (isPublic) {
    return <Component {...pageProps} />
  }

  // Otherwise, wrap with auth provider
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  )
}

export default function App(props: AppProps) {
  return <AppWithConditionalAuth {...props} />
}
