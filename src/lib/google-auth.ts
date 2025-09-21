import { google } from 'googleapis'

export interface GoogleAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  refreshToken: string
}

export class GoogleAuthManager {
  private static instance: GoogleAuthManager
  private auth: any

  private constructor() {
    this.initializeAuth()
  }

  public static getInstance(): GoogleAuthManager {
    if (!GoogleAuthManager.instance) {
      GoogleAuthManager.instance = new GoogleAuthManager()
    }
    return GoogleAuthManager.instance
  }

  private initializeAuth() {
    const config = this.getAuthConfig()
    
    this.auth = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    )

    this.auth.setCredentials({
      refresh_token: config.refreshToken,
    })
  }

  private getAuthConfig(): GoogleAuthConfig {
    const clientId = process.env.GCP_CLIENT_ID
    const clientSecret = process.env.GCP_CLIENT_SECRET
    const redirectUri = process.env.GCP_REDIRECT_URI
    const refreshToken = process.env.GCP_REFRESH_TOKEN

    if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
      throw new Error('Missing required Google OAuth2 environment variables')
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      refreshToken
    }
  }

  public getAuth() {
    return this.auth
  }

  public getClassroomService() {
    return google.classroom({ version: 'v1', auth: this.auth })
  }

  public async refreshAccessToken(): Promise<void> {
    try {
      await this.auth.getAccessToken()
    } catch (error) {
      console.error('Failed to refresh access token:', error)
      throw new Error('Authentication failed - please check your credentials')
    }
  }

  public async validateConnection(): Promise<boolean> {
    try {
      const classroom = this.getClassroomService()
      const classroomId = process.env.CLASSROOM_ID
      
      if (!classroomId) {
        throw new Error('CLASSROOM_ID environment variable is required')
      }

      await classroom.courses.get({ id: classroomId })
      return true
    } catch (error) {
      console.error('Google Classroom connection validation failed:', error)
      return false
    }
  }
}

// Helper function for API routes
export const getGoogleAuth = () => {
  return GoogleAuthManager.getInstance()
}

// Helper function to get classroom service
export const getClassroomService = () => {
  return GoogleAuthManager.getInstance().getClassroomService()
}
