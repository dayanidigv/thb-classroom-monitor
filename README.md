# Talent Development Dashboard

An advanced AI-powered classroom analytics and student success platform built with Next.js, designed to help educators monitor, analyze, and improve student performance through data-driven insights.

## 🚀 Features

### 📊 Advanced Analytics
- **AI-Powered Insights**: Machine learning algorithms analyze student performance patterns
- **Predictive Analytics**: Forecast student outcomes and identify at-risk learners
- **Trend Analysis**: Track performance over time with detailed visualizations
- **Performance Distribution**: Comprehensive grade and completion rate analysis

### 🔔 Real-Time Notifications
- **Smart Alerts**: Assignment deadlines, grade releases, and performance warnings
- **WebSocket Integration**: Real-time updates without page refresh
- **Customizable Preferences**: Control notification types and delivery methods
- **Browser Notifications**: Native push notifications support

### 📈 Comprehensive Reporting
- **PDF Reports**: Professional, detailed analytics reports with charts
- **CSV Export**: Raw data export for further analysis
- **Individual Student Reports**: Personalized performance summaries
- **Class Overview Reports**: Complete classroom analytics

### 🎯 Student Management
- **Risk Assessment**: Automated identification of struggling students
- **Intervention Recommendations**: AI-generated suggestions for student support
- **Performance Tracking**: Individual and class-wide progress monitoring
- **Engagement Analytics**: Submission patterns and participation metrics

### 🎨 Modern UI/UX
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Interactive Dashboards**: Dynamic charts and visualizations
- **Smooth Animations**: Enhanced user experience with Framer Motion
- **Advanced Filtering**: Multi-criteria filtering and search capabilities

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Charts**: Chart.js, React Chart.js 2
- **Authentication**: Google OAuth2
- **API Integration**: Google Classroom API
- **Real-time**: Socket.IO
- **PDF Generation**: jsPDF with autoTable
- **State Management**: Zustand
- **Notifications**: React Hot Toast

## 📁 Project Structure

```
src/
├── components/
│   ├── analytics/
│   │   └── AdvancedAnalytics.tsx  # AI-powered analytics dashboard
│   ├── classroom/
│   │   ├── ClassroomMonitor.tsx   # Main classroom dashboard
│   │   └── StudentProfile.tsx     # Individual student details
│   ├── layout/
│   │   └── Layout.tsx             # Main application layout
│   └── notifications/
│       └── NotificationCenter.tsx # Real-time notification system
├── lib/
│   ├── analytics-engine.ts        # AI analytics and predictions
│   ├── auth-context.tsx           # Authentication context
│   ├── auth.ts                    # JWT utilities
│   ├── google-auth.ts             # Google OAuth2 manager
│   ├── notifications.ts           # Notification system
│   ├── pdf-generator.ts           # PDF report generation
│   └── store.ts                   # Zustand state management
├── pages/
│   ├── api/
│   │   ├── classroom/             # Google Classroom API routes
│   │   │   ├── analytics.ts       # Classroom analytics
│   │   │   ├── assignments.ts     # Assignment data
│   │   │   └── students.ts        # Student data
│   │   └── notifications/
│   │       └── socket.ts          # WebSocket server
│   ├── dashboard/
│   │   └── student/
│   │       └── [studentId].tsx    # Student detail page
│   ├── _app.tsx                   # App configuration
│   ├── index.tsx                  # Main dashboard
│   └── login.tsx                  # Login page
└── styles/
    └── globals.css                # Global styles with Tailwind
```

## 📋 Prerequisites

- Node.js 18+ 
- Google Cloud Platform account
- Google Classroom API access
- Google OAuth2 credentials

## ⚙️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd talent-development-dashboard
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env.local` file in the root directory:

```env
# Google OAuth2 Configuration
GCP_CLIENT_ID=your_google_client_id
GCP_CLIENT_SECRET=your_google_client_secret
GCP_REDIRECT_URI=http://localhost:3000/api/auth/callback
GCP_REFRESH_TOKEN=your_refresh_token

# Google Classroom
CLASSROOM_ID=your_classroom_id

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Teacher Email (for permissions)
TEACHER_EMAIL=your_teacher_email
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Google Cloud Platform Setup

1. **Create a new project** in Google Cloud Console
2. **Enable APIs**:
   - Google Classroom API
   - Google People API
3. **Create OAuth2 credentials**:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback`
4. **Generate refresh token** using the OAuth2 playground

### Google Classroom Setup

1. **Get your Classroom ID** from the Google Classroom URL
2. **Ensure proper permissions** for the service account
3. **Test API access** using the `/api/test/google-api` endpoint

## 📚 Usage

### Dashboard Navigation

- **Overview**: Main dashboard with key metrics and insights
- **Advanced Analytics**: Detailed performance analysis and predictions
- **Student Management**: Individual student tracking and interventions

### Key Features

1. **Real-time Monitoring**: Automatic updates for new submissions and grades
2. **AI Recommendations**: Smart suggestions for improving student outcomes
3. **Export Capabilities**: Generate comprehensive reports in PDF or CSV format
4. **Notification System**: Stay informed about important classroom events

### Advanced Analytics

- **Performance Trends**: Weekly progress tracking
- **Risk Assessment**: Automated identification of at-risk students
- **Predictive Modeling**: Forecast final grades and completion rates
- **Intervention Suggestions**: Personalized recommendations for each student

## 🔍 API Endpoints

### Classroom Data
- `GET /api/classroom/analytics` - Complete classroom analytics
- `GET /api/classroom/students` - Student list with metadata
- `GET /api/classroom/assignments` - Assignment data with due dates
- `GET /api/classroom/student-analytics` - Individual student performance

### Notifications
- `WebSocket /api/notifications/socket` - Real-time notification system

### Testing
- `GET /api/test/google-api` - Test Google Classroom API connection

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository** to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Deploy** - automatic deployments on push to main branch

### Other Platforms

The application can be deployed to any platform supporting Next.js:
- Netlify
- AWS Amplify
- Railway
- Heroku

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for common setup problems
- Verify your Google Cloud Platform configuration

## 🎯 Roadmap

- [ ] Parent/Guardian portal
- [ ] Mobile app companion
- [ ] Advanced gamification features
- [ ] LMS integrations (Canvas, Moodle)
- [ ] Multi-language support
- [ ] Advanced AI models for predictions

---

**Built with ❤️ for educators and students worldwide**
"# thb-classroom-monitor" 
