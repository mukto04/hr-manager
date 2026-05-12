import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const employees = sqliteTable("Employee", {
  id: text("id").primaryKey(),
  employeeCode: text("employeeCode").notNull().unique(),
  fingerprintId: text("fingerprintId"),
  name: text("name").notNull(),
  designation: text("designation").notNull(),
  department: text("department"),
  email: text("email").unique(),
  phone: text("phone"),
  joiningDate: text("joiningDate").notNull(),
  dateOfBirth: text("dateOfBirth").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  bloodGroup: text("bloodGroup"),
  guardianName: text("guardianName"),
  guardianRelation: text("guardianRelation"),
  guardianPhone: text("guardianPhone"),
  nidNumber: text("nidNumber"),
  educationStatus: text("educationStatus"),
  password: text("password").notNull().default("appdevs123456"),
  securityPin: text("securityPin"),
  image: text("image"),
  customData: text("customData", { mode: "json" }).$type<Record<string, any>>(),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("Employee_fingerprintId_idx").on(t.fingerprintId),
]);

export const notices = sqliteTable("Notice", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  image: text("image"),
  file: text("file"),
  author: text("author").notNull().default("HR Department"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
});

export const notifications = sqliteTable("Notification", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("NOTICE"),
  isRead: integer("isRead", { mode: "boolean" }).notNull().default(false),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("Notification_employeeId_idx").on(t.employeeId),
]);

export const holidays = sqliteTable("Holiday", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  totalDays: integer("totalDays").notNull().default(1),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
});

export const leaveBalances = sqliteTable("LeaveBalance", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  year: integer("year").notNull(),
  totalLeave: real("totalLeave").notNull().default(0),
  dueLeave: real("dueLeave").notNull().default(0),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  uniqueIndex("LeaveBalance_employeeId_year_key").on(t.employeeId, t.year),
  index("LeaveBalance_employeeId_idx").on(t.employeeId),
]);

export const leaveRecords = sqliteTable("LeaveRecord", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  date: text("date").notNull(),
  toDate: text("toDate"),
  amount: real("amount").notNull(),
  type: text("type").notNull().default("DEDUCTION"),
  category: text("category").notNull().default("MANUAL"),
  note: text("note"),
  year: integer("year").notNull(),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("LeaveRecord_employeeId_year_idx").on(t.employeeId, t.year),
]);

export const loans = sqliteTable("Loan", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  loanAmount: real("loanAmount").notNull(),
  paidAmount: real("paidAmount").notNull(),
  dueAmount: real("dueAmount").notNull(),
  installmentAmount: real("installmentAmount").notNull().default(0),
  startMonth: integer("startMonth"),
  startYear: integer("startYear"),
  note: text("note"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("Loan_employeeId_idx").on(t.employeeId),
]);

export const advanceSalaries = sqliteTable("AdvanceSalary", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  amount: real("amount").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  isDeducted: integer("isDeducted", { mode: "boolean" }).notNull().default(false),
  note: text("note"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("AdvanceSalary_employeeId_idx").on(t.employeeId),
]);

export const salaryStructures = sqliteTable("SalaryStructure", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull().unique(),
  totalSalary: real("totalSalary").notNull(),
  basicSalary: real("basicSalary").notNull(),
  hra: real("hra").notNull(),
  medicalAllowance: real("medicalAllowance").notNull(),
  travelAllowance: real("travelAllowance").notNull(),
  others: real("others").notNull(),
  festivalBonus: real("festivalBonus").notNull(),
  breakdown: text("breakdown", { mode: "json" }).$type<Record<string, any>>(),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
});

export const monthlySalaries = sqliteTable("MonthlySalary", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalSalary: real("totalSalary").notNull(),
  workingDays: real("workingDays").notNull().default(30),
  workingDaySalary: real("workingDaySalary").notNull(),
  advanceSalaryAmount: real("advanceSalaryAmount").notNull().default(0),
  loanAdjustAmount: real("loanAdjustAmount").notNull().default(0),
  leaveDeductionAmount: real("leaveDeductionAmount").notNull().default(0),
  payableSalary: real("payableSalary").notNull().default(0),
  basicSalary: real("basicSalary").notNull(),
  hra: real("hra").notNull(),
  medicalAllowance: real("medicalAllowance").notNull(),
  travelAllowance: real("travelAllowance").notNull(),
  others: real("others").notNull(),
  festivalBonus: real("festivalBonus").notNull(),
  totalSalaryPaid: real("totalSalaryPaid").notNull(),
  isPaid: integer("isPaid", { mode: "boolean" }).notNull().default(false),
  isHeld: integer("isHeld", { mode: "boolean" }).notNull().default(false),
  breakdown: text("breakdown", { mode: "json" }).$type<Record<string, any>>(),
  advanceSalary: real("advanceSalary").default(0),
  loanAdjust: real("loanAdjust").default(0),
  status: text("status").default("PENDING"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  uniqueIndex("MonthlySalary_employeeId_month_year_key").on(t.employeeId, t.month, t.year),
  index("MonthlySalary_employeeId_idx").on(t.employeeId),
]);

export const officeCosts = sqliteTable("OfficeCost", {
  id: text("id").primaryKey(),
  date: text("date").notNull().unique(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  day: integer("day").notNull(),
  payAmount: real("payAmount").notNull().default(0),
  bazarCost: real("bazarCost").notNull().default(0),
  details: text("details"),
  extraCost: real("extraCost").notNull().default(0),
  extraDetail: text("extraDetail"),
  deposit: real("deposit").notNull().default(0),
  recurringCost: real("recurringCost").notNull().default(0),
  recurringDetail: text("recurringDetail"),
  capitalCost: real("capitalCost").notNull().default(0),
  capitalDetail: text("capitalDetail"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  uniqueIndex("OfficeCost_month_year_day_key").on(t.month, t.year, t.day),
]);

export const costCategories = sqliteTable("CostCategory", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull().default("EXPENSE"),
  color: text("color").default("#64748b"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
});

export const costTransactions = sqliteTable("CostTransaction", {
  id: text("id").primaryKey(),
  date: text("date").notNull().default(now),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  amount: real("amount").notNull(),
  type: text("type").notNull().default("EXPENSE"),
  categoryId: text("categoryId").notNull(),
  details: text("details"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("CostTransaction_month_year_idx").on(t.month, t.year),
  index("CostTransaction_categoryId_idx").on(t.categoryId),
]);

export const attendances = sqliteTable("Attendance", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  date: text("date").notNull(),
  checkIn: text("checkIn"),
  checkOut: text("checkOut"),
  status: text("status").notNull().default("PRESENT"),
  isManual: integer("isManual", { mode: "boolean" }).notNull().default(false),
  note: text("note"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  uniqueIndex("Attendance_employeeId_date_key").on(t.employeeId, t.date),
  index("Attendance_date_idx").on(t.date),
]);

export const breakRecords = sqliteTable("BreakRecord", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  attendanceId: text("attendanceId"),
  date: text("date").notNull(),
  startTime: text("startTime").notNull(),
  endTime: text("endTime"),
  duration: integer("duration").notNull().default(0),
  note: text("note"),
  status: text("status").default("COMPLETED"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("BreakRecord_employeeId_date_idx").on(t.employeeId, t.date),
  index("BreakRecord_attendanceId_idx").on(t.attendanceId),
]);

export const breakRequests = sqliteTable("BreakRequest", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  date: text("date").notNull(),
  startTime: text("startTime").notNull(),
  endTime: text("endTime").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("PENDING"),
  hrNote: text("hrNote"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("BreakRequest_employeeId_idx").on(t.employeeId),
  index("BreakRequest_status_idx").on(t.status),
]);

export const attendanceRequests = sqliteTable("AttendanceRequest", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  date: text("date").notNull(),
  checkIn: text("checkIn"),
  checkOut: text("checkOut"),
  reason: text("reason").notNull(),
  attachment: text("attachment"),
  status: text("status").notNull().default("PENDING"),
  hrNote: text("hrNote"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("AttendanceRequest_employeeId_idx").on(t.employeeId),
  index("AttendanceRequest_status_idx").on(t.status),
]);

export const tenants = sqliteTable("Tenant", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  companyName: text("companyName").notNull(),
  dbUrl: text("dbUrl").notNull(),
  planName: text("planName").default("Starter"),
  permissions: text("permissions", { mode: "json" }).$type<Record<string, any>>(),
  employeeLimit: integer("employeeLimit").notNull().default(50),
  status: text("status").notNull().default("ACTIVE"),
  adminUsername: text("adminUsername").notNull(),
  adminPassword: text("adminPassword").notNull(),
  securityPin: text("securityPin"),
  subscriptionStart: text("subscriptionStart"),
  subscriptionEnd: text("subscriptionEnd"),
  createdAt: text("createdAt").notNull().default(now),
});

export const attendanceDevices = sqliteTable("AttendanceDevice", {
  id: text("id").primaryKey(),
  deviceName: text("deviceName").notNull(),
  serialNumber: text("serialNumber").unique(),
  ipAddress: text("ipAddress"),
  port: integer("port").notNull().default(4370),
  status: text("status").notNull().default("DISCONNECTED"),
  lastSync: text("lastSync"),
  lastSeen: text("lastSeen"),
  description: text("description"),
  apiKey: text("apiKey").unique(),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
});

export const tenantSettings = sqliteTable("TenantSettings", {
  id: text("id").primaryKey(),
  defaultInTime: text("defaultInTime").notNull().default("09:00 AM"),
  defaultOutTime: text("defaultOutTime").notNull().default("06:00 PM"),
  lateThresholdTime: text("lateThresholdTime").notNull().default("09:15 AM"),
  avgRequestTime: text("avgRequestTime").notNull().default("09:00 AM"),
  googleSheetUrl: text("googleSheetUrl"),
  halfDayThreshold: integer("halfDayThreshold").notNull().default(420),
  fullDayThreshold: integer("fullDayThreshold").notNull().default(540),
  weeklySchedule: text("weeklySchedule", { mode: "json" }).$type<any[]>(),
  salaryStructure: text("salaryStructure", { mode: "json" }).$type<Record<string, any>>(),
  employeeFieldsConfig: text("employeeFieldsConfig", { mode: "json" }).$type<Record<string, any>>(),
  customFields: text("customFields", { mode: "json" }).$type<any[]>(),
  autoLeaveDeduction: integer("autoLeaveDeduction", { mode: "boolean" }).notNull().default(true),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
});

export const landingPageContents = sqliteTable("LandingPageContent", {
  id: text("id").primaryKey(),
  section: text("section").notNull().unique(),
  content: text("content", { mode: "json" }).notNull().$type<Record<string, any>>(),
  updatedAt: text("updatedAt").notNull().default(now),
});

export const masterAdmins = sqliteTable("MasterAdmin", {
  id: text("id").primaryKey(),
  password: text("password").notNull().default("superadmin123"),
  loginTitle: text("loginTitle").default("AppDevs HR Master Access"),
  loginSub: text("loginSub").default("Restricted to AppDevs Administrators only."),
  country: text("country").default("Bangladesh"),
  currencySymbol: text("currencySymbol").default("৳"),
  timezone: text("timezone").default("Asia/Dhaka"),
  language: text("language").default("en"),
  updatedAt: text("updatedAt").notNull().default(now),
});

export const notes = sqliteTable("Note", {
  id: text("id").primaryKey(),
  title: text("title"),
  content: text("content").notNull(),
  isPinned: integer("isPinned", { mode: "boolean" }).notNull().default(false),
  color: text("color").default("white"),
  order: integer("order").notNull().default(0),
  reminderAt: text("reminderAt"),
  isReminderNotified: integer("isReminderNotified", { mode: "boolean" }).notNull().default(false),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
});

export const loanRequests = sqliteTable("LoanRequest", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  requestedAmount: real("requestedAmount").notNull(),
  installmentAmount: real("installmentAmount").default(0),
  startMonth: integer("startMonth"),
  startYear: integer("startYear"),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("PENDING"),
  hrNote: text("hrNote"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("LoanRequest_employeeId_idx").on(t.employeeId),
  index("LoanRequest_status_idx").on(t.status),
]);

export const advanceSalaryRequests = sqliteTable("AdvanceSalaryRequest", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  requestedAmount: real("requestedAmount").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("PENDING"),
  hrNote: text("hrNote"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("AdvanceSalaryRequest_employeeId_idx").on(t.employeeId),
  index("AdvanceSalaryRequest_status_idx").on(t.status),
]);

export const leaveRequests = sqliteTable("LeaveRequest", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  fromDate: text("fromDate").notNull(),
  toDate: text("toDate").notNull(),
  days: real("days").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("PENDING"),
  hrNote: text("hrNote"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("LeaveRequest_employeeId_idx").on(t.employeeId),
  index("LeaveRequest_status_idx").on(t.status),
]);

export const admsLogs = sqliteTable("AdmsLog", {
  id: text("id").primaryKey(),
  sn: text("sn"),
  table: text("table"),
  path: text("path"),
  body: text("body"),
  method: text("method"),
  createdAt: text("createdAt").notNull().default(now),
});

export const salaryIncrements = sqliteTable("SalaryIncrement", {
  id: text("id").primaryKey(),
  employeeId: text("employeeId").notNull(),
  amount: real("amount").notNull(),
  percentage: real("percentage"),
  type: text("type").notNull(),
  oldSalary: real("oldSalary").notNull(),
  newSalary: real("newSalary").notNull(),
  effectiveMonth: integer("effectiveMonth").notNull(),
  effectiveYear: integer("effectiveYear").notNull(),
  note: text("note"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("SalaryIncrement_employeeId_idx").on(t.employeeId),
]);

export const projects = sqliteTable("Project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"),
  startDate: text("startDate"),
  endDate: text("endDate"),
  totalAmount: real("totalAmount").notNull().default(0),
  status: text("status").notNull().default("PLANNED"),
  description: text("description"),
  clientSource: text("clientSource"),
  projectManagerId: text("projectManagerId"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
});

export const projectMembers = sqliteTable("ProjectMember", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  employeeId: text("employeeId").notNull(),
  role: text("role").notNull().default("Member"),
  assignedAt: text("assignedAt").notNull().default(now),
}, (t) => [
  uniqueIndex("ProjectMember_projectId_employeeId_key").on(t.projectId, t.employeeId),
  index("ProjectMember_projectId_idx").on(t.projectId),
  index("ProjectMember_employeeId_idx").on(t.employeeId),
]);

export const projectPayments = sqliteTable("ProjectPayment", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull().default(now),
  method: text("method").notNull().default("Bank"),
  reference: text("reference"),
  note: text("note"),
  createdAt: text("createdAt").notNull().default(now),
  updatedAt: text("updatedAt").notNull().default(now),
}, (t) => [
  index("ProjectPayment_projectId_idx").on(t.projectId),
]);

export const projectWorkLogs = sqliteTable("ProjectWorkLog", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  employeeId: text("employeeId").notNull(),
  phase: text("phase").notNull(),
  hours: real("hours").notNull(),
  date: text("date").notNull().default(now),
  note: text("note"),
  createdAt: text("createdAt").notNull().default(now),
}, (t) => [
  index("ProjectWorkLog_projectId_idx").on(t.projectId),
  index("ProjectWorkLog_employeeId_idx").on(t.employeeId),
]);

export type Employee = typeof employees.$inferSelect;
export type Notice = typeof notices.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type TenantSettings = typeof tenantSettings.$inferSelect;
export type MonthlySalary = typeof monthlySalaries.$inferSelect;
export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type AdvanceSalary = typeof advanceSalaries.$inferSelect;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type LeaveRecord = typeof leaveRecords.$inferSelect;
export type Project = typeof projects.$inferSelect;
