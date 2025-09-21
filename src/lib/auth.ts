import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const AUTH_KEY = process.env.AUTH_KEY || 'THB-TD-BOOTCAMP'

// Mock user database (replace with real database)
const users = new Map([
  ['teacher@example.com', {
    id: '1',
    email: 'teacher@example.com',
    name: 'John Teacher',
    role: 'teacher' as const,
  }],
  ['dayanidigv954@gmail.com', {
    id: '2',
    email: 'dayanidigv954@gmail.com',
    name: 'Dayanidhi',
    role: 'student' as const,
  }],
  ['student2@example.com', {
    id: '3',
    email: 'student2@example.com',
    name: 'Bob Student',
    role: 'student' as const,
  }]
])

export interface User {
  id: string
  email: string
  name: string
  role: 'student' | 'teacher'
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

export function getUserByEmail(email: string): User | undefined {
  return users.get(email)
}

export function verifyAuthKey(key: string): boolean {
  return key === AUTH_KEY
}

export function authenticateUser(email: string, key: string): User | null {
  if (!verifyAuthKey(key)) {
    return null
  }
  
  const user = getUserByEmail(email)
  return user || null
}
