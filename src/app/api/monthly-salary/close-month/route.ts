export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import {
  employees,
  salaryStructures,
  monthlySalaries,
  advanceSalaries,
  loans,
  leaveBalances,
  tenantSettings,
} from "@/lib/db/schema";
import { eq, and, or, lt, lte, isNull, gt, inArray } from "drizzle-orm";
import { calculateSalaryBreakdown } from "@/utils/calculations";

export async function POST(request: NextRequest) {
  try {
    const { month, year } = (await request.json()) as any;

    if (!month || !year) {
      return NextResponse.json({ message: "month and year are required" }, { status: 400 });
    }

    // Calculate next month and year
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    const db = await getTenantDb();

    // Get all active employees with their salary structure
    const allActiveEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.status, "ACTIVE"));

    const allStructures = await db.select().from(salaryStructures);
    const structureMap = Object.fromEntries(allStructures.map(s => [s.employeeId, s]));

    // Get current month salary records
    const currentMonthSalaries = await db
      .select()
      .from(monthlySalaries)
      .where(and(eq(monthlySalaries.month, month), eq(monthlySalaries.year, year)));
    const currentSalaryMap = Object.fromEntries(currentMonthSalaries.map(s => [s.employeeId, s]));

    // Get all leave balances for the year
    const empIds = allActiveEmployees.map(e => e.id);
    const allLeaveBalances = empIds.length
      ? await db
          .select()
          .from(leaveBalances)
          .where(and(inArray(leaveBalances.employeeId, empIds), eq(leaveBalances.year, year)))
      : [];
    const leaveBalanceMap = Object.fromEntries(allLeaveBalances.map(lb => [lb.employeeId, lb]));

    // Get next month existing records (idempotency check)
    const nextMonthExisting = await db
      .select()
      .from(monthlySalaries)
      .where(and(eq(monthlySalaries.month, nextMonth), eq(monthlySalaries.year, nextYear)));
    const nextMonthExistingIds = new Set(nextMonthExisting.map(r => r.employeeId));

    const settings = await db.select().from(tenantSettings).limit(1).get();

    for (const emp of allActiveEmployees) {
      const ms = currentSalaryMap[emp.id];

      // IDEMPOTENCY GUARD: If next month record already exists, skip
      if (nextMonthExistingIds.has(emp.id)) continue;

      if (ms && !ms.isHeld) {
        // 1. Mark as paid
        await db
          .update(monthlySalaries)
          .set({ isPaid: true, updatedAt: now() })
          .where(eq(monthlySalaries.id, ms.id));

        // 2. Deduct loan installments — update loan paid/due amounts
        if (ms.loanAdjustAmount > 0) {
          const empLoans = await db
            .select()
            .from(loans)
            .where(
              and(
                eq(loans.employeeId, ms.employeeId),
                gt(loans.dueAmount, 0),
                or(
                  isNull(loans.startYear),
                  lt(loans.startYear, year),
                  and(eq(loans.startYear, year), lte(loans.startMonth, month)),
                  and(eq(loans.startYear, year), isNull(loans.startMonth))
                )
              )
            );

          for (const loan of empLoans) {
            const deduction = Math.min(loan.installmentAmount, loan.dueAmount);
            if (deduction > 0) {
              const newPaid = loan.paidAmount + deduction;
              const newDue = Math.max(0, loan.dueAmount - deduction);
              await db
                .update(loans)
                .set({
                  paidAmount: newPaid,
                  dueAmount: newDue,
                  installmentAmount: newDue <= 0 ? 0 : loan.installmentAmount,
                  updatedAt: now(),
                })
                .where(eq(loans.id, loan.id));
            }
          }
        }

        // 3. Mark advance salaries as deducted
        if (ms.advanceSalaryAmount > 0) {
          await db
            .update(advanceSalaries)
            .set({ isDeducted: true, updatedAt: now() })
            .where(
              and(
                eq(advanceSalaries.employeeId, emp.id),
                eq(advanceSalaries.month, month),
                eq(advanceSalaries.year, year),
                eq(advanceSalaries.isDeducted, false)
              )
            );
        }
      }

      // 4. Reset negative leave balances back to 0 for this year
      const leaveBalance = leaveBalanceMap[emp.id];
      if (leaveBalance && leaveBalance.dueLeave < 0) {
        await db
          .update(leaveBalances)
          .set({ dueLeave: 0, updatedAt: now() })
          .where(eq(leaveBalances.id, leaveBalance.id));
      }

      // 5. Create next month salary record
      const structure = structureMap[emp.id];
      if (structure && ms) {
        const totalSalary = structure.totalSalary;
        const { festivalBonus, ...breakdownFields } = calculateSalaryBreakdown(
          totalSalary,
          settings?.salaryStructure as any[] | undefined
        );
        const workingDaySalary = (totalSalary / 30) * 30;

        // Check advance salary for next month
        const nextAdvances = await db
          .select()
          .from(advanceSalaries)
          .where(
            and(
              eq(advanceSalaries.employeeId, ms.employeeId),
              eq(advanceSalaries.month, nextMonth),
              eq(advanceSalaries.year, nextYear),
              eq(advanceSalaries.isDeducted, false)
            )
          );
        const nextAdvanceAmount = nextAdvances.reduce((s, a) => s + a.amount, 0);

        // Check loan installments for next month
        const activeLoans = await db
          .select()
          .from(loans)
          .where(
            and(
              eq(loans.employeeId, ms.employeeId),
              gt(loans.dueAmount, 0),
              or(
                isNull(loans.startYear),
                lt(loans.startYear, nextYear),
                and(eq(loans.startYear, nextYear), lte(loans.startMonth, nextMonth)),
                and(eq(loans.startYear, nextYear), isNull(loans.startMonth))
              )
            )
          );
        const nextLoanAdjust = activeLoans.reduce(
          (s, l) => s + Math.min(l.installmentAmount, l.dueAmount),
          0
        );

        const payableSalary = workingDaySalary - nextAdvanceAmount - nextLoanAdjust;

        await db.insert(monthlySalaries).values({
          id: newId(),
          employeeId: emp.id,
          month: nextMonth,
          year: nextYear,
          totalSalary,
          ...breakdownFields,
          festivalBonus: structure.festivalBonus || 0,
          workingDays: 30,
          workingDaySalary,
          advanceSalaryAmount: nextAdvanceAmount,
          loanAdjustAmount: nextLoanAdjust,
          leaveDeductionAmount: 0,
          advanceSalary: 0,
          loanAdjust: 0,
          payableSalary,
          totalSalaryPaid: payableSalary,
          isPaid: false,
          isHeld: false,
          createdAt: now(),
          updatedAt: now(),
        });
      }
    }

    const monthNames: Record<number, string> = {
      1: "January", 2: "February", 3: "March", 4: "April",
      5: "May", 6: "June", 7: "July", 8: "August",
      9: "September", 10: "October", 11: "November", 12: "December",
    };

    return NextResponse.json({
      message: `${monthNames[month]} ${year} has been closed successfully. ${monthNames[nextMonth]} ${nextYear} salary records have been generated.`,
    });
  } catch (error) {
    console.error("Close Month Error:", error);
    return NextResponse.json(
      { message: "Failed to close month", error: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
