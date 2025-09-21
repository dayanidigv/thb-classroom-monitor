import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser, generateJWT } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, authKey } = req.body

    if (!email || !authKey) {
      return res.status(400).json({ error: 'Email and authentication key are required' })
    }

    const user = authenticateUser(email, authKey)

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateJWT(user)

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
}
