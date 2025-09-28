import type { NextApiRequest, NextApiResponse } from 'next'
import { discordWebhook } from '../../../lib/discord-webhook'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type, data } = req.body

    // Get real IP address from various sources
    const getClientIP = (req: NextApiRequest): string => {
      const xForwardedFor = req.headers['x-forwarded-for']
      const xRealIp = req.headers['x-real-ip']
      const connectionRemoteAddress = req.connection?.remoteAddress
      const socketRemoteAddress = req.socket?.remoteAddress
      
      if (xForwardedFor) {
        return Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0]
      }
      
      if (xRealIp) {
        return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp
      }
      
      return connectionRemoteAddress || socketRemoteAddress || 'Unknown'
    }

    const clientIP = getClientIP(req)
    const userAgent = req.headers['user-agent'] || 'Unknown'
    const referer = req.headers.referer || req.headers.referrer

    // Add server-side info to the data
    const enhancedData = {
      ...data,
      ipAddress: clientIP,
      userAgent: userAgent,
      referrer: referer
    }

    switch (type) {
      case 'visitor':
        // Only log public access, ignore other visitor types
        if (enhancedData.type === 'public_access') {
          await discordWebhook.logPublicAccess(enhancedData)
        }
        break
      case 'error':
        await discordWebhook.logError(enhancedData)
        break
      default:
        return res.status(400).json({ error: 'Invalid log type' })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Discord logging error:', error)
    res.status(500).json({ error: 'Failed to log to Discord' })
  }
}