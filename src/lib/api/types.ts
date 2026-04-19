// ─── Common API Types ───────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
}

// ─── Auth / User ────────────────────────────────────────────────

export interface UserDto {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  staffId: string | null;
  roles: string[];
  permissions?: string[];
  permissionsSource?: string | null;
  enabled: boolean;
  photoUrl: string | null;
  language: string | null;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  tenantId?: string;
  permissions?: string[];
  permissionsSource?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  scope: string;
}

export interface FileUploadResponse {
  fileName: string;
  originalFileName: string;
  contentType: string;
  size: number;
  url: string;
  bucket: string;
  uploadedAt: string;
}

// ─── Tenant ─────────────────────────────────────────────────────

export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED';
export type TenantPlan = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface TenantDto {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  phone: string;
  status: TenantStatus;
  plan: TenantPlan;
  schemaName: string;
  timezone: string;
  maxStudents: number;
  maxStaff: number;
  trialEndsAt: string | null;
  contactPerson: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantRequest {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: TenantStatus;
  plan?: TenantPlan;
  timezone?: string;
  maxStudents?: number | null;
  maxStaff?: number | null;
  trialEndsAt?: string | null;
  contactPerson?: string | null;
  notes?: string | null;
}

// ─── Student ────────────────────────────────────────────────────

export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'DROPPED' | 'ON_HOLD';
export type StudentGender = 'MALE' | 'FEMALE';

export interface StudentDto {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  fullName: string;
  customer: string | null;
  studentPhoto: string | null;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  status: StudentStatus;
  parentName: string | null;
  parentPhone: string | null;
  studentPhone: string | null;
  gender: StudentGender | null;
  address: string | null;
  city: string | null;
  school: string | null;
  grade: string | null;
  additionalInfo: string | null;
  contract: string | null;
  discount: string | null;
  comment: string | null;
  stateOrderParticipant: boolean | null;
  loyalty: string | null;
  additionalPhones: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  status?: StudentStatus;
  customer?: string;
  studentPhoto?: string;
  email?: string;
  phone?: string;
  studentPhone?: string;
  birthDate?: string;
  gender?: StudentGender;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  city?: string;
  school?: string;
  grade?: string;
  additionalInfo?: string;
  contract?: string;
  discount?: string;
  comment?: string;
  stateOrderParticipant?: boolean;
  loyalty?: string;
  additionalPhones?: string[];
  notes?: string;
}

export type UpdateStudentRequest = Partial<CreateStudentRequest>;

export interface StudentStatsDto {
  totalStudents: number;
  activeStudents: number;
  newThisMonth: number;
  graduated: number;
  dropped: number;
}

// ─── Staff ──────────────────────────────────────────────────────

export type StaffRole = 'TEACHER' | 'MANAGER' | 'RECEPTIONIST' | 'ACCOUNTANT' | 'ADMIN';
export type StaffStatus = 'ACTIVE' | 'ON_LEAVE' | 'DISMISSED';
export type SalaryType = 'FIXED' | 'PER_STUDENT_PERCENTAGE';

export interface StaffDto {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  status: StaffStatus;
  customStatus: string | null;
  position: string | null;
  salary: number | null;
  salaryType: SalaryType;
  salaryPercentage: number | null;
  hireDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone?: string;
  role: StaffRole;
  customStatus?: string | null;
  position?: string;
  salary?: number;
  salaryType: SalaryType;
  salaryPercentage?: number | null;
  hireDate?: string;
  notes?: string;
}

export interface UpdateStaffRequest extends Partial<CreateStaffRequest> {
  status?: StaffStatus;
}

// ─── Course ─────────────────────────────────────────────────────

export type CourseType = 'GROUP' | 'INDIVIDUAL';
export type CourseFormat = 'OFFLINE' | 'ONLINE';
export type CourseStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface CourseDto {
  id: string;
  type: CourseType;
  format: CourseFormat;
  name: string;
  description: string | null;
  basePrice: number | null;
  enrollmentLimit: number | null;
  color: string | null;
  teacherId: string | null;
  roomId: string | null;
  studentIds: string[];
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseRequest {
  type: CourseType;
  format: CourseFormat;
  name: string;
  description?: string;
  basePrice: number;
  enrollmentLimit?: number;
  color?: string;
  teacherId?: string;
  roomId?: string;
  studentIds?: string[];
}

export interface UpdateCourseRequest extends Partial<CreateCourseRequest> {
  status?: CourseStatus;
}

// ─── Schedule / Group ───────────────────────────────────────────

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export interface ScheduleDto {
  id: string;
  name: string;
  courseId: string | null;
  teacherId: string | null;
  roomId: string | null;
  daysOfWeek: DayOfWeek[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string | null;
  maxStudents: number | null;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleRequest {
  name: string;
  courseId?: string;
  roomId?: string;
  daysOfWeek: DayOfWeek[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate?: string;
}

export interface UpdateScheduleRequest extends Partial<CreateScheduleRequest> {
  status?: ScheduleStatus;
}

// ─── Room ───────────────────────────────────────────────────────

export type RoomStatus = 'ACTIVE' | 'INACTIVE';

export interface RoomDto {
  id: string;
  name: string;
  capacity: number | null;
  description: string | null;
  color: string | null;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomRequest {
  name: string;
  capacity?: number;
  description?: string;
  color?: string;
}

// ─── Lesson ─────────────────────────────────────────────────────

export type LessonType = 'GROUP' | 'INDIVIDUAL' | 'TRIAL';
export type LessonStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED' | 'TEACHER_ABSENT' | 'TEACHER_SICK';

export interface LessonDto {
  id: string;
  groupId: string | null;
  serviceId: string | null;
  teacherId: string | null;
  substituteTeacherId: string | null;
  roomId: string | null;
  lessonDate: string;
  startTime: string;
  endTime: string;
  lessonType: LessonType;
  capacity: number | null;
  status: LessonStatus;
  topic: string | null;
  homework: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonRequest {
  lessonDate: string;
  startTime: string;
  endTime: string;
  groupId?: string;
  teacherId?: string;
  roomId?: string;
  lessonType: LessonType;
  capacity?: number;
  topic?: string;
  homework?: string;
  notes?: string;
}

// ─── Attendance ─────────────────────────────────────────────────

export type AttendanceStatus = 'PLANNED' | 'ATTENDED' | 'ABSENT' | 'SICK' | 'VACATION' | 'AUTO_ATTENDED' | 'ONE_TIME_VISIT';

export interface AttendanceDto {
  id: string;
  lessonId: string;
  studentId: string;
  status: AttendanceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Lead ───────────────────────────────────────────────────────

export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'TRIAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface LeadDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  stage: LeadStage;
  source: string | null;
  courseInterest: string | null;
  notes: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  source?: string;
  courseInterest?: string;
  notes?: string;
  assignedTo?: string;
}

export interface UpdateLeadRequest {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  courseInterest?: string | null;
  notes?: string | null;
  assignedTo?: string | null;
  stage?: LeadStage;
}

// ─── Task ───────────────────────────────────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'OVERDUE' | 'DUE_TODAY' | 'DUE_THIS_WEEK' | 'DUE_NEXT_WEEK' | 'MORE_THAN_NEXT_WEEK';

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority: TaskPriority;
  assignedTo?: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
}

// ─── Finance ────────────────────────────────────────────────────

export type TransactionType = 'INCOME' | 'EXPENSE' | 'REFUND';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type AmountChangeReasonCode = 'DISCOUNT' | 'PENALTY' | 'REFUND_ADJUSTMENT' | 'MANUAL_CORRECTION' | 'OTHER';

export interface TransactionDto {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  category: string | null;
  description: string | null;
  transactionDate: string;
  studentId: string | null;
  amountChangeReasonCode: AmountChangeReasonCode | null;
  amountChangeReasonOther: string | null;
  staffId: string | null;
  salaryMonth: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  status?: TransactionStatus;
  amount: number;
  currency?: string;
  category?: string;
  description?: string;
  transactionDate: string;
  studentId?: string;
  staffId?: string;
  amountChangeReasonCode?: AmountChangeReasonCode;
  amountChangeReasonOther?: string;
  salaryMonth?: string;
  notes?: string;
}

// ─── Subscription ───────────────────────────────────────────────

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FROZEN';

export interface SubscriptionDto {
  id: string;
  studentId: string;
  courseId: string | null;
  groupId: string | null;
  serviceId: string | null;
  priceListId: string | null;
  totalLessons: number;
  lessonsLeft: number;
  startDate: string;
  endDate: string | null;
  amount: number;
  currency: string;
  status: SubscriptionStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── PriceList ──────────────────────────────────────────────────

export interface PriceListDto {
  id: string;
  name: string;
  courseId: string | null;
  price: number;
  lessonsCount: number;
  validityDays: number;
  isActive: boolean;
  description: string | null;
  createdAt: string;
}

// ─── Notification ───────────────────────────────────────────────

export interface NotificationDto {
  id: string;
  type: string;               // EMAIL | SMS | IN_APP
  recipientEmail: string | null;
  recipientStaffId: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  subject: string | null;
  body: string;
  status: string;             // PENDING | SENT | FAILED
  errorMessage: string | null;
  sentAt: string | null;
  tenantId: string;
  eventType: string;
  referenceType: string | null; // TASK | LEAD | ...
  referenceId: string | null;
  createdAt: string;
}

// ─── Settings ───────────────────────────────────────────────────

export interface SettingsDto {
  id: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  centerName: string | null;
  mainDirection: string | null;
  directorName: string | null;
  corporateEmail: string | null;
  branchCount: number | null;
  logoUrl: string | null;
  city: string | null;
  workPhone: string | null;
  address: string | null;
  directorBasis: string | null;
  bankAccount: string | null;
  bank: string | null;
  bin: string | null;
  bik: string | null;
  requisites: string | null;
  timezone: string;
  currency: string;
  language: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  slotDurationMin: number;
  workingDays: string;
  defaultLessonDurationMin: number;
  trialLessonDurationMin: number;
  maxGroupSize: number;
  autoMarkAttendance: boolean;
  attendanceWindowDays: number;
  smsEnabled: boolean;
  emailEnabled: boolean;
  smsSenderName: string | null;
  latePaymentReminderDays: number;
  subscriptionExpiryReminderDays: number;
  brandColor: string;
}

export interface RoleConfigDto {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface PaymentSourceDto {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface AttendanceStatusConfigDto {
  id: string;
  name: string;
  deductLesson: boolean;
  requirePayment: boolean;
  countAsAttended: boolean;
  color: string;
  sortOrder: number;
  systemStatus: boolean;
}

export interface StaffStatusConfigDto {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface FinanceCategoryConfigDto {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}

// Backward-compat aliases
export type IncomeCategoryDto = FinanceCategoryConfigDto;
export type ExpenseCategoryDto = FinanceCategoryConfigDto;

export type ContactRecipientField = 'PHONE' | 'STUDENT_PHONE' | 'PARENT_PHONE' | 'ADDITIONAL_PHONE_1';

export interface KpaySettingsDto {
  enabled: boolean;
  configured: boolean;
  merchantId: string | null;
  apiBaseUrl: string | null;
  recipientField: ContactRecipientField;
  apiKeyMasked: string | null;
  apiSecretMasked: string | null;
}

export interface UpdateKpaySettingsRequest {
  enabled?: boolean;
  merchantId?: string | null;
  apiBaseUrl?: string | null;
  recipientField?: ContactRecipientField;
  apiKey?: string;
  apiSecret?: string;
}

export interface ApiPaySettingsDto {
  enabled: boolean;
  configured: boolean;
  apiBaseUrl: string | null;
  recipientField: ContactRecipientField;
  apiKeyMasked: string | null;
  webhookSecretMasked: string | null;
  webhookUrl: string | null;
  signatureHeader: 'X-Webhook-Signature';
  signatureAlgorithm: 'HMAC-SHA256';
}

export interface UpdateApiPaySettingsRequest {
  enabled?: boolean;
  apiBaseUrl?: string | null;
  recipientField?: ContactRecipientField;
  apiKey?: string;
  webhookSecret?: string;
}

export interface AisarSettingsDto {
  enabled: boolean;
  configured: boolean;
  apiBaseUrl: string | null;
  apiKeyMasked: string | null;
  webhookSecretMasked: string | null;
  webhookUrl: string | null;
  signatureHeader: 'X-AISAR-Signature';
  signatureAlgorithm: 'HMAC-SHA256';
}

export interface UpdateAisarSettingsRequest {
  enabled?: boolean;
  apiBaseUrl?: string | null;
  apiKey?: string;
  webhookSecret?: string;
}

export interface FtelecomSettingsDto {
  enabled: boolean;
  configured: boolean;
  apiBaseUrl: string | null;
  crmTokenMasked: string | null;
  webhookUrl: string | null;
  tokenField: 'crm_token';
}

export interface UpdateFtelecomSettingsRequest {
  enabled?: boolean;
  apiBaseUrl?: string | null;
  crmToken?: string;
}

export interface ZadarmaSettingsDto {
  enabled: boolean;
  configured: boolean;
  apiBaseUrl: string | null;
  userKeyMasked: string | null;
  userSecretMasked: string | null;
  webhookUrl: string | null;
  validationMode: 'GET ?zd_echo=<random>';
  signatureHeader: 'Signature';
  signatureAlgorithm: 'HMAC-SHA1 (base64)';
}

export interface UpdateZadarmaSettingsRequest {
  enabled?: boolean;
  apiBaseUrl?: string | null;
  userKey?: string;
  userSecret?: string;
}

export interface GoogleDriveBackupSettingsDto {
  enabled: boolean;
  configured: boolean;
  oauthConnectUrl: string | null;
  folderId: string | null;
  accessTokenMasked: string | null;
  lastBackupAt: string | null;
}

export interface UpdateGoogleDriveBackupSettingsRequest {
  enabled?: boolean;
  folderId?: string | null;
  accessToken?: string;
}

export interface YandexDiskBackupSettingsDto {
  enabled: boolean;
  configured: boolean;
  oauthConnectUrl: string | null;
  folderPath: string | null;
  accessTokenMasked: string | null;
  lastBackupAt: string | null;
}

export interface UpdateYandexDiskBackupSettingsRequest {
  enabled?: boolean;
  folderPath?: string | null;
  accessToken?: string;
}

export interface CloudBackupRunResultDto {
  provider: string;
  fileName: string;
  remoteId?: string | null;
  remotePath?: string | null;
  completedAt: string;
}

// ─── Audit ──────────────────────────────────────────────────────

export interface TenantAuditLog {
  id: string;
  tenantId: string;
  category: string;
  action: string;
  actorId: string;
  actorName: string | null;
  targetType: string;
  targetId: string;
  targetName: string | null;
  details: Record<string, unknown>;
  timestamp: string;
}

// ─── Analytics ──────────────────────────────────────────────────

export interface DashboardResponse {
  attendanceRate: number;
  attendancePrevRate: number;
  groupLoadRate: number;
  groupLoadPrevRate: number;
  trialScheduled: number;
  trialAttended: number;
  trialConversionRate: number;
  trialConversionPrevRate: number;
  averageCheck: number;
  arpu: number;
  arpuPrev: number;
  subscriptionsSold: number;
  subscriptionsSoldPrev: number;
  subscriptionsDeltaPct: number;
  revenue: number;
  revenueDeltaPct: number;
  expenses: number;
  profit: number;
  studentsAtStart: number;
  studentsJoined: number;
  studentsJoinedDeltaPct: number;
  studentsLeft: number;
  studentsLeftDeltaPct: number;
  studentsAtEnd: number;
  studentsDelta: number;
  studentsDeltaPct: number;
  activeGroupStudents: number;
  activeIndividualStudents: number;
  leadsTotal: number;
  leadsDeltaPct: number;
  contractsTotal: number;
  leadsToContractsConversion: number;
  retentionM1Rate: number;
  retentionM1Delta: number;
  topEmployee: {
    staffId: string;
    fullName: string;
    index: number;
    revenue: number;
    revenueDeltaPct: number;
    groupLoadRate: number;
    activeStudents: number;
  };
  monthlyAttendance: { month: string; rate: number }[];
  currentMonthAttendance: number;
  currentMonthAttendanceDelta: number;
  joinedStudents: { studentId: string; fullName: string }[];
  leftStudents: { studentId: string; fullName: string }[];
}

export interface TodayStatsResponse {
  date: string;
  todayRevenue: number;
  todayExpenses: number;
  newSubscriptions: number;
  conductedLessons: number;
  attendedStudents: number;
  newEnrollments: number;
  expiredSubscriptionsTotal: number;
  expiredByDate: ExpiredSubscriptionDto[];
  expiredByRemaining: ExpiredSubscriptionDto[];
  overdue: ExpiredSubscriptionDto[];
  totalDebt: number;
  debtors: { studentId: string; fullName: string; balance: number }[];
  unpaidVisits: {
    studentId: string;
    studentName: string;
    lessonId: string;
    groupName: string;
    lessonDate: string;
  }[];
  upcomingBirthdays: {
    studentId: string;
    fullName: string;
    birthDate: string;
    daysUntil: number;
    turnsAge: number;
  }[];
}

export interface GroupLoadResponse {
  rows: {
    groupId: string;
    groupName: string;
    studentsCount: number;
    capacity: number;
    loadPct: number;
  }[];
}

export interface RoomLoadResponse {
  rows: {
    roomId: string;
    roomName: string;
    lessonsCount: number;
    totalStudents: number;
    totalCapacity: number;
    loadPct: number;
  }[];
  timelineDate: string | null;
  timeline: {
    roomId: string;
    roomName: string;
    occupancyPct: number;
  }[];
}

export interface RetentionResponse {
  cohorts: {
    cohort: string;
    cohortKey: string;
    size: number;
    m0: number;
    m1: number;
    m2: number;
    m3: number;
    m4: number;
    m5: number;
  }[];
}

export interface TeacherAnalyticsResponse {
  topEmployee: {
    staffId: string;
    fullName: string;
    index: number;
    revenue: number;
    revenueDeltaPct: number;
    groupLoadRate: number;
    activeStudents: number;
  };
  rows: {
    staffId: string;
    fullName: string;
    activeStudents: number;
    subscriptionsSold: number;
    studentsInPeriod: number;
    revenue: number;
    revenueDeltaPct: number;
    totalStudents: number;
    avgTenureMonths: number;
    totalTenureMonths: number;
    groupLoadRate: number;
    index: number;
  }[];
}

export interface GroupAttendanceResponse {
  groupId: string;
  groupName: string;
  avgAttendanceRate: number;
  monthly: { month: string; rate: number }[];
}

export interface FinanceReportResponse {
  revenue: number;
  revenueDeltaPct: number;
  expenses: number;
  expensesDeltaPct: number;
  profit: number;
  profitDeltaPct: number;
  monthly: { month: string; label: string; revenue: number; expenses: number; profit: number }[];
  revenueByCategory: { category: string; amount: number }[];
  revenueBySource: { category: string; amount: number }[];
  revenueByGroup: { groupId: string; groupName: string; revenue: number }[];
  expensesByCategory: { category: string; amount: number }[];
  reconciliation: {
    totalSubscriptionAmount: number;
    revenueFromSubscriptions: number;
    paidBeforePeriod: number;
    debtFromSubscriptions: number;
    coverageRate: number;
    paidAfterPeriod: number;
    paidBeforePeriodPayments: number;
    revenueNotFromSubscriptions: number;
    studentsWithoutPayments: number;
    subscriptionsWithoutPayments: number;
  };
}

export interface SubscriptionReportResponse {
  totalAmount: number;
  totalCount: number;
  suspiciousCount: number;
  rows: {
    subscriptionId: string;
    studentId: string;
    studentName: string;
    serviceName: string;
    amount: number;
    status: string;
    suspicious: boolean;
    suspiciousReason: string | null;
    createdDate: string;
    startDate: string;
    totalLessons: number;
    lessonsLeft: number;
    attendanceCount: number;
  }[];
}

export interface ExpiredSubscriptionDto {
  subscriptionId: string;
  studentId: string;
  studentName: string;
  groupName: string;
  lessonsLeft: number;
  amount: number;
  endDate: string;
  category: string; // EXPIRING_BY_DATE | EXPIRING_BY_REMAINING | OVERDUE
}

export interface SalesFunnelResponse {
  stages: {
    stage: string;
    count: number;
    pct: number;
    budget: number;
    active: number;
    closed: number;
  }[];
  totalLeads: number;
  totalLeadsDeltaPct: number;
  successfulDeals: number;
  successfulDealsDeltaPct: number;
  failedDeals: number;
  failedDealsDeltaPct: number;
  avgDealDurationDays: number;
  avgDealDurationDeltaDays: number;
  openDeals: number;
  openDealsDeltaPct: number;
  totalConverted: number;
  overallConversion: number;
}

export interface LeadConversionResponse {
  stageConversions: { stageFrom: string; stageTo: string; entries: number; strictConversionPct: number }[];
  bySource: { source: string; leads: number; contracts: number; conversionPct: number }[];
  byManager: {
    manager: string;
    leads: number;
    contracts: number;
    conversionPct: number;
    frtP50Days: number;
    frtP75Days: number;
    frtP90Days: number;
  }[];
  stageSummary: { stage: string; count: number; pct: number }[];
  avgDaysToContract: number;
  medianDaysP50: number;
  medianDaysP75: number;
  medianDaysP90: number;
  trialScheduled: number;
  trialAttended: number;
  trialConverted30d: number;
  trialScheduledPct: number;
  trialAttendedPct: number;
  trialConverted30dPct: number;
  arpu: number;
  arppu: number;
  avgCheck: number;
  rpr: number;
}

export interface ManagerEfficiencyResponse {
  rows: {
    managerName: string;
    leadsCount: number;
    contractsCount: number;
    conversionPct: number;
    frtP50Days: number;
    frtP75Days: number;
    frtP90Days: number;
  }[];
}

// ─── Student Payments (Payment Service) ─────────────────────────

export type StudentPaymentMonthStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export interface MonthlyBreakdownDto {
  month: string;
  expected: number;
  paid: number;
  debt: number;
  status: StudentPaymentMonthStatus;
  payments: StudentPaymentDto[];
}

export interface SubscriptionPaymentSummaryDto {
  subscriptionId: string;
  courseId: string;
  priceListId: string | null;
  totalAmount: number;
  monthlyExpected: number;
  totalMonths: number;
  startDate: string;
  endDate: string | null;
  subscriptionStatus: SubscriptionStatus;
  totalPaid: number;
  totalDebt: number;
  months: MonthlyBreakdownDto[];
}

export interface StudentPaymentHistoryResponse {
  studentId: string;
  totalDebt: number;
  totalPaid: number;
  subscriptions: SubscriptionPaymentSummaryDto[];
}

export interface MonthlyOverviewResponse {
  month: string;
  totalStudents: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  totalExpected: number;
  totalCollected: number;
  totalDebt: number;
  students: MonthlyStudentDto[];
}

export interface MonthlyStudentDto {
  studentId: string;
  subscriptionId: string;
  expected: number;
  paid: number;
  debt: number;
  status: StudentPaymentMonthStatus;
}

export interface StudentDebtDto {
  studentId: string;
  subscriptionId: string;
  totalDebt: number;
  debtMonths: number;
  monthlyExpected: number;
}

export interface SalaryPaymentDto {
  transactionId: string;
  staffId: string;
  salaryMonth: string;
  amount: number;
  currency: string;
  paymentDate: string;
  amountChangeReasonCode?: AmountChangeReasonCode | null;
  amountChangeReasonOther?: string | null;
  notes: string | null;
  status: TransactionStatus;
  createdAt: string;
}

export interface StaffSalarySummaryDto {
  staffId: string;
  fullName: string;
  role: StaffRole;
  status: StaffStatus;
  salaryType: SalaryType;
  fixedSalary: number;
  salaryPercentage: number | null;
  activeStudentCount: number;
  percentageBaseAmount: number;
  dueAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  payments: SalaryPaymentDto[];
}

export interface SalaryOverviewDto {
  month: string;
  year: number;
  currency: string;
  totalStaff: number;
  totalDue: number;
  totalPaid: number;
  totalOutstanding: number;
  entries: StaffSalarySummaryDto[];
}

export interface SalaryMonthBreakdownDto {
  month: string;
  activeStudentCount: number;
  percentageBaseAmount: number;
  dueAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

export interface StaffSalaryHistoryDto {
  staffId: string;
  fullName: string;
  role: StaffRole;
  status: StaffStatus;
  salaryType: SalaryType;
  fixedSalary: number;
  salaryPercentage: number | null;
  totalDue: number;
  totalPaid: number;
  totalOutstanding: number;
  months: SalaryMonthBreakdownDto[];
  payments: SalaryPaymentDto[];
}

export interface CreateSalaryPaymentRequest {
  staffId: string;
  salaryMonth: string;
  amount: number;
  currency: string;
  paymentDate: string;
  amountChangeReasonCode?: AmountChangeReasonCode;
  amountChangeReasonOther?: string;
  notes?: string;
}

export type UpdateSalaryPaymentRequest = Partial<CreateSalaryPaymentRequest>;

// ─── Audit (System) ────────────────────────────────────────────

export interface SystemAuditLog {
  id: string;
  action: string;
  targetType: string;
  actorId: string;
  actorName: string | null;
  targetId: string;
  targetName: string | null;
  details: Record<string, unknown>;
  timestamp: string;
}

// ─── Payments ───────────────────────────────────────────────────

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
export type PaymentAmountChangeReasonCode = 'PARTIAL_PAYMENT' | 'DISCOUNT_APPLIED' | 'DEBT_REPAYMENT' | 'MANUAL_CORRECTION' | 'OTHER';
export type KpayInvoiceStatus = 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
export type ApiPayInvoiceStatus = 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';

export interface GenerateKpayInvoicesResponse {
  month: string;
  totalSubscriptions: number;
  generated: number;
  skipped: number;
  failed: number;
}

export interface GenerateApiPayInvoicesResponse {
  month: string;
  totalSubscriptions: number;
  generated: number;
  skipped: number;
  failed: number;
}

export interface KpayInvoiceDto {
  id: string;
  studentId: string;
  subscriptionId: string;
  paymentMonth: string;
  recipientField: ContactRecipientField;
  recipientValue: string;
  amount: number;
  currency: string;
  merchantInvoiceId: string;
  externalInvoiceId: string | null;
  paymentUrl: string | null;
  status: KpayInvoiceStatus;
  externalPaymentMethod: string | null;
  externalTransactionId: string | null;
  paidAt: string | null;
  studentPaymentId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPayInvoiceDto {
  id: string;
  studentId: string;
  subscriptionId: string;
  paymentMonth: string;
  recipientField: ContactRecipientField;
  recipientValue: string;
  amount: number;
  currency: string;
  merchantInvoiceId: string;
  externalInvoiceId: string | null;
  paymentUrl: string | null;
  status: ApiPayInvoiceStatus;
  externalPaymentMethod: string | null;
  externalTransactionId: string | null;
  paidAt: string | null;
  studentPaymentId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentPaymentDto {
  id: string;
  studentId: string;
  subscriptionId: string;
  amount: number;
  paidAt: string;
  paymentMonth: string;
  method: PaymentMethod;
  amountChangeReasonCode: PaymentAmountChangeReasonCode | null;
  amountChangeReasonOther: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateStudentPaymentRequest {
  studentId: string;
  subscriptionId: string;
  amount: number;
  paidAt: string;
  paymentMonth: string;
  method: PaymentMethod;
  amountChangeReasonCode?: PaymentAmountChangeReasonCode;
  amountChangeReasonOther?: string;
  notes?: string;
}

export type UpdateStudentPaymentRequest = Partial<CreateStudentPaymentRequest>;
