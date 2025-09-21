import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, Lightbulb, TrendingUp, AlertTriangle, Target, 
  Sparkles, RefreshCw, ChevronRight, Star, Users,
  BookOpen, Clock, CheckCircle, XCircle
} from 'lucide-react'
import { geminiAI, AIInsight, PersonalizedRecommendation } from '../../lib/gemini-ai'

interface AIInsightsPanelProps {
  studentData: any[]
  classAnalytics: any
  assignments: any[]
  submissions: any[]
  selectedStudent?: any
}

export default function AIInsightsPanel({ 
  studentData, 
  classAnalytics, 
  assignments, 
  submissions,
  selectedStudent 
}: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [personalizedRecs, setPersonalizedRecs] = useState<PersonalizedRecommendation | null>(null)
  const [predictiveAnalytics, setPredictiveAnalytics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'insights' | 'personalized' | 'predictive'>('insights')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (studentData.length > 0 && classAnalytics) {
      generateAIInsights()
    }
  }, [studentData, classAnalytics, assignments, submissions])

  useEffect(() => {
    if (selectedStudent) {
      generatePersonalizedRecommendations()
    }
  }, [selectedStudent])

  const generateAIInsights = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [classInsights, predictions] = await Promise.all([
        geminiAI.generateClassInsights({
          studentData,
          classAnalytics,
          assignments,
          submissions
        }),
        geminiAI.generatePredictiveAnalytics({
          studentData,
          classAnalytics,
          assignments,
          submissions
        })
      ])
      
      setInsights(classInsights)
      setPredictiveAnalytics(predictions)
    } catch (err) {
      setError('Failed to generate AI insights. Using fallback analysis.')
      console.error('AI Insights Error:', err)
      // Set fallback data
      setInsights([
        {
          type: 'recommendation',
          title: 'Monitor Class Progress',
          description: 'Continue tracking student performance and engagement metrics.',
          confidence: 0.8,
          actionItems: ['Review weekly reports', 'Identify trends'],
          priority: 'medium',
          category: 'academic'
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const generatePersonalizedRecommendations = async () => {
    if (!selectedStudent) return
    
    try {
      const recommendations = await geminiAI.generatePersonalizedRecommendations(
        selectedStudent,
        classAnalytics
      )
      setPersonalizedRecs(recommendations)
    } catch (err) {
      console.error('Personalized Recommendations Error:', err)
      setPersonalizedRecs({
        studentId: selectedStudent.studentId,
        studentName: selectedStudent.name,
        recommendations: {
          immediate: ['Review recent performance'],
          shortTerm: ['Establish study routine'],
          longTerm: ['Set academic goals']
        },
        interventions: [],
        riskFactors: ['Analysis unavailable'],
        strengths: ['Individual assessment needed']
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'recommendation': return <Lightbulb className="w-4 h-4" />
      case 'prediction': return <TrendingUp className="w-4 h-4" />
      case 'alert': return <AlertTriangle className="w-4 h-4" />
      case 'trend': return <Target className="w-4 h-4" />
      default: return <Brain className="w-4 h-4" />
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI-Powered Insights</h2>
              <p className="text-purple-100">Advanced analytics with Gemini AI</p>
            </div>
          </div>
          <button
            onClick={generateAIInsights}
            disabled={isLoading}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'insights', label: 'Class Insights', icon: Brain },
            { id: 'personalized', label: 'Student Focus', icon: Users },
            { id: 'predictive', label: 'Predictions', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">{error}</span>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="text-gray-600">Generating AI insights...</span>
                  </div>
                </div>
              ) : (
                insights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                          {getTypeIcon(insight.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(insight.priority)}`}>
                              {insight.priority}
                            </span>
                            <span className="text-xs text-gray-500">
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{insight.description}</p>
                    
                    {insight.actionItems.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Action Items:</h4>
                        <ul className="space-y-1">
                          {insight.actionItems.map((item, idx) => (
                            <li key={idx} className="flex items-center space-x-2 text-sm text-gray-600">
                              <ChevronRight className="w-3 h-3" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'personalized' && (
            <motion.div
              key="personalized"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {selectedStudent ? (
                personalizedRecs ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Personalized Recommendations for {personalizedRecs.studentName}
                      </h3>
                    </div>

                    {/* Recommendations */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-900 mb-2 flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          Immediate Actions
                        </h4>
                        <ul className="space-y-1">
                          {personalizedRecs.recommendations.immediate.map((rec, idx) => (
                            <li key={idx} className="text-sm text-red-800">• {rec}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                          <Target className="w-4 h-4 mr-2" />
                          Short-term Goals
                        </h4>
                        <ul className="space-y-1">
                          {personalizedRecs.recommendations.shortTerm.map((rec, idx) => (
                            <li key={idx} className="text-sm text-yellow-800">• {rec}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2 flex items-center">
                          <Star className="w-4 h-4 mr-2" />
                          Long-term Strategy
                        </h4>
                        <ul className="space-y-1">
                          {personalizedRecs.recommendations.longTerm.map((rec, idx) => (
                            <li key={idx} className="text-sm text-green-800">• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Strengths and Risk Factors */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {personalizedRecs.strengths.map((strength, idx) => (
                            <li key={idx} className="text-sm text-blue-800">• {strength}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-medium text-orange-900 mb-2 flex items-center">
                          <XCircle className="w-4 h-4 mr-2" />
                          Risk Factors
                        </h4>
                        <ul className="space-y-1">
                          {personalizedRecs.riskFactors.map((risk, idx) => (
                            <li key={idx} className="text-sm text-orange-800">• {risk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                    <p className="text-gray-600">Generating personalized recommendations...</p>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Select a student to view personalized recommendations</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'predictive' && (
            <motion.div
              key="predictive"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {predictiveAnalytics ? (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-1">Expected Final Average</h4>
                      <p className="text-2xl font-bold text-blue-700">
                        {predictiveAnalytics.classProjections?.expectedFinalAverage || 0}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-1">Completion Rate</h4>
                      <p className="text-2xl font-bold text-green-700">
                        {predictiveAnalytics.classProjections?.projectedCompletionRate || 0}%
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-1">At-Risk Students</h4>
                      <p className="text-2xl font-bold text-red-700">
                        {predictiveAnalytics.classProjections?.riskStudentCount || 0}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-medium text-purple-900 mb-1">Interventions</h4>
                      <p className="text-2xl font-bold text-purple-700">
                        {predictiveAnalytics.interventionRecommendations?.length || 0}
                      </p>
                    </div>
                  </div>

                  {predictiveAnalytics.interventionRecommendations?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Recommended Interventions</h4>
                      <div className="space-y-3">
                        {predictiveAnalytics.interventionRecommendations.map((intervention: any, idx: number) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">{intervention.type}</span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                intervention.expectedImpact === 'high' ? 'bg-green-100 text-green-800' :
                                intervention.expectedImpact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {intervention.expectedImpact} impact
                              </span>
                            </div>
                            <p className="text-gray-700 mb-2">{intervention.description}</p>
                            <p className="text-sm text-gray-500">Timeline: {intervention.timeline}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Predictive analytics will appear here</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
