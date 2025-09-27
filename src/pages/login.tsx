import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth-context'

export default function LoginPage() {
  const { user, isLoading, login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [passkey, setPasskey] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await login(email, passkey)
    } catch (err) {
      setError('Invalid email or passkey')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Loading - The Half Brick Talent Development</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-gray-50 to-red-100">
          <div className="text-center">
            <img 
              src="/logo.png" 
              alt="The Half Brick Foundation" 
              className="h-16 w-16 object-contain mx-auto mb-4"
            />
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      </>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <>
      <Head>
        <title>Login - The Half Brick Talent Development</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-gray-50 to-red-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Branding */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src="/logo.png" 
                alt="The Half Brick Foundation" 
                className="h-20 w-20 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              THE HALF BRICK
            </h1>
            <p className="text-lg font-semibold text-red-600 mb-1">
              Talent Development Program
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Classroom Monitor Dashboard
            </p>
            <h2 className="text-xl font-semibold text-gray-800">
              Sign in to your account
            </h2>
          </div>
        {/* Login Form */}
        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-100" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200 sm:text-sm"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="passkey" className="block text-sm font-medium text-gray-700 mb-2">
                Passkey
              </label>
              <input
                id="passkey"
                name="passkey"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-200 sm:text-sm"
                placeholder="Enter your passkey"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
              </span>
              {isSubmitting ? 'Signing in...' : 'Sign in to Dashboard'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>© {new Date().getFullYear()} The Half Brick Foundation</p>
          <p className="mt-1">Empowering talent through education and community building</p>
        </div>
      </div>
    </div>
    </>
  )
}
