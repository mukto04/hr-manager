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
import { eq, and, inArray, or, lt, lte, isNull, gt } from "drizzle-orm";
import { monthlySalarySchema, toMonthlySalaryPayload } from "@/app/api/_helpers";
import { calculateSalaryBreakdown } from "@/utils/calculations";

export async function GET() {
  try {
    const db = await getTenantDb();

    // Get current month/year in BDT (UTC+6)
    const bdtNow = new Date(new Date().getTime() + 6 * 60 * 60 * 1000);
    const currentMonth = bdtNow.getUTCMonth() + 1;
    const currentYear = bdtNow.getUTCFullYear();

    // 1. Ensure all active employees with salary structure have a record for the current month
    const allEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.status, "ACTIVE"));

    const allSalaryStructures = await db.select().from(salaryStructures);
    const structureMap = Object.fromEntries(allSalaryStructures.map(s => [s.employeeId, s]));

    const currentMonthRecords = await db
      .select()
      .from(monthlySalaries)
      .where(and(eq(monthlySalaries.month, currentMonth), eq(monthlySalaries.year, currentYear)));
    const currentMonthEmpIds = new Set(currentMonthRecords.map(r => r.employeeId));

    const settings = await db.select().from(tenantSettings).limit(1).get();

    for (const emp of allEmployees) {
      const structure = structureMap[emp.id];
      if (structure && !currentMonthEmpIds.has(emp.id)) {
        console.log(`[MonthlySalary Sync] Generating missing record for ${emp.name} - ${currentMonth}/${currentYear}`);
        const totalSalary = structure.totalSalary;
        const b = calculateSalaryBreakdown(totalSalary, settings?.salaryStructure as any[] | undefined);
        const workingDaySalary = (totalSalary / 30) * 30;

        await db.insert(monthlySalaries).values({
          id: newId(),
          employeeId: emp.id,
          month: currentMonth,
          year: currentYear,
          totalSalary,
          basicSalary: b.basicSalary,
          hra: b.hra,
          medicalAllowance: b.medicalAllowance,
          travelAllowance: b.travelAllowance,
          others: b.others,
          breakdown: b.breakdown as any,
          festivalBonus: structure.festivalBonus || 0,
          workingDays: 30,
          workingDaySalary,
          advanceSalaryAmount: 0,
          loanAdjustAmount: 0,
          leaveDeductionAmount: 0,
          payableSalary: workingDaySalary + (structure.festivalBonus || 0),
          totalSalaryPaid: workingDaySalary + (structure.festivalBonus || 0),
          isPaid: false,
          isHeld: false,
          createdAt: now(),
          updatedAt: now(),
        });
      }
    }

    // Sync unpaid salaries with latest employee data
    const unpaidItems = await db
      .select()
      .from(monthlySalaries)
      .where(eq(monthlySalaries.isPaid, false));

    const employeeIds = [...new Set(unpaidItems.map(item => item.employeeId))];
    const years = [...new Set(unpaidItems.map(item => item.year))];
    const months = [...new Set(unpaidItems.map(item => item.month))];

    // Fetch related data in bulk
    const empDataList = employeeIds.length
      ? await db.select().from(employees).where(inArray(employees.id, employeeIds))
      : [];
    const empDataMap = Object.fromEntries(empDataList.map(e => [e.id, e]));

    const allLeaveBalances = employeeIds.length
      ? await db
          .select()
          .from(leaveBalances)
          .where(inArray(leaveBalances.employeeId, employeeIds))
      : [];

    const allAdvances = employeeIds.length
      ? await db
          .select()
          .from(advanceSalaries)
          .where(
            and(
              inArray(advanceSalaries.employeeId, employeeIds),
              eq(advanceSalaries.isDeducted, false)
            )
          )
      : [];

    const allLoans = employeeIds.length
      ? await db
          .select()
          .from(loans)
          .where(
            and(
              inArray(loans.employeeId, employeeIds),
              gt(loans.dueAmount, 0)
            )
          )
      : [];

    // Re-fetch settings for update sync
    const settingsForSync = await db.select().from(tenantSettings).limit(1).get();

    // 3. Process and sync
    for (const ms of unpaidItems) {
      const structure = structureMap[ms.employeeId];
      const totalSalary = structure?.totalSalary || 0;

      const empLeaveBalances = allLeaveBalances.filter(lb => lb.employeeId === ms.employeeId);
      const leaveBalance = empLeaveBalances.find(lb => lb.year === ms.year);
      const dueLeave = leaveBalance?.dueLeave || 0;
      const workingDays = dueLeave < 0 ? 30 + dueLeave : 30;
      const workingDaySalary = (totalSalary / 30) * workingDays;

      const advances = allAdvances.filter(
        adv => adv.employeeId === ms.employeeId && adv.month === ms.month && adv.year === ms.year
      );
      const advanceSalaryAmount = advances.reduce((sum, adv) => sum + adv.amount, 0);

      const empLoans = allLoans.filter(loan => {
        const isCorrectEmployee = loan.employeeId === ms.employeeId;
        const startedBeforeOrDuring =
          !loan.startYear ||
          loan.startYear < ms.year ||
          (loan.startYear === ms.year && (!loan.startMonth || loan.startMonth <= ms.month));
        return isCorrectEmployee && startedBeforeOrDuring;
      });
      const loanAdjustAmount = empLoans.reduce(
        (sum, loan) => sum + Math.min(loan.installmentAmount, loan.dueAmount),
        0
      );
      const leaveDeductionAmount = Math.max(0, totalSalary - workingDaySalary);
      const payableSalary =
        workingDaySalary - advanceSalaryAmount - loanAdjustAmount + (ms.festivalBonus || 0);

      if (
        ms.workingDays !== workingDays ||
        ms.workingDaySalary !== workingDaySalary ||
        ms.advanceSalaryAmount !== advanceSalaryAmount ||
        ms.loanAdjustAmount !== loanAdjustAmount ||
        ms.leaveDeductionAmount !== leaveDeductionAmount ||
        ms.payableSalary !== payableSalary ||
        ms.totalSalary !== totalSalary
      ) {
        const b = calculateSalaryBreakdown(totalSalary, settingsForSync?.salaryStructure as any[] | undefined);

        await db
          .update(monthlySalaries)
          .set({
            totalSalary,
            basicSalary: b.basicSalary,
            hra: b.hra,
            medicalAllowance: b.medicalAllowance,
            travelAllowance: b.travelAllowance,
            others: b.others,
            breakdown: b.breakdown as any,
            workingDays,
            workingDaySalary,
            advanceSalaryAmount,
            loanAdjustAmount,
            leaveDeductionAmount,
            payableSalary,
            totalSalaryPaid: payableSalary,
            updatedAt: now(),
          })
          .where(eq(monthlySalaries.id, ms.id));
      }
    }

    // Final fetch with employee join
    const items = await db.select().from(monthlySalaries);
    const allEmpIds = [...new Set(items.map(i => i.employeeId))];
    const allEmps = allEmpIds.length
      ? await db.select().from(employees).where(inArray(employees.id, allEmpIds))
      : [];
    const allEmpMap = Object.fromEntries(allEmps.map(e => [e.id, e]));

    const result = items
      .map(i => ({ ...i, employee: allEmpMap[i.employeeId] }))
      .sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        if (b.month !== a.month) return b.month - a.month;
        const da = a.employee?.joiningDate || "";
        const db2 = b.employee?.joiningDate || "";
        return da < db2 ? -1 : da > db2 ? 1 : 0;
      });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Monthly Salary GET Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = monthlySalarySchema.parse((await request.json()) as any);

    const db = await getTenantDb();
    const settings = await db.select().from(tenantSettings).limit(1).get();

    const payload = toMonthlySalaryPayload(parsed, settings?.salaryStructure);

    const item = await db
      .insert(monthlySalaries)
      .values({ id: newId(), ...payload, createdAt: now(), updatedAt: now() })
      .returning()
      .get();

    const employee = await db.select().from(employees).where(eq(employees.id, item.employeeId)).get();

    return NextResponse.json({ ...item, employee }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create monthly salary", error }, { status: 400 });
  }
}
