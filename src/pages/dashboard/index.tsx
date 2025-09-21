import React, { useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { useRouter } from 'next/router'
import ClassroomMonitor from '../../components/classroom/ClassroomMonitor'

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  if (!user) {
    return null
  }

  return <ClassroomMonitor />
}
