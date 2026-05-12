export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import {
  employees,
  salaryStructures,
  leaveBalances,
  advanceSalaries,
  loans,
} from "@/lib/db/schema";
import { eq, and, or, lt, lte, isNull, gt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (!employeeId || !month || !year) {
    return NextResponse.json({ message: "Missing required parameters" }, { status: 400 });
  }

  try {
    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);

    const db = await getTenantDb();

    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .get();

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const structure = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.employeeId, employeeId))
      .get();

    const totalSalary = structure?.totalSalary || 0;

    // Working days based on due leaves (negative means overused)
    const empLeaveBalances = await db
      .select()
      .from(leaveBalances)
      .where(eq(leaveBalances.employeeId, employeeId));

    const leaveBalance = empLeaveBalances.find(lb => lb.year === parsedYear);
    const dueLeave = leaveBalance?.dueLeave || 0;
    const workingDays = dueLeave < 0 ? 30 + dueLeave : 30;
    const workingDaySalary = (totalSalary / 30) * workingDays;

    // Advance Salary deduction
    const advances = await db
      .select()
      .from(advanceSalaries)
      .where(
        and(
          eq(advanceSalaries.employeeId, employeeId),
          eq(advanceSalaries.month, parsedMonth),
          eq(advanceSalaries.year, parsedYear),
          eq(advanceSalaries.isDeducted, false)
        )
      );
    let advanceSalaryAmount = advances.reduce((sum, adv) => sum + adv.amount, 0);

    // Loan adjustment deduction
    const empLoans = await db
      .select()
      .from(loans)
      .where(
        and(
          eq(loans.employeeId, employeeId),
          gt(loans.dueAmount, 0),
          or(
            isNull(loans.startYear),
            lt(loans.startYear, parsedYear),
            and(eq(loans.startYear, parsedYear), lte(loans.startMonth, parsedMonth)),
            and(eq(loans.startYear, parsedYear), isNull(loans.startMonth))
          )
        )
      );

    let baseLoanAdjustAmount = empLoans.reduce((sum, loan) => {
      return sum + Math.min(loan.installmentAmount, loan.dueAmount);
    }, 0);

    const festivalBonus = structure?.festivalBonus || 0;
    const availableTotal = workingDaySalary + festivalBonus;

    let loanAdjustAmount = 0;
    let advanceSalaryAmountFinal = 0;

    if (baseLoanAdjustAmount <= availableTotal) {
      loanAdjustAmount = baseLoanAdjustAmount;
      const remainingAvailable = availableTotal - baseLoanAdjustAmount;
      advanceSalaryAmountFinal = Math.min(advanceSalaryAmount, remainingAvailable);
    } else {
      loanAdjustAmount = availableTotal;
      advanceSalaryAmountFinal = 0;
    }

    advanceSalaryAmount = advanceSalaryAmountFinal;

    const leaveDeductionAmount = Math.max(0, totalSalary - workingDaySalary);
    const payableSalary = availableTotal - loanAdjustAmount - advanceSalaryAmount;

    return NextResponse.json({
      totalSalary,
      workingDays,
      workingDaySalary,
      advanceSalaryAmount,
      loanAdjustAmount,
      leaveDeductionAmount,
      festivalBonus,
      payableSalary,
    });
  } catch (error) {
    return NextResponse.json({ message: "Failed to calculate figures", error }, { status: 500 });
  }
}
