import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, 
  Clock, Activity, Database, Shield, Zap, FileText,
  TrendingUp, Users, BookOpen, Settings
} from 'lucide-react'
import { apiTester, APITestSuite, APITestResult } from '../../lib/api-tester'

export default function APITestDashboard() {
  const [testSuites, setTestSuites] = useState<APITestSuite[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedSuite, setSelectedSuite] = useState<string>('')
  const [performanceResults, setPerformanceResults] = useState<any>(null)
  const [dataValidation, setDataValidation] = useState<any>(null)

  const runAllTests = async () => {
    setIsRunning(true)
    try {
      const classroomSuite = await apiTester.runTestSuite(apiTester.getClassroomTestSuite())
      const authSuite = await apiTester.runTestSuite(apiTester.getAuthTestSuite())
      
      setTestSuites([classroomSuite, authSuite])
      
      // Run performance tests
      const perfResults = await apiTester.runPerformanceTests()
      setPerformanceResults(perfResults)
      
      // Validate data integrity
      const response = await fetch('/api/classroom/students')
      const data = await response.json()
      const validation = await apiTester.validateDataIntegrity({ students: data })
      setDataValidation(validation)
      
    } catch (error) {
      console.error('Test execution failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const runSingleSuite = async (suiteName: string) => {
    setIsRunning(true)
    try {
      let suite: APITestSuite
      if (suiteName === 'classroom') {
        suite = await apiTester.runTestSuite(apiTester.getClassroomTestSuite())
      } else {
        suite = await apiTester.runTestSuite(apiTester.getAuthTestSuite())
      }
      
      setTestSuites(prev => {
        const updated = [...prev]
        const index = updated.findIndex(s => s.name.toLowerCase().includes(suiteName))
        if (index >= 0) {
          updated[index] = suite
        } else {
          updated.push(suite)
        }
        return updated
      })
    } catch (error) {
      console.error('Suite execution failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const downloadReport = () => {
    const report = apiTester.generateReport(testSuites)
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `api-test-report-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Activity className="w-8 h-8 mr-3 text-blue-600" />
              API Test Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Comprehensive testing and monitoring of all API endpoints</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? 'Running...' : 'Run All Tests'}</span>
            </button>
            {testSuites.length > 0 && (
              <button
                onClick={downloadReport}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Download Report</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4">
        <button
          onClick={() => runSingleSuite('classroom')}
          disabled={isRunning}
          className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow disabled:opacity-50"
        >
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Classroom APIs</p>
              <p className="text-sm text-gray-600">Test student & assignment data</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => runSingleSuite('auth')}
          disabled={isRunning}
          className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow disabled:opacity-50"
        >
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Auth APIs</p>
              <p className="text-sm text-gray-600">Test authentication flow</p>
            </div>
          </div>
        </button>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <Zap className="w-6 h-6 text-yellow-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Performance</p>
              <p className="text-sm text-gray-600">
                {performanceResults ? `${performanceResults.averageResponseTime.toFixed(0)}ms avg` : 'Not tested'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Data Integrity</p>
              <p className="text-sm text-gray-600">
                {dataValidation ? (dataValidation.isValid ? 'Valid' : `${dataValidation.errors.length} errors`) : 'Not checked'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {performanceResults && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Performance Metrics
          </h2>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{performanceResults.averageResponseTime.toFixed(0)}ms</p>
              <p className="text-sm text-gray-600">Average Response</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{performanceResults.minResponseTime}ms</p>
              <p className="text-sm text-gray-600">Fastest Response</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{performanceResults.maxResponseTime}ms</p>
              <p className="text-sm text-gray-600">Slowest Response</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{performanceResults.throughput.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Requests/sec</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{performanceResults.errors}</p>
              <p className="text-sm text-gray-600">Errors</p>
            </div>
          </div>
        </div>
      )}

      {/* Data Validation Results */}
      {dataValidation && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Data Validation Results
          </h2>
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border ${dataValidation.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`font-medium ${dataValidation.isValid ? 'text-green-900' : 'text-red-900'}`}>
                {dataValidation.isValid ? '✅ Data is valid' : '❌ Data validation failed'}
              </p>
            </div>
            
            {dataValidation.errors.length > 0 && (
              <div>
                <h3 className="font-medium text-red-900 mb-2">Errors:</h3>
                <ul className="space-y-1">
                  {dataValidation.errors.map((error: string, idx: number) => (
                    <li key={idx} className="text-sm text-red-800">• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {dataValidation.warnings.length > 0 && (
              <div>
                <h3 className="font-medium text-yellow-900 mb-2">Warnings:</h3>
                <ul className="space-y-1">
                  {dataValidation.warnings.map((warning: string, idx: number) => (
                    <li key={idx} className="text-sm text-yellow-800">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Suites Results */}
      {testSuites.map((suite, suiteIndex) => (
        <motion.div
          key={suite.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: suiteIndex * 0.1 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{suite.name}</h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {suite.passedTests}/{suite.totalTests} passed
                </span>
                <span className="text-sm text-gray-600">
                  {suite.averageResponseTime.toFixed(0)}ms avg
                </span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Test Progress</span>
                <span>{Math.round((suite.passedTests / suite.totalTests) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(suite.passedTests / suite.totalTests) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              {suite.results.map((result, resultIndex) => (
                <motion.div
                  key={`${result.endpoint}-${result.method}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: resultIndex * 0.05 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {result.method} {result.endpoint}
                      </p>
                      {result.error && (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(result.status)}`}>
                      {result.statusCode || 'N/A'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {result.responseTime}ms
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      ))}

      {testSuites.length === 0 && !isRunning && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tests Run Yet</h3>
          <p className="text-gray-600 mb-4">Click "Run All Tests" to start comprehensive API testing</p>
          <button
            onClick={runAllTests}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Testing
          </button>
        </div>
      )}
    </div>
  )
}
