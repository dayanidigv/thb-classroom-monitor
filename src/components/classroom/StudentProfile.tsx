import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Award,
  Target,
  Share2,
  Copy,
  ExternalLink,
  CalendarCheck,
  Star,
  Zap,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface StudentProfileProps {
  studentId: string;
  isPublicAccess?: boolean;
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: "super-admin" | "admin" | "student";
    passkey: string;
  };
}

interface StudentData {
  profile: {
    name: {
      fullName: string;
      givenName: string;
      familyName: string;
    };
    emailAddress: string;
    photoUrl?: string;
  };
  userId: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate?: any;
  dueTime?: any;
  maxPoints?: number;
}

interface Submission {
  id: string;
  courseWorkId: string;
  userId: string;
  state: string;
  assignedGrade?: number;
  submissionHistory?: any[];
  creationTime: string;
  updateTime: string;
}

const formatDueDate = (dueDate: any, dueTime?: any) => {
  if (!dueDate) return "No due date";
  const date = new Date(dueDate.year, dueDate.month - 1, dueDate.day);
  if (dueTime) {
    date.setHours(dueTime.hours || 0, dueTime.minutes || 0);
  }
  return date.toLocaleDateString();
};

const isAssignmentOverdue = (assignment: any) => {
  if (!assignment.dueDate) return false;
  const date = new Date(
    assignment.dueDate.year,
    assignment.dueDate.month - 1,
    assignment.dueDate.day
  );
  if (assignment.dueTime) {
    date.setHours(
      assignment.dueTime.hours || 0,
      assignment.dueTime.minutes || 0
    );
  }
  return date < new Date();
};

export default function StudentProfile({
  studentId,
  currentUser,
  isPublicAccess = false,
}: StudentProfileProps) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualStudentId, setActualStudentId] = useState<string | null>(null);
  // Use analytics data from student-lookup API instead of calculating separately
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [photoError, setPhotoError] = useState(false);
  const [courseData, setCourseData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);

        // Single comprehensive student lookup API call - no duplicates!
        const studentLookupResponse = await fetch(
          `/api/classroom/student-lookup?identifier=${encodeURIComponent(
            studentId
          )}`
        );

        if (!studentLookupResponse.ok) {
          const errorData = await studentLookupResponse.json();
          throw new Error(errorData.message || "Student not found");
        }

        const lookupData = await studentLookupResponse.json();
        const foundStudent = lookupData.student;
        const realStudentId = lookupData.studentId;

        // Set all student data from single API call
        setStudent(foundStudent);
        setActualStudentId(realStudentId);
        setSubmissions(lookupData.analytics?.submissions || []);
        setAnalyticsData(lookupData.analytics || null);

        console.log("Student lookup successful:", {
          searchTerm: studentId,
          foundByEmail: lookupData.metadata?.foundByEmail,
          foundById: lookupData.metadata?.foundById,
          studentName: foundStudent.profile?.name?.fullName,
          studentId: realStudentId,
          photoUrl: foundStudent.profile?.photoUrl || "No photo available",
          note: "Photos are proxied to handle rate limiting from Google servers",
        });

        // Reset photo error state for new student
        setPhotoError(false);

        // Fetch assignments, course data, and attendance in parallel
        const [assignmentsResponse, courseResponse, attendanceResponse] = await Promise.all([
          fetch("/api/classroom/assignments"),
          fetch("/api/classroom/course"),
          fetch("https://script.google.com/macros/s/AKfycby2hkg41EwBSU2PBDTNi4nMz8j37DregPiAyM48gVdY2G9mtlZiWV6T4ciUrRsa7HnF/exec?apiKey=THB-TD-B1-0925")
        ]);
        
        if (!assignmentsResponse.ok)
          throw new Error("Failed to fetch assignments");
        if (!courseResponse.ok)
          throw new Error("Failed to fetch course data");
        
        const assignmentsData = await assignmentsResponse.json();
        const courseData = await courseResponse.json();
        
        // Handle attendance data
        let attendanceInfo = null;
        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json();
          // Find attendance for current student by matching name
          const studentName = foundStudent.profile?.name?.fullName;
          if (studentName && attendanceData.data) {
            // Try multiple matching strategies
            attendanceInfo = attendanceData.data.find((record: any) => {
              const recordName = record.name?.toLowerCase().trim();
              const searchName = studentName.toLowerCase().trim();
              
              // Exact match
              if (recordName === searchName) return true;
              
              // Contains match (both directions)
              if (recordName?.includes(searchName) || searchName?.includes(recordName)) return true;
              
              // Split name matching (first name + last name)
              const searchParts = searchName.split(' ');
              const recordParts = recordName?.split(' ') || [];
              
              if (searchParts.length >= 2 && recordParts.length >= 2) {
                const searchFirst = searchParts[0];
                const searchLast = searchParts[searchParts.length - 1];
                const recordFirst = recordParts[0];
                const recordLast = recordParts[recordParts.length - 1];
                
                // Match first and last name
                if (searchFirst.includes(recordFirst) || recordFirst.includes(searchFirst)) {
                  if (searchLast.includes(recordLast) || recordLast.includes(searchLast)) {
                    return true;
                  }
                }
              }
              
              return false;
            });
            
            console.log('Attendance matching:', {
              studentName,
              attendanceRecords: attendanceData.data.map((r: any) => r.name),
              foundMatch: attendanceInfo?.name || 'No match found'
            });
          }
        }

        setAssignments(assignmentsData);
        setCourseData(courseData);
        setAttendanceData(attendanceInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Error loading student data
          </h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          {currentUser &&
          (currentUser.role === "admin" ||
            currentUser.role === "super-admin") ? (
            <Link
              href="/dashboard"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </Link>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    );
  }

  // Use analytics data if available, otherwise fallback to manual calculation
  const studentSubmissions =
    analyticsData?.submissions ||
    submissions.filter((s: any) => s.userId === actualStudentId);
  const totalAssignments =
    analyticsData?.totalAssignments || assignments.length;
  const completedSubmissions =
    analyticsData?.completedSubmissions ||
    studentSubmissions.filter(
      (s: any) => s.state === "TURNED_IN" || s.state === "RETURNED"
    ).length;
  const completionRate = analyticsData?.completionRate
    ? Math.round(analyticsData.completionRate)
    : totalAssignments > 0
    ? Math.round((completedSubmissions / totalAssignments) * 100)
    : 0;
  const averageGrade =
    analyticsData?.averageGrade ||
    (completedSubmissions > 0
      ? Math.round(
          studentSubmissions
            .filter((s: any) => s.assignedGrade)
            .reduce((sum: number, s: any) => sum + (s.assignedGrade || 0), 0) /
            studentSubmissions.filter((s: any) => s.assignedGrade).length
        )
      : 0);
  const lateSubmissions =
    analyticsData?.lateSubmissions ||
    studentSubmissions.filter((s: any) => s.late).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-6 sm:space-y-0">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-14 w-14 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200">
                    <Image 
                      src="/logo.png" 
                      alt="Talent Development Logo" 
                      width={40} 
                      height={40}
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                      Talent Development
                    </h1>
                    <p className="text-base sm:text-lg text-gray-600">
                      {courseData?.name || "Loading course..."}
                    </p>
                  </div>
                </div>
                
                {courseData?.section && (
                  <div className="inline-flex items-center px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-sm font-medium mb-3">
                    <Calendar className="h-4 w-4 mr-2" />
                    Section: {courseData.section}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Back Button for Admin Users */}
                {currentUser &&
                  (currentUser.role === "admin" ||
                    currentUser.role === "super-admin") && (
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center px-4 py-2 bg-gray-100 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 transition-colors duration-200"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  )}
                
                {/* Share Profile Button */}
                {currentUser?.role === "student" && (
                  <button
                    onClick={async () => {
                      const url = `${window.location.origin}/dashboard/student/${student.userId}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        alert("Profile link copied to clipboard!");
                      } catch (err) {
                        console.error("Failed to copy: ", err);
                        prompt("Copy this link:", url);
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-sm font-medium rounded-md text-white hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Student Info Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-6 sm:space-y-0 sm:space-x-8">
            <div className="flex-shrink-0">
              {student.profile?.photoUrl && !photoError ? (
                <img
                  src={`/api/photo-proxy?url=${encodeURIComponent(
                    student.profile.photoUrl
                  )}`}
                  alt={`${
                    student.profile?.name?.fullName || "Student"
                  }'s profile photo`}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg object-cover border border-gray-200"
                  onError={(e) => {
                    console.log(
                      "Photo failed to load (rate limited or unavailable), using initials fallback"
                    );
                    setPhotoError(true);
                  }}
                />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-xl sm:text-2xl font-bold text-white">
                    {student.profile?.name?.givenName?.[0] || "U"}
                    {student.profile?.name?.familyName?.[0] || "N"}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {student.profile?.name?.fullName || "Unknown Student"}
                </h2>
                
                {!isPublicAccess && (
                  <div className="flex items-center text-gray-600 mb-3">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="text-sm">{student.profile?.emailAddress || "No email"}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {isPublicAccess ? (
                  <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-md">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Public Access
                  </div>
                ) : (
                  <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-md">
                    <User className="h-4 w-4 mr-1" />
                    Private Access
                  </div>
                )}
                
                {attendanceData && (
                  <div className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-md">
                    <CalendarCheck className="h-4 w-4 mr-2" />
                    {attendanceData.attendancePercentage}% Attendance
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Assignments Card */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center p-2 sm:p-3 rounded-lg bg-blue-100 text-blue-700">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Assignments</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {typeof completedSubmissions === "number"
                    ? completedSubmissions
                    : completedSubmissions?.length || 0}
                  /{totalAssignments}
                </p>
              </div>
            </div>
          </div>

          {/* Completion Rate Card */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center p-2 sm:p-3 rounded-lg bg-green-100 text-green-700">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Completion Rate
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {completionRate}%
                </p>
              </div>
            </div>
          </div>

          {/* Average Grade Card */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center p-2 sm:p-3 rounded-lg bg-yellow-100 text-yellow-700">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Average Grade
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {averageGrade > 0 ? `${averageGrade}%` : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Late Submissions Card */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center p-2 sm:p-3 rounded-lg bg-red-100 text-red-700">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Late Submissions
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {typeof lateSubmissions === "number"
                    ? lateSubmissions
                    : lateSubmissions?.length || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Attendance Card */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center p-2 sm:p-3 rounded-lg bg-purple-100 text-purple-700">
                  <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Attendance
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {attendanceData?.attendancePercentage || 0}%
                </p>
              </div>
            </div>
          </div>

          {/* Total Points Card */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center p-2 sm:p-3 rounded-lg bg-indigo-100 text-indigo-700">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Points
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {attendanceData?.totalPoints || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        {analyticsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Completion Progress */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <TrendingUp className="h-5 w-5 mr-3 text-blue-600" />
                Progress Overview
              </h3>
              <div className="space-y-6">
                <div className="relative">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-800 group-hover:text-gray-900 transition-colors duration-300">
                      Assignment Completion
                    </span>
                    <span className="text-gray-700 font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{completionRate}%</span>
                  </div>
                  <div className="w-full bg-white/50 backdrop-blur-sm rounded-full h-3 shadow-inner border border-white/20">
                    <div
                      className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                </div>
                {averageGrade > 0 && (
                  <div className="relative">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-800 group-hover:text-gray-900 transition-colors duration-300">
                        Average Performance
                      </span>
                      <span className={`font-semibold ${
                        averageGrade >= 90
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                          : averageGrade >= 80
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                          : averageGrade >= 70
                          ? "bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent"
                          : "bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent"
                      }`}>{averageGrade}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ease-out ${
                          averageGrade >= 90
                            ? "bg-green-500"
                            : averageGrade >= 80
                            ? "bg-blue-500"
                            : averageGrade >= 70
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${averageGrade}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {attendanceData && (
                  <div className="relative">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-800 group-hover:text-gray-900 transition-colors duration-300">
                        Class Attendance
                      </span>
                      <span className={`font-semibold ${
                        attendanceData.attendancePercentage >= 90
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
                          : attendanceData.attendancePercentage >= 80
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                          : attendanceData.attendancePercentage >= 70
                          ? "bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent"
                          : "bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent"
                      }`}>{attendanceData.attendancePercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ease-out ${
                          attendanceData.attendancePercentage >= 90
                            ? "bg-green-500"
                            : attendanceData.attendancePercentage >= 80
                            ? "bg-blue-500"
                            : attendanceData.attendancePercentage >= 70
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${attendanceData.attendancePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Zap className="h-5 w-5 mr-3 text-purple-600" />
                Performance Insights
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-blue-900 ml-3">
                      Completed
                    </span>
                  </div>
                  <span className="text-blue-900 font-bold">
                    {typeof completedSubmissions === "number"
                      ? completedSubmissions
                      : completedSubmissions?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-yellow-100 text-yellow-700">
                      <Clock className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-yellow-900 ml-3">
                      Pending
                    </span>
                  </div>
                  <span className="text-yellow-900 font-bold">
                    {totalAssignments -
                      (typeof completedSubmissions === "number"
                        ? completedSubmissions
                        : completedSubmissions?.length || 0)}
                  </span>
                </div>
                {(typeof lateSubmissions === "number"
                  ? lateSubmissions
                  : lateSubmissions?.length || 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="p-2 rounded-lg bg-red-100 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-red-900 ml-3">
                        Late
                      </span>
                    </div>
                    <span className="text-red-900 font-bold">
                      {typeof lateSubmissions === "number"
                        ? lateSubmissions
                        : lateSubmissions?.length || 0}
                    </span>
                  </div>
                )}
                {/* Attendance Information */}
                {attendanceData && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                        <CalendarCheck className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-purple-900 ml-3">
                        Attendance
                      </span>
                    </div>
                    <span className="text-purple-900 font-bold">
                      {attendanceData.attendancePercentage}%
                    </span>
                  </div>
                )}
                {/* Points Information */}
                {attendanceData && (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                        <Star className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-indigo-900 ml-3">
                        Total Points
                      </span>
                    </div>
                    <span className="text-indigo-900 font-bold">
                      {attendanceData.totalPoints}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share Profile Section - Only show for logged in users viewing their own profile, or show access indicator for public access */}

        {!isPublicAccess && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Share2 className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                      Share Your Performance
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Share your academic progress with others using this public link
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">
                    Public Profile URL
                  </p>
                  <div className="flex items-center">
                    <code className="text-sm bg-white px-2 py-1 rounded border text-gray-800 flex-1 min-w-0 truncate mr-2">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/dashboard/student/${student.userId}`
                        : `[domain]/dashboard/student/${student.userId}`}
                    </code>
                    {!isPublicAccess && (
                      <button
                        onClick={async () => {
                          const url = `${window.location.origin}/dashboard/student/${student.userId}`;
                          try {
                            await navigator.clipboard.writeText(url);
                            // You could add a toast notification here
                            alert("Link copied to clipboard!");
                          } catch (err) {
                            console.error("Failed to copy: ", err);
                            // Fallback for older browsers
                            prompt("Copy this link:", url);
                          }
                        }}
                        className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                    ✓ This link allows anyone to view your academic performance
                    without logging in
                    <br />
                    ✓ Your personal information (email) remains private
                    <br />✓ Only academic progress and grades are visible
              </div>
            </div>
          </div>
        )}

        {/* Assignment Details */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Assignment Details
              </h3>
              <span className="text-sm text-gray-500 sm:text-right">
                {totalAssignments} total assignment{totalAssignments !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {assignments.map((assignment) => {
              const submission = studentSubmissions.find(
                (s: any) => s.courseWorkId === assignment.id
              );
              const dueDate = formatDueDate(
                assignment.dueDate,
                assignment.dueTime
              );
              const isOverdue = isAssignmentOverdue(assignment);

              const getStatusColor = () => {
                if (!submission) return "bg-gray-100 text-gray-800";
                if (
                  submission.state === "TURNED_IN" ||
                  submission.state === "RETURNED"
                ) {
                  return isOverdue
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800";
                }
                return "bg-red-100 text-red-800";
              };

              const getStatusText = () => {
                if (!submission) return "Not Submitted";
                if (submission.state === "TURNED_IN") return "Submitted";
                if (submission.state === "RETURNED") return "Graded";
                return "In Progress";
              };

              return (
                <div key={assignment.id} className="px-4 sm:px-6 py-4">
                  {/* Mobile-first responsive layout */}
                  <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                    {/* Assignment Info - Full width on mobile, flex on desktop */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start sm:items-center mb-2">
                        <BookOpen className="h-5 w-5 text-blue-500 mr-3 mt-0.5 sm:mt-0 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 leading-5 sm:truncate">
                            {assignment.title}
                          </h4>
                          {/* Mobile: Stack vertically, Desktop: Inline */}
                          <div className="flex flex-col sm:flex-row sm:items-center mt-1 space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                              <span className="text-xs sm:text-sm">
                                {dueDate !== "No due date"
                                  ? `Due ${dueDate}`
                                  : "No due date"}
                              </span>
                            </div>
                            {assignment.maxPoints && (
                              <div className="flex items-center">
                                <Target className="h-4 w-4 mr-1 flex-shrink-0" />
                                <span className="text-xs sm:text-sm">
                                  {assignment.maxPoints} points
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status and Grade - Full width on mobile, right-aligned on desktop */}
                    <div className="flex items-center justify-between sm:justify-end sm:ml-4 space-x-3">
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor()}`}
                      >
                        {getStatusText()}
                      </span>

                      {/* Grade Display */}
                      {submission?.assignedGrade !== undefined && (
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                              {submission.assignedGrade}
                              {assignment.maxPoints &&
                                `/${assignment.maxPoints}`}
                            </div>
                          </div>
                          <div
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              submission.assignedGrade >= 90
                                ? "bg-green-500"
                                : submission.assignedGrade >= 80
                                ? "bg-blue-500"
                                : submission.assignedGrade >= 70
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                          ></div>
                        </div>
                      )}
                    </div>

                    {/* Additional Status Messages - Full width below on mobile */}
                    {((submission &&
                      submission.state === "TURNED_IN" &&
                      !submission.assignedGrade) ||
                      (isOverdue && !submission)) && (
                      <div className="sm:hidden w-full mt-2">
                        {submission &&
                          submission.state === "TURNED_IN" &&
                          !submission.assignedGrade && (
                            <div className="text-xs text-blue-600 font-medium text-center">
                              ⏳ Awaiting Grade
                            </div>
                          )}
                        {isOverdue && !submission && (
                          <div className="text-xs text-red-600 font-medium text-center">
                            ⚠️ Overdue
                          </div>
                        )}
                      </div>
                    )}

                    {/* Desktop Status Messages */}
                    <div className="hidden sm:block sm:ml-2">
                      {submission &&
                        submission.state === "TURNED_IN" &&
                        !submission.assignedGrade && (
                          <div className="text-xs text-blue-600 font-medium">
                            ⏳ Awaiting Grade
                          </div>
                        )}
                      {isOverdue && !submission && (
                        <div className="text-xs text-red-600 font-medium">
                          ⚠️ Overdue
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
