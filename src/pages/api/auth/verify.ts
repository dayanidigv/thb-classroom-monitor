import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyJWT } from '../../../lib/auth'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    const user = verifyJWT(token)

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    res.status(200).json({ user })
  } catch (error) {
    console.error('Token verification error:', error)
    res.status(401).json({ error: 'Token verification failed' })
  }
}
