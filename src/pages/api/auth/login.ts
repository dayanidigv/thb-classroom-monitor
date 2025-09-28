import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { discordWebhook } from '../../../lib/discord-webhook'

interface AuthUser {
  email: string
  passkey: string
  name: string
  role: 'super-admin' | 'admin' | 'student'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, passkey } = req.body

  if (!email || !passkey) {
    return res.status(400).json({ error: 'Email and passkey are required' })
  }

  try {
    // Fetch users from your Google Apps Script API
    const authApiUrl = process.env.AUTH_API_URL
    const authApiKey = process.env.AUTH_API_KEY

    if (!authApiUrl || !authApiKey) {
      return res.status(500).json({ error: 'Authentication configuration missing' })
    }

    const response = await fetch(`${authApiUrl}?apikey=${authApiKey}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data')
    }

    const users: AuthUser[] = await response.json()
    
    // Find user with matching email and passkey
    const user = users.find(u => u.email === email && u.passkey === passkey)

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or passkey' })
    }

    // Create user object for JWT
    const userPayload = {
      id: email.split('@')[0],
      email: user.email,
      name: user.name,
      role: user.role,
      passkey: user.passkey
    }

    // Generate JWT token
    const token = jwt.sign(userPayload, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '24h' })

    // Log successful login to Discord
    try {
      const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || 'Unknown';
      const userAgent = req.headers['user-agent'] || 'Unknown';
      
      await discordWebhook.logLogin({
        name: user.name,
        email: user.email,
        role: user.role,
        loginMethod: 'manual',
        ipAddress: Array.isArray(clientIP) ? clientIP[0] : clientIP,
        userAgent: userAgent
      });
    } catch (webhookError) {
      console.error('Failed to send Discord webhook:', webhookError);
      // Don't fail the login if webhook fails
    }

    res.status(200).json({ user: userPayload, token })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}
