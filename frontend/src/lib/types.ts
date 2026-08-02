export type Role = 'ADMIN' | 'LECTURER' | 'STUDENT';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoginUser {
  id: string;
  email: string;
  loginId: string | null;
  firstName: string;
  lastName: string;
  role: Role;
  departmentId: string | null;
  lastLoginAt: string | null;
}

export interface LoginData {
  token: string;
  user: LoginUser;
}

export interface LoginAttempt {
  id: string;
  userEmail: string | null;
  userLoginId: string | null;
  userName: string | null;
  userRole: Role | null;
  loginSuccessful: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  loggedAt: string;
}

export interface LoginAttemptsData extends Paged<LoginAttempt> {
  stats: { successToday: number; failedToday: number; lockedNow: number };
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  title: string;
  code: string;
  description: string | null;
  departmentId: string;
  departmentName: string;
  credits: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface QuestionBank {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  courseTitle: string;
  createdById: string;
  createdByName: string;
  isActive: boolean;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'FILL_BLANK' | 'SUBJECTIVE';

export interface Question {
  id: string;
  questionBankId: string;
  questionBankTitle: string;
  content: string;
  questionType: QuestionType;
  points: number;
  choices: { options: string[] } | null;
  correctAnswer: string | null;
  explanation: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExamStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  courseTitle: string;
  questionBankId: string;
  questionBankTitle: string;
  createdById: string;
  createdByName: string;
  durationMinutes: number;
  passingScore: number;
  maxAttempts: number | null;
  maxTabSwitches: number | null;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  showResultsImmediately: boolean;
  startTime: string;
  endTime: string;
  status: ExamStatus;
  createdAt?: string;
  updatedAt?: string;
  questions?: ExamQuestion[];
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionId: string;
  questionContent: string;
  questionType: QuestionType;
  points: number;
  questionOrder: number;
  choices: { options: string[] } | null;
  correctAnswer?: string | null;
  explanation?: string | null;
}

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'GRADED';

export interface Result {
  id: string;
  attemptId: string;
  totalScore: number | string;
  maxScore: number | string;
  percentage: number | string | null;
  passed: boolean;
  isReleased: boolean;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttemptQuestion {
  id: string;
  examId: string;
  questionId: string;
  questionContent: string;
  questionType: QuestionType;
  points: number;
  questionOrder: number;
  choices: { options: string[] } | null;
  correctAnswer?: string | null;
  explanation?: string | null;
}

export interface AttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  questionContent: string;
  questionType: QuestionType;
  answerText: string | null;
  selectedChoices: string | null;
  isCorrect: boolean | null;
  scoreObtained: number | string | null;
  gradedByName: string | null;
  gradedAt: string | null;
  correctAnswer: string | null;
}

export interface Attempt {
  id: string;
  examId: string;
  examTitle: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  attemptNumber: number;
  status: AttemptStatus;
  tabSwitchCount: number;
  maxTabSwitches: number | null;
  startedAt: string;
  submittedAt: string | null;
  durationMinutes: number;
  endTime: string | null;
  resultsAvailable: boolean;
  questions: AttemptQuestion[];
  answers: AttemptAnswer[];
  result: Result | null;
}

export interface AttemptListItem {
  id: string;
  examId: string;
  examTitle: string;
  courseTitle: string;
  attemptNumber: number;
  status: AttemptStatus;
  tabSwitchCount: number;
  maxTabSwitches: number | null;
  startedAt: string;
  submittedAt: string | null;
  resultsAvailable: boolean;
  result: Result | null;
  showResultsImmediately: boolean;
}

export interface TeacherAttemptRow {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  attemptNumber: number;
  status: AttemptStatus;
  tabSwitchCount: number;
  startedAt: string;
  submittedAt: string | null;
  ipAddress: string | null;
  result: Result | null;
}

export interface Paged<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
