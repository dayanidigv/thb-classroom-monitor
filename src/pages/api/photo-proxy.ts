import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' })
  }

  try {
    // Add proper headers to avoid rate limiting
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Classroom-Monitor/1.0)',
        'Accept': 'image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      // If we get rate limited or any error, return a placeholder
      return res.status(404).json({ 
        error: 'Image not available',
        status: response.status,
        statusText: response.statusText
      })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    // Set appropriate caching headers
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600') // Cache for 1 hour
    res.setHeader('Content-Length', buffer.byteLength)

    res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('Photo proxy error:', error)
    res.status(500).json({ 
      error: 'Failed to load image',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}