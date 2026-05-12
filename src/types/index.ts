export type ModalMode = "create" | "edit" | "details" | "password";

export interface Employee {
  id: string;
  employeeCode: string;
  fingerprintId?: string | null;
  name: string;
  designation: string;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  joiningDate: string;
  dateOfBirth: string;
  status: string;
  bloodGroup?: string | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianPhone?: string | null;
  nidNumber?: string | null;
  educationStatus?: string | null;
  salaryStructure?: SalaryStructure | null;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  totalDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  year: number;
  totalLeave: number;
  dueLeave: number;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: string;
  employeeId: string;
  loanAmount: number;
  paidAmount: number;
  dueAmount: number;
  installmentAmount: number;
  startMonth?: number | null;
  startYear?: number | null;
  note?: string | null;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface AdvanceSalary {
  id: string;
  employeeId: string;
  amount: number;
  month: number;
  year: number;
  isDeducted: boolean;
  note?: string | null;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  totalSalary: number;
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  travelAllowance: number;
  others: number;
  festivalBonus: number;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlySalary {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  totalSalary: number;
  workingDays: number;
  workingDaySalary: number;
  advanceSalaryAmount: number;
  loanAdjustAmount: number;
  payableSalary: number;
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  travelAllowance: number;
  others: number;
  festivalBonus: number;
  totalSalaryPaid: number;
  isPaid: boolean;
  isHeld: boolean;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface OfficeCost {
  id: string;
  date: string;
  month: number;
  year: number;
  day: number;
  payAmount: number;
  bazarCost: number;
  details?: string | null;
  extraCost: number;
  extraDetail?: string | null;
  deposit: number;
  recurringCost: number;
  recurringDetail?: string | null;
  capitalCost: number;
  capitalDetail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalEmployees: number;
  birthdaysThisMonth: number;
  anniversariesThisMonth: number;
  holidaysThisMonth: number;
  salaryExpenseSummary: number;
  pendingLeaves: number;
  pendingLoans: number;
  currentMonthOfficeCost: number;
  birthdayEmployees: Array<{ id: string; name: string; date: string }>;
  anniversaryEmployees: Array<{ id: string; name: string; date: string }>;
  expenseChart: Array<{ name: string; amount: number }>;
  attendanceToday: {
    present: number;
    absent: number;
    late: number;
    onLeave: number;
  };
}
