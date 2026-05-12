export const runtime = "edge";
import { z } from "zod";
import { calculateDueAmount, calculateSalaryBreakdown } from "@/utils/calculations";

export const employeeSchema = z.object({
  employeeCode: z.string().min(1),
  fingerprintId: z.string().optional().nullable().or(z.literal("")),
  name: z.string().min(1),
  designation: z.string().min(1),
  department: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  joiningDate: z.string().min(1),
  dateOfBirth: z.string().min(1),
  salary: z.coerce.number().optional().default(0),
  bloodGroup: z.string().optional().nullable().or(z.literal("")),
  guardianName: z.string().optional().nullable().or(z.literal("")),
  guardianRelation: z.string().optional().nullable().or(z.literal("")),
  guardianPhone: z.string().optional().nullable().or(z.literal("")),
  nidNumber: z.string().optional().nullable().or(z.literal("")),
  educationStatus: z.string().optional().nullable().or(z.literal("")),
  customData: z.any().optional()
});

export const holidaySchema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
  totalDays: z.coerce.number().min(1)
});

export const leaveSchema = z.object({
  employeeId: z.string().min(1),
  year: z.coerce.number().min(2000).default(new Date().getFullYear()),
  totalLeave: z.coerce.number().min(0).default(10),
  dueLeave: z.coerce.number()
});

export const loanSchema = z.object({
  employeeId: z.string().min(1),
  loanAmount: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0),
  installmentAmount: z.coerce.number().min(0),
  startMonth: z.coerce.number().min(1).max(12).optional().nullable(),
  startYear: z.coerce.number().min(2000).optional().nullable(),
  note: z.string().optional().nullable()
});

export const advanceSalarySchema = z.object({
  employeeId: z.string().min(1),
  amount: z.coerce.number().min(0),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000),
  isDeducted: z.boolean().default(false),
  note: z.string().optional().nullable()
});

export const salarySchema = z.object({
  employeeId: z.string().min(1),
  totalSalary: z.coerce.number().min(0)
});

export const monthlySalarySchema = z.object({
  employeeId: z.string().min(1),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000),
  totalSalary: z.coerce.number().min(0),
  workingDays: z.coerce.number().min(0),
  workingDaySalary: z.coerce.number().min(0),
  advanceSalaryAmount: z.coerce.number().min(0),
  loanAdjustAmount: z.coerce.number().min(0),
  payableSalary: z.coerce.number().min(0),
  festivalBonus: z.coerce.number().min(0).default(0),
  totalSalaryPaid: z.coerce.number().min(0),
  isPaid: z.boolean().default(false),
  isHeld: z.boolean().default(false)
});

export function toLoanPayload(input: z.infer<typeof loanSchema>) {
  return {
    ...input,
    dueAmount: calculateDueAmount(input.loanAmount, input.paidAmount)
  };
}

export function toSalaryPayload(input: z.infer<typeof salarySchema>, percentages?: any) {
  const b = calculateSalaryBreakdown(input.totalSalary, percentages);
  return {
    ...input,
    basicSalary: b.basicSalary,
    hra: b.hra,
    medicalAllowance: b.medicalAllowance,
    travelAllowance: b.travelAllowance,
    others: b.others,
    breakdown: b.breakdown
  };
}

export function toMonthlySalaryPayload(input: z.infer<typeof monthlySalarySchema>, percentages?: any) {
  const b = calculateSalaryBreakdown(input.totalSalary, percentages);
  return {
    ...input,
    basicSalary: b.basicSalary,
    hra: b.hra,
    medicalAllowance: b.medicalAllowance,
    travelAllowance: b.travelAllowance,
    others: b.others,
    breakdown: b.breakdown
  };
}

export const officeCostSchema = z.object({
  id: z.string().optional(),
  date: z.union([z.string(), z.date()]),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  day: z.number().int().min(1).max(31),
  payAmount: z.coerce.number().min(0).default(0),
  bazarCost: z.coerce.number().min(0).default(0),
  details: z.string().nullable().optional(),
  extraCost: z.coerce.number().min(0).default(0),
  extraDetail: z.string().nullable().optional(),
  deposit: z.coerce.number().default(0),
  recurringCost: z.coerce.number().min(0).default(0),
  recurringDetail: z.string().nullable().optional(),
  capitalCost: z.coerce.number().min(0).default(0),
  capitalDetail: z.string().nullable().optional()
});

export const costTransactionSchema = z.object({
  id: z.string().optional(),
  date: z.union([z.string(), z.date()]),
  amount: z.coerce.number().min(0),
  categoryId: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE"]),
  details: z.string().nullable().optional()
});
