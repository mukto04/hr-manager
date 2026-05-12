CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeCode" TEXT NOT NULL,
    "fingerprintId" TEXT,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "joiningDate" DATETIME NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "bloodGroup" TEXT,
    "guardianName" TEXT,
    "guardianRelation" TEXT,
    "guardianPhone" TEXT,
    "nidNumber" TEXT,
    "educationStatus" TEXT,
    "password" TEXT NOT NULL DEFAULT 'appdevs123456',
    "securityPin" TEXT,
    "image" TEXT,
    "customData" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Notice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "file" TEXT,
    "author" TEXT NOT NULL DEFAULT 'HR Department',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NOTICE',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "totalDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalLeave" REAL NOT NULL DEFAULT 0,
    "dueLeave" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LeaveRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "toDate" DATETIME,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'DEDUCTION',
    "category" TEXT NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,
    "year" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "loanAmount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL,
    "dueAmount" REAL NOT NULL,
    "installmentAmount" REAL NOT NULL DEFAULT 0,
    "startMonth" INTEGER,
    "startYear" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AdvanceSalary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isDeducted" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdvanceSalary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SalaryStructure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "totalSalary" REAL NOT NULL,
    "basicSalary" REAL NOT NULL,
    "hra" REAL NOT NULL,
    "medicalAllowance" REAL NOT NULL,
    "travelAllowance" REAL NOT NULL,
    "others" REAL NOT NULL,
    "festivalBonus" REAL NOT NULL,
    "breakdown" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MonthlySalary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalSalary" REAL NOT NULL,
    "workingDays" REAL NOT NULL DEFAULT 30,
    "workingDaySalary" REAL NOT NULL,
    "advanceSalaryAmount" REAL NOT NULL DEFAULT 0,
    "loanAdjustAmount" REAL NOT NULL DEFAULT 0,
    "leaveDeductionAmount" REAL NOT NULL DEFAULT 0,
    "payableSalary" REAL NOT NULL DEFAULT 0,
    "basicSalary" REAL NOT NULL,
    "hra" REAL NOT NULL,
    "medicalAllowance" REAL NOT NULL,
    "travelAllowance" REAL NOT NULL,
    "others" REAL NOT NULL,
    "festivalBonus" REAL NOT NULL,
    "totalSalaryPaid" REAL NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "isHeld" BOOLEAN NOT NULL DEFAULT false,
    "breakdown" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonthlySalary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "OfficeCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "payAmount" REAL NOT NULL DEFAULT 0,
    "bazarCost" REAL NOT NULL DEFAULT 0,
    "details" TEXT,
    "extraCost" REAL NOT NULL DEFAULT 0,
    "extraDetail" TEXT,
    "deposit" REAL NOT NULL DEFAULT 0,
    "recurringCost" REAL NOT NULL DEFAULT 0,
    "recurringDetail" TEXT,
    "capitalCost" REAL NOT NULL DEFAULT 0,
    "capitalDetail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "CostCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EXPENSE',
    "color" TEXT DEFAULT '#64748b',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "CostTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EXPENSE',
    "categoryId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CostCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "checkIn" DATETIME,
    "checkOut" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BreakRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "date" DATETIME NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "status" TEXT DEFAULT 'COMPLETED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BreakRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BreakRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "hrNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BreakRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AttendanceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "checkIn" DATETIME,
    "checkOut" DATETIME,
    "reason" TEXT NOT NULL,
    "attachment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "hrNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AttendanceRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "dbUrl" TEXT NOT NULL,
    "planName" TEXT DEFAULT 'Starter',
    "permissions" JSON,
    "employeeLimit" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "adminUsername" TEXT NOT NULL,
    "adminPassword" TEXT NOT NULL,
    "securityPin" TEXT,
    "subscriptionStart" DATETIME,
    "subscriptionEnd" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AttendanceDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "ipAddress" TEXT,
    "port" INTEGER NOT NULL DEFAULT 4370,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "lastSync" DATETIME,
    "lastSeen" DATETIME,
    "description" TEXT,
    "apiKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "TenantSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defaultInTime" TEXT NOT NULL DEFAULT '09:00 AM',
    "defaultOutTime" TEXT NOT NULL DEFAULT '06:00 PM',
    "lateThresholdTime" TEXT NOT NULL DEFAULT '09:15 AM',
    "avgRequestTime" TEXT NOT NULL DEFAULT '09:00 AM',
    "googleSheetUrl" TEXT,
    "halfDayThreshold" INTEGER NOT NULL DEFAULT 420,
    "fullDayThreshold" INTEGER NOT NULL DEFAULT 540,
    "weeklySchedule" JSON,
    "salaryStructure" JSON,
    "employeeFieldsConfig" JSON,
    "customFields" JSON,
    "autoLeaveDeduction" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "LandingPageContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "section" TEXT NOT NULL,
    "content" JSON NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "MasterAdmin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "password" TEXT NOT NULL DEFAULT 'superadmin123',
    "loginTitle" TEXT DEFAULT 'AppDevs HR Master Access',
    "loginSub" TEXT DEFAULT 'Restricted to AppDevs Administrators only.',
    "country" TEXT DEFAULT 'Bangladesh',
    "currencySymbol" TEXT DEFAULT 'αº│',
    "timezone" TEXT DEFAULT 'Asia/Dhaka',
    "language" TEXT DEFAULT 'en',
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT DEFAULT 'white',
    "order" INTEGER NOT NULL DEFAULT 0,
    "reminderAt" DATETIME,
    "isReminderNotified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "LoanRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "requestedAmount" REAL NOT NULL,
    "installmentAmount" REAL DEFAULT 0,
    "startMonth" INTEGER,
    "startYear" INTEGER,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "hrNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoanRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AdvanceSalaryRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "requestedAmount" REAL NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "hrNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdvanceSalaryRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "fromDate" DATETIME NOT NULL,
    "toDate" DATETIME NOT NULL,
    "days" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "hrNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AdmsLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sn" TEXT,
    "table" TEXT,
    "path" TEXT,
    "body" TEXT,
    "method" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SalaryIncrement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "percentage" REAL,
    "type" TEXT NOT NULL,
    "oldSalary" REAL NOT NULL,
    "newSalary" REAL NOT NULL,
    "effectiveMonth" INTEGER NOT NULL,
    "effectiveYear" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalaryIncrement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "description" TEXT,
    "clientSource" TEXT,
    "projectManagerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Member',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'Bank',
    "reference" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProjectWorkLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectWorkLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectWorkLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

CREATE INDEX "Employee_fingerprintId_idx" ON "Employee"("fingerprintId");

CREATE INDEX "Notification_employeeId_idx" ON "Notification"("employeeId");

CREATE INDEX "LeaveBalance_employeeId_idx" ON "LeaveBalance"("employeeId");

CREATE UNIQUE INDEX "LeaveBalance_employeeId_year_key" ON "LeaveBalance"("employeeId", "year");

CREATE INDEX "LeaveRecord_employeeId_year_idx" ON "LeaveRecord"("employeeId", "year");

CREATE INDEX "Loan_employeeId_idx" ON "Loan"("employeeId");

CREATE INDEX "AdvanceSalary_employeeId_idx" ON "AdvanceSalary"("employeeId");

CREATE UNIQUE INDEX "SalaryStructure_employeeId_key" ON "SalaryStructure"("employeeId");

CREATE INDEX "MonthlySalary_employeeId_idx" ON "MonthlySalary"("employeeId");

CREATE UNIQUE INDEX "MonthlySalary_employeeId_month_year_key" ON "MonthlySalary"("employeeId", "month", "year");

CREATE UNIQUE INDEX "OfficeCost_date_key" ON "OfficeCost"("date");

CREATE UNIQUE INDEX "OfficeCost_month_year_day_key" ON "OfficeCost"("month", "year", "day");

CREATE UNIQUE INDEX "CostCategory_name_key" ON "CostCategory"("name");

CREATE INDEX "CostTransaction_month_year_idx" ON "CostTransaction"("month", "year");

CREATE INDEX "CostTransaction_categoryId_idx" ON "CostTransaction"("categoryId");

CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

CREATE INDEX "BreakRecord_employeeId_date_idx" ON "BreakRecord"("employeeId", "date");

CREATE INDEX "BreakRecord_attendanceId_idx" ON "BreakRecord"("attendanceId");

CREATE INDEX "BreakRequest_employeeId_idx" ON "BreakRequest"("employeeId");

CREATE INDEX "BreakRequest_status_idx" ON "BreakRequest"("status");

CREATE INDEX "AttendanceRequest_employeeId_idx" ON "AttendanceRequest"("employeeId");

CREATE INDEX "AttendanceRequest_status_idx" ON "AttendanceRequest"("status");

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

CREATE UNIQUE INDEX "AttendanceDevice_serialNumber_key" ON "AttendanceDevice"("serialNumber");

CREATE UNIQUE INDEX "AttendanceDevice_apiKey_key" ON "AttendanceDevice"("apiKey");

CREATE UNIQUE INDEX "LandingPageContent_section_key" ON "LandingPageContent"("section");

CREATE INDEX "LoanRequest_employeeId_idx" ON "LoanRequest"("employeeId");

CREATE INDEX "LoanRequest_status_idx" ON "LoanRequest"("status");

CREATE INDEX "AdvanceSalaryRequest_employeeId_idx" ON "AdvanceSalaryRequest"("employeeId");

CREATE INDEX "AdvanceSalaryRequest_status_idx" ON "AdvanceSalaryRequest"("status");

CREATE INDEX "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");

CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

CREATE INDEX "SalaryIncrement_employeeId_idx" ON "SalaryIncrement"("employeeId");

CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

CREATE INDEX "ProjectMember_employeeId_idx" ON "ProjectMember"("employeeId");

CREATE UNIQUE INDEX "ProjectMember_projectId_employeeId_key" ON "ProjectMember"("projectId", "employeeId");

CREATE INDEX "ProjectPayment_projectId_idx" ON "ProjectPayment"("projectId");

CREATE INDEX "ProjectWorkLog_projectId_idx" ON "ProjectWorkLog"("projectId");

CREATE INDEX "ProjectWorkLog_employeeId_idx" ON "ProjectWorkLog"("employeeId");


