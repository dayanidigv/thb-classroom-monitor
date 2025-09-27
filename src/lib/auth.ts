import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface User {
  id: string
  email: string
  name: string
  role: 'super-admin' | 'admin' | 'student'
  passkey: string
}

export function generateJWT(user: User) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyJWT(token: string): User | null {
  try {
    return jwt.verify(token, JWT_SECRET) as User
  } catch {
    return null
  }
}

// Authentication is now handled by the external API
// See /pages/api/auth/login.ts for user authentication logic


