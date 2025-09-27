# The Half Brick Classroom Monitor

A classroom analytics dashboard built with Next.js that helps educators monitor student performance and attendance for talent development programs.

## Features

- **Student Performance Tracking**: Monitor combined scores from Google Classroom (60%) and session attendance (40%)
- **Smart Session Filtering**: Automatically excludes invalid sessions where all students got 0 points
- **Real-time Updates**: Live attendance and performance data from Google Sheets
- **Export Reports**: Generate PDF and CSV reports with detailed analytics
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Authentication**: Google OAuth2
- **APIs**: Google Classroom API, Google Apps Script
- **Reports**: PDF generation with charts and analytics

## Quick Start

1. **Install dependencies**
```bash
npm install
```

2. **Set up environment variables**
Create `.env.local`:
```env
GCP_CLIENT_ID=your_google_client_id
GCP_CLIENT_SECRET=your_google_client_secret
CLASSROOM_ID=your_classroom_id
JWT_SECRET=your_jwt_secret
TEACHER_EMAIL=your_teacher_email
```

3. **Run development server**
```bash
npm run dev
```

4. **Open browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## Key Metrics

- **Combined Score**: 60% Google Classroom grade + 40% session points
- **Engagement**: 60% attendance rate + 40% points efficiency
- **Risk Assessment**: Automated identification of students needing support
- **Performance Trends**: Tracks improvement or decline over recent sessions

## Configuration

1. Enable Google Classroom API in Google Cloud Console
2. Create OAuth2 credentials
3. Set up Google Apps Script for attendance data
4. Configure classroom ID and teacher permissions

## Usage

- **Overview Tab**: Key metrics and class summary
- **Attendance Tab**: Detailed attendance and engagement tracking
- **Performance Tab**: Student performance analysis with trends and risk levels
- **Export**: Generate comprehensive PDF reports or CSV data

Built for **The Half Brick** talent development program. 
