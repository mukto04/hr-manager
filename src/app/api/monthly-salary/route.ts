import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { monthlySalarySchema, toMonthlySalaryPayload } from "@/app/api/_helpers";
import { calculateSalaryBreakdown } from "@/utils/calculations";

export async function GET() {
  try {
    const prisma = await getTenantPrisma();
    
    // Get current month/year in BDT (UTC+6)
    const bdtNow = new Date(new Date().getTime() + 6 * 60 * 60 * 1000);
    const currentMonth = bdtNow.getUTCMonth() + 1;
    const currentYear = bdtNow.getUTCFullYear();

    // 1. Ensure all active employees with salary structure have a record for the current month
    const allEmployees = await prisma.employee.findMany({
      where: { status: "ACTIVE" },
      include: { 
        salaryStructure: true,
        monthlySalaries: {
          where: { month: currentMonth, year: currentYear }
        }
      }
    });

    const settings = await prisma.tenantSettings.findFirst();

    for (const emp of allEmployees) {
      if (emp.salaryStructure && emp.monthlySalaries.length === 0) {
        console.log(`[MonthlySalary Sync] Generating missing record for ${emp.name} - ${currentMonth}/${currentYear}`);
        const totalSalary = emp.salaryStructure.totalSalary;
        const b = calculateSalaryBreakdown(totalSalary, settings?.salaryStructure as any[] | undefined);
        const workingDaySalary = (totalSalary / 30) * 30;
        
        await prisma.monthlySalary.create({
          data: {
            employeeId: emp.id,
            month: currentMonth,
            year: currentYear,
            totalSalary,
            basicSalary: b.basicSalary,
            hra: b.hra,
            medicalAllowance: b.medicalAllowance,
            travelAllowance: b.travelAllowance,
            others: b.others,
            breakdown: b.breakdown,
            festivalBonus: emp.salaryStructure.festivalBonus || 0,
            workingDays: 30,
            workingDaySalary,
            advanceSalaryAmount: 0,
            loanAdjustAmount: 0,
            leaveDeductionAmount: 0,
            payableSalary: workingDaySalary + (emp.salaryStructure.festivalBonus || 0),
            totalSalaryPaid: workingDaySalary + (emp.salaryStructure.festivalBonus || 0),
            isPaid: false
          } as any
        });
      }
    }

    // Sync unpaid salaries with latest employee data (loans, advances, leaves, structures)
    const unpaidItems = await prisma.monthlySalary.findMany({
      where: { isPaid: false },
      include: { employee: { include: { leaveBalances: true, salaryStructure: true } } }
    });

    const employeeIds = unpaidItems.map(item => item.employeeId);
    const years = Array.from(new Set(unpaidItems.map(item => item.year)));
    const months = Array.from(new Set(unpaidItems.map(item => item.month)));

    // 2. Fetch all relevant advances and loans in bulk
    const allAdvances = await (await getTenantPrisma()).advanceSalary.findMany({
      where: {
        employeeId: { in: employeeIds },
        year: { in: years },
        month: { in: months },
        isDeducted: false
      }
    });

    const allLoans = await (await getTenantPrisma()).loan.findMany({
      where: {
        employeeId: { in: employeeIds },
        dueAmount: { gt: 0 }
      }
    });

    // 3. Process and sync
    for (const ms of unpaidItems) {
      const totalSalary = ms.employee?.salaryStructure?.totalSalary || 0;
      const leaveBalance = ms.employee?.leaveBalances?.find(lb => lb.year === ms.year);
      const dueLeave = leaveBalance?.dueLeave || 0;
      const workingDays = dueLeave < 0 ? 30 + dueLeave : 30;
      const workingDaySalary = (totalSalary / 30) * workingDays;

      // Filter advances for this specific employee and period
      const advances = allAdvances.filter(adv => 
        adv.employeeId === ms.employeeId && 
        adv.month === ms.month && 
        adv.year === ms.year
      );
      const advanceSalaryAmount = advances.reduce((sum, adv) => sum + adv.amount, 0);

      // Filter loans for this specific employee and period
      const loans = allLoans.filter(loan => {
        const isCorrectEmployee = loan.employeeId === ms.employeeId;
        const startedBeforeOrDuring = !loan.startYear || 
          loan.startYear < ms.year || 
          (loan.startYear === ms.year && (!loan.startMonth || loan.startMonth <= ms.month));
        return isCorrectEmployee && startedBeforeOrDuring;
      });
      const loanAdjustAmount = loans.reduce((sum, loan) => sum + Math.min(loan.installmentAmount, loan.dueAmount), 0);
      const leaveDeductionAmount = Math.max(0, totalSalary - workingDaySalary);

      const payableSalary = workingDaySalary - advanceSalaryAmount - loanAdjustAmount + (ms.festivalBonus || 0);

      if (
        ms.workingDays !== workingDays || 
        ms.workingDaySalary !== workingDaySalary || 
        ms.advanceSalaryAmount !== advanceSalaryAmount || 
        ms.loanAdjustAmount !== loanAdjustAmount ||
        ms.leaveDeductionAmount !== leaveDeductionAmount ||
        ms.payableSalary !== payableSalary ||
        ms.totalSalary !== totalSalary
      ) {
          const prisma = await getTenantPrisma();
        const settings = await prisma.tenantSettings.findFirst();
        const b = calculateSalaryBreakdown(totalSalary, settings?.salaryStructure as any[] | undefined);

        await (await getTenantPrisma()).monthlySalary.update({
          where: { id: ms.id },
          data: {
            totalSalary,
            basicSalary: b.basicSalary,
            hra: b.hra,
            medicalAllowance: b.medicalAllowance,
            travelAllowance: b.travelAllowance,
            others: b.others,
            breakdown: b.breakdown,
            workingDays,
            workingDaySalary,
            advanceSalaryAmount,
            loanAdjustAmount,
            leaveDeductionAmount,
            payableSalary,
            totalSalaryPaid: payableSalary,
          } as any
        });
      }
    }

    const items = await (await getTenantPrisma()).monthlySalary.findMany({
      include: { employee: true },
      orderBy: [
        { year: "desc" }, 
        { month: "desc" }, 
        { employee: { joiningDate: "asc" } }
      ]
    });

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Monthly Salary GET Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = monthlySalarySchema.parse(await request.json());

    const prisma = await getTenantPrisma();
    const settings = await prisma.tenantSettings.findFirst();

    const item = await prisma.monthlySalary.create({
      data: toMonthlySalaryPayload(parsed, settings?.salaryStructure) as any,
      include: { employee: true }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create monthly salary", error }, { status: 400 });
  }
}
