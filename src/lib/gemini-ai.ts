import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI with validation
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

export interface AIInsightRequest {
  studentData: any[]
  classAnalytics: any
  assignments: any[]
  submissions: any[]
  context?: string
}

export interface AIInsight {
  type: 'recommendation' | 'prediction' | 'alert' | 'trend'
  title: string
  description: string
  confidence: number
  actionItems: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'academic' | 'behavioral' | 'engagement' | 'risk'
}

export interface PersonalizedRecommendation {
  studentId: string
  studentName: string
  recommendations: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }
  interventions: {
    type: 'academic' | 'motivational' | 'behavioral'
    description: string
    timeline: string
    resources: string[]
  }[]
  riskFactors: string[]
  strengths: string[]
}

class GeminiAIService {
  private model = genAI?.getGenerativeModel({ model: 'gemini-pro' }) || null
  private isAvailable = !!genAI && !!GEMINI_API_KEY

  async generateClassInsights(data: AIInsightRequest): Promise<AIInsight[]> {
    if (!this.isAvailable || !this.model) {
      console.warn('Gemini AI not available - using fallback insights')
      return this.getFallbackClassInsights(data)
    }

    try {
      const prompt = this.buildClassAnalysisPrompt(data)
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      return this.parseAIInsights(text)
    } catch (error) {
      console.error('Error generating class insights:', error)
      return this.getFallbackClassInsights(data)
    }
  }

  async generatePersonalizedRecommendations(
    studentData: any,
    classContext: any
  ): Promise<PersonalizedRecommendation> {
    if (!this.isAvailable || !this.model) {
      console.warn('Gemini AI not available - using fallback recommendations')
      return this.getFallbackStudentRecommendations(studentData)
    }

    try {
      const prompt = this.buildStudentAnalysisPrompt(studentData, classContext)
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      return this.parsePersonalizedRecommendations(text, studentData)
    } catch (error) {
      console.error('Error generating personalized recommendations:', error)
      return this.getFallbackStudentRecommendations(studentData)
    }
  }

  async generatePredictiveAnalytics(data: AIInsightRequest): Promise<{
    classProjections: any
    studentRiskAssessment: any[]
    interventionRecommendations: any[]
  }> {
    if (!this.isAvailable || !this.model) {
      console.warn('Gemini AI not available - using fallback predictions')
      return this.getFallbackPredictiveAnalytics(data)
    }

    try {
      const prompt = this.buildPredictiveAnalysisPrompt(data)
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      return this.parsePredictiveAnalytics(text, data)
    } catch (error) {
      console.error('Error generating predictive analytics:', error)
      return this.getFallbackPredictiveAnalytics(data)
    }
  }

  private buildClassAnalysisPrompt(data: AIInsightRequest): string {
    return `
As an expert educational data analyst, analyze the following classroom data and provide actionable insights:

CLASS OVERVIEW:
- Total Students: ${data.studentData.length}
- Total Assignments: ${data.assignments.length}
- Average Class Grade: ${data.classAnalytics.averageGrade}%
- Completion Rate: ${data.classAnalytics.averageCompletionRate}%
- Students at Risk: ${data.classAnalytics.studentsAtRisk}

STUDENT PERFORMANCE DISTRIBUTION:
${JSON.stringify(data.classAnalytics.trends?.performanceDistribution || [], null, 2)}

RECENT TRENDS:
${JSON.stringify(data.classAnalytics.trends?.weeklyProgress || [], null, 2)}

Please provide insights in the following JSON format:
[
  {
    "type": "recommendation|prediction|alert|trend",
    "title": "Brief insight title",
    "description": "Detailed analysis and explanation",
    "confidence": 0.85,
    "actionItems": ["Specific action 1", "Specific action 2"],
    "priority": "low|medium|high|critical",
    "category": "academic|behavioral|engagement|risk"
  }
]

Focus on:
1. Academic performance patterns
2. Engagement trends
3. Risk identification
4. Intervention opportunities
5. Success strategies

Provide 5-8 insights with high confidence scores.
    `
  }

  private buildStudentAnalysisPrompt(studentData: any, classContext: any): string {
    return `
As an expert educational advisor, create personalized recommendations for this student:

STUDENT PROFILE:
- Name: ${studentData.name}
- Current Grade: ${studentData.currentGrade}%
- Completion Rate: ${studentData.completionRate}%
- Risk Level: ${studentData.riskLevel}
- Trend: ${studentData.trend}
- Late Submissions: ${studentData.lateSubmissions}

CLASS CONTEXT:
- Class Average: ${classContext.averageGrade}%
- Class Completion Rate: ${classContext.averageCompletionRate}%

RECENT PERFORMANCE:
${JSON.stringify(studentData.weeklyProgress || [], null, 2)}

Provide recommendations in this JSON format:
{
  "recommendations": {
    "immediate": ["Action needed this week"],
    "shortTerm": ["Actions for next 2-4 weeks"],
    "longTerm": ["Semester-long strategies"]
  },
  "interventions": [
    {
      "type": "academic|motivational|behavioral",
      "description": "Specific intervention",
      "timeline": "When to implement",
      "resources": ["Required resources"]
    }
  ],
  "riskFactors": ["Identified risk factors"],
  "strengths": ["Student strengths to leverage"]
}

Focus on evidence-based educational strategies and personalized approaches.
    `
  }

  private buildPredictiveAnalysisPrompt(data: AIInsightRequest): string {
    return `
As a predictive analytics expert in education, analyze this data to forecast outcomes:

CURRENT CLASS METRICS:
${JSON.stringify(data.classAnalytics, null, 2)}

HISTORICAL TRENDS:
${JSON.stringify(data.classAnalytics.trends, null, 2)}

Provide predictions in this JSON format:
{
  "classProjections": {
    "expectedFinalAverage": 85.2,
    "projectedCompletionRate": 92.5,
    "riskStudentCount": 3,
    "improvementOpportunities": ["Specific areas"]
  },
  "studentRiskAssessment": [
    {
      "studentId": "id",
      "riskLevel": "high|medium|low",
      "riskFactors": ["factors"],
      "interventionUrgency": "immediate|soon|monitor"
    }
  ],
  "interventionRecommendations": [
    {
      "type": "class-wide|individual|group",
      "description": "Intervention description",
      "expectedImpact": "high|medium|low",
      "timeline": "implementation timeline"
    }
  ]
}

Base predictions on educational research and data patterns.
    `
  }

  private parseAIInsights(text: string): AIInsight[] {
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Error parsing AI insights:', error);
      return this.getFallbackClassInsights({} as AIInsightRequest);
    }
  }

  private parsePersonalizedRecommendations(text: string, studentData: any): PersonalizedRecommendation {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          studentId: studentData.studentId,
          studentName: studentData.name,
          ...parsed
        };
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Error parsing personalized recommendations:', error);
      return this.getFallbackStudentRecommendations(studentData);
    }
  }

  private parsePredictiveAnalytics(text: string, data: AIInsightRequest): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('Error parsing predictive analytics:', error);
      return this.getFallbackPredictiveAnalytics(data);
    }
  }

  private getFallbackClassInsights(data: AIInsightRequest): AIInsight[] {
    const avgGrade = data.classAnalytics?.averageGrade || 0
    const studentsAtRisk = data.classAnalytics?.studentsAtRisk || 0
    const totalStudents = data.studentData?.length || 0
    
    const insights: AIInsight[] = [
      {
        type: 'alert',
        title: 'Gemini AI Configuration Required',
        description: 'To enable advanced AI insights, please configure your GEMINI_API_KEY in the environment variables. Currently using basic analytics.',
        confidence: 1.0,
        actionItems: [
          'Add GEMINI_API_KEY to your .env.local file',
          'Get API key from Google AI Studio (makersuite.google.com)',
          'Restart the application after adding the key'
        ],
        priority: 'medium',
        category: 'academic'
      }
    ]

    // Add data-driven insights based on available metrics
    if (avgGrade < 70) {
      insights.push({
        type: 'recommendation',
        title: 'Class Performance Needs Attention',
        description: `Class average of ${avgGrade.toFixed(1)}% indicates need for intervention strategies.`,
        confidence: 0.9,
        actionItems: [
          'Review assignment difficulty levels',
          'Provide additional support resources',
          'Consider individual student meetings'
        ],
        priority: 'high',
        category: 'academic'
      })
    }

    if (studentsAtRisk > totalStudents * 0.3) {
      insights.push({
        type: 'alert',
        title: 'High Number of At-Risk Students',
        description: `${studentsAtRisk} out of ${totalStudents} students are at risk of failing.`,
        confidence: 0.95,
        actionItems: [
          'Implement class-wide intervention strategies',
          'Schedule individual student assessments',
          'Review curriculum pacing'
        ],
        priority: 'critical',
        category: 'risk'
      })
    }

    return insights
  }

  private getFallbackStudentRecommendations(studentData: any): PersonalizedRecommendation {
    return {
      studentId: studentData.studentId,
      studentName: studentData.name,
      recommendations: {
        immediate: ['Review recent assignments', 'Check for missing work'],
        shortTerm: ['Establish regular study schedule', 'Seek help if needed'],
        longTerm: ['Develop consistent study habits', 'Set academic goals']
      },
      interventions: [
        {
          type: 'academic',
          description: 'Provide additional support resources',
          timeline: 'This week',
          resources: ['Tutoring services', 'Study guides']
        }
      ],
      riskFactors: ['AI analysis unavailable'],
      strengths: ['Individual assessment needed']
    };
  }

  private getFallbackPredictiveAnalytics(data: AIInsightRequest): any {
    return {
      classProjections: {
        expectedFinalAverage: data.classAnalytics.averageGrade || 0,
        projectedCompletionRate: data.classAnalytics.averageCompletionRate || 0,
        riskStudentCount: data.classAnalytics.studentsAtRisk || 0,
        improvementOpportunities: ['AI analysis unavailable']
      },
      studentRiskAssessment: [],
      interventionRecommendations: [
        {
          type: 'class-wide',
          description: 'Continue monitoring student progress',
          expectedImpact: 'medium',
          timeline: 'Ongoing'
        }
      ]
    };
  }
}

export const geminiAI = new GeminiAIService()
