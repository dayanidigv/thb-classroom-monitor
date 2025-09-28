# Discord Webhook Integration - Minimal Logging

The Discord webhook has been integrated into the THB Classroom Monitor system with minimal logging to reduce noise.

## Webhook URL
```
https://discord.com/api/webhooks/1421746997509099650/oNTvE6nlamDVnnsMCBztE7vU1YTfuF0bLCY9ZoQt-uYjNCjLFu9sBA-E7miCuEgPAsSJ
```

## Features Implemented (Minimal Set)

### 1. Login Tracking (`/src/pages/api/auth/login.ts`)
- **Successful Logins Only**: Logs user details, IP address, user agent, and login method
- Failed attempts are NOT logged to reduce spam

### 2. Public Access Tracking Only
- **Public Profile Access** (`/src/components/classroom/StudentProfile.tsx`): Only tracks when student profiles are accessed without authentication (public sharing)
- Regular authenticated access is NOT logged to minimize notifications

## Discord Webhook Utility (`/src/lib/discord-webhook.ts`)

### Key Functions:
- `logLogin()`: Logs successful authentication events only
- `logPublicAccess()`: Tracks public profile access only
- `logError()`: Available but not actively used to minimize notifications

### Server-Side API (`/src/pages/api/discord/log.ts`)
- Provides proper IP address detection
- Handles webhook requests from client-side components
- Ensures accurate visitor tracking with real network information

## Discord Message Format (Minimal Set)

### Login Messages 🔐 (Successful Only)
- User name, email, and role
- Login method (Google OAuth or Manual)
- IP address and user agent
- Timestamp with THB branding

### Public Access Messages 🌐 (Public Profile Views Only)
- Student name and ID being accessed
- Access type (PUBLIC ACCESS)
- IP address and browser information
- Referrer information

## Color Coding
- 🟢 **Green**: Successful logins
-  **Purple**: Public profile access

## Privacy & Security
- Personal information is handled securely
- IP addresses are logged for security monitoring
- Failed login attempts are tracked for security analysis
- All webhook calls are non-blocking to ensure system performance

## Usage
The webhook integration is automatic with minimal logging. Monitor your Discord channel for:
- ✅ **Successful user logins** - Important security events
- 🌐 **Public profile access** - When someone views a student's public profile

**What's NOT logged** (to reduce noise):
- ❌ Dashboard access by authenticated users
- ❌ Regular student profile views by authenticated users  
- ❌ Failed login attempts
- ❌ System errors (unless critical)

This provides focused monitoring of the most important events while minimizing notification spam and maintaining user privacy.