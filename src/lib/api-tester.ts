// Comprehensive API Testing System
export interface APITestResult {
  endpoint: string
  method: string
  status: 'success' | 'error' | 'warning'
  responseTime: number
  statusCode?: number
  data?: any
  error?: string
  timestamp: Date
}

export interface APITestSuite {
  name: string
  tests: APITest[]
  results: APITestResult[]
  totalTests: number
  passedTests: number
  failedTests: number
  averageResponseTime: number
}

export interface APITest {
  name: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  expectedStatus?: number
  timeout?: number
}

class APITester {
  private baseUrl: string = ''

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async runTest(test: APITest): Promise<APITestResult> {
    const startTime = Date.now()
    const timestamp = new Date()

    try {
      const response = await fetch(`${this.baseUrl}${test.endpoint}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          ...test.headers
        },
        body: test.body ? JSON.stringify(test.body) : undefined,
        signal: AbortSignal.timeout(test.timeout || 10000)
      })

      const responseTime = Date.now() - startTime
      const data = await response.json().catch(() => null)

      const result: APITestResult = {
        endpoint: test.endpoint,
        method: test.method,
        status: response.ok ? 'success' : 'error',
        responseTime,
        statusCode: response.status,
        data,
        timestamp
      }

      if (test.expectedStatus && response.status !== test.expectedStatus) {
        result.status = 'warning'
        result.error = `Expected status ${test.expectedStatus}, got ${response.status}`
      }

      return result
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      return {
        endpoint: test.endpoint,
        method: test.method,
        status: 'error',
        responseTime,
        error: error.message || 'Unknown error',
        timestamp
      }
    }
  }

  async runTestSuite(suite: APITestSuite): Promise<APITestSuite> {
    const results: APITestResult[] = []
    
    for (const test of suite.tests) {
      const result = await this.runTest(test)
      results.push(result)
    }

    const passedTests = results.filter(r => r.status === 'success').length
    const failedTests = results.filter(r => r.status === 'error').length
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length

    return {
      ...suite,
      results,
      totalTests: results.length,
      passedTests,
      failedTests,
      averageResponseTime
    }
  }

  // Classroom API Tests
  getClassroomTestSuite(): APITestSuite {
    return {
      name: 'Classroom API Tests',
      tests: [
        {
          name: 'Get Course Info',
          endpoint: '/api/classroom/course',
          method: 'GET',
          expectedStatus: 200
        },
        {
          name: 'Get Students',
          endpoint: '/api/classroom/students',
          method: 'GET',
          expectedStatus: 200
        },
        {
          name: 'Get Assignments',
          endpoint: '/api/classroom/assignments',
          method: 'GET',
          expectedStatus: 200
        },
        {
          name: 'Get Submissions',
          endpoint: '/api/classroom/submissions',
          method: 'GET',
          expectedStatus: 200
        },
        {
          name: 'Get Analytics',
          endpoint: '/api/classroom/analytics',
          method: 'GET',
          expectedStatus: 200
        }
      ],
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageResponseTime: 0
    }
  }

  // Authentication API Tests
  getAuthTestSuite(): APITestSuite {
    return {
      name: 'Authentication API Tests',
      tests: [
        {
          name: 'Login Endpoint',
          endpoint: '/api/auth/login',
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'testpassword'
          },
          expectedStatus: 200
        },
        {
          name: 'Profile Endpoint',
          endpoint: '/api/auth/profile',
          method: 'GET',
          expectedStatus: 200
        },
        {
          name: 'Logout Endpoint',
          endpoint: '/api/auth/logout',
          method: 'POST',
          expectedStatus: 200
        }
      ],
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageResponseTime: 0
    }
  }

  // Data Validation Tests
  async validateDataIntegrity(data: any): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate students data
    if (data.students) {
      if (!Array.isArray(data.students)) {
        errors.push('Students data is not an array')
      } else {
        data.students.forEach((student: any, index: number) => {
          if (!student.id && !student.userId) {
            errors.push(`Student at index ${index} missing ID`)
          }
          if (!student.profile?.name?.fullName && !student.name) {
            warnings.push(`Student at index ${index} missing name`)
          }
          if (!student.profile?.emailAddress && !student.email) {
            warnings.push(`Student at index ${index} missing email`)
          }
        })
      }
    }

    // Validate assignments data
    if (data.assignments) {
      if (!Array.isArray(data.assignments)) {
        errors.push('Assignments data is not an array')
      } else {
        data.assignments.forEach((assignment: any, index: number) => {
          if (!assignment.id) {
            errors.push(`Assignment at index ${index} missing ID`)
          }
          if (!assignment.title) {
            warnings.push(`Assignment at index ${index} missing title`)
          }
        })
      }
    }

    // Validate submissions data
    if (data.submissions) {
      if (!Array.isArray(data.submissions)) {
        errors.push('Submissions data is not an array')
      } else {
        data.submissions.forEach((submission: any, index: number) => {
          if (!submission.studentId) {
            errors.push(`Submission at index ${index} missing studentId`)
          }
          if (!submission.assignmentId) {
            errors.push(`Submission at index ${index} missing assignmentId`)
          }
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Performance Tests
  async runPerformanceTests(): Promise<{
    averageResponseTime: number
    maxResponseTime: number
    minResponseTime: number
    throughput: number
    errors: number
  }> {
    const testEndpoint = '/api/classroom/students'
    const testCount = 10
    const results: number[] = []
    let errors = 0

    const startTime = Date.now()

    for (let i = 0; i < testCount; i++) {
      try {
        const testStart = Date.now()
        const response = await fetch(testEndpoint)
        const testEnd = Date.now()
        
        if (response.ok) {
          results.push(testEnd - testStart)
        } else {
          errors++
        }
      } catch (error) {
        errors++
      }
    }

    const totalTime = Date.now() - startTime
    const averageResponseTime = results.reduce((sum, time) => sum + time, 0) / results.length
    const maxResponseTime = Math.max(...results)
    const minResponseTime = Math.min(...results)
    const throughput = (testCount / totalTime) * 1000 // requests per second

    return {
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      throughput,
      errors
    }
  }

  // Generate Test Report
  generateReport(suites: APITestSuite[]): string {
    let report = '# API Test Report\n\n'
    report += `Generated: ${new Date().toISOString()}\n\n`

    suites.forEach(suite => {
      report += `## ${suite.name}\n\n`
      report += `- Total Tests: ${suite.totalTests}\n`
      report += `- Passed: ${suite.passedTests}\n`
      report += `- Failed: ${suite.failedTests}\n`
      report += `- Average Response Time: ${suite.averageResponseTime.toFixed(2)}ms\n\n`

      report += '### Test Results\n\n'
      suite.results.forEach(result => {
        const status = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
        report += `${status} **${result.method} ${result.endpoint}**\n`
        report += `  - Status: ${result.statusCode || 'N/A'}\n`
        report += `  - Response Time: ${result.responseTime}ms\n`
        if (result.error) {
          report += `  - Error: ${result.error}\n`
        }
        report += '\n'
      })
    })

    return report
  }
}

export const apiTester = new APITester()
