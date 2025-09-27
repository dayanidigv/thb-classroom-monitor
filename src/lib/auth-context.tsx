import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'

interface User {
  id: string
  email: string
  name: string
  role: 'super-admin' | 'admin' | 'student'
  passkey: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, passkey: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing session on mount
    const token = Cookies.get('auth-token')
    if (token) {
      // Verify token and get user data
      fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user)
          } else {
            Cookies.remove('auth-token')
          }
        })
        .catch(() => {
          Cookies.remove('auth-token')
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Auto-logout after 30 minutes of inactivity
    let inactivityTimer: NodeJS.Timeout
    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => {
        logout()
      }, 30 * 60 * 1000) // 30 minutes
    }

    if (user) {
      resetTimer()
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
      events.forEach(event => {
        document.addEventListener(event, resetTimer, true)
      })

      return () => {
        clearTimeout(inactivityTimer)
        events.forEach(event => {
          document.removeEventListener(event, resetTimer, true)
        })
      }
    }
  }, [user])

  const login = async (email: string, passkey: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passkey })
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()
      setUser(data.user)
      Cookies.set('auth-token', data.token, { expires: 1, secure: true, sameSite: 'strict' })
      router.push('/dashboard')
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    Cookies.remove('auth-token')
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook that safely checks if auth context is available
export function useOptionalAuth() {
  const context = useContext(AuthContext)
  return context || null
}
