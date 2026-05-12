import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

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

    const employee = await (await getTenantPrisma()).employee.findUnique({
      where: { id: employeeId },
      include: {
        salaryStructure: true,
        leaveBalances: true,
      }
    });

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const totalSalary = employee.salaryStructure?.totalSalary || 0;
    
    // Working days based on due leaves (negative means overused)
    const leaveBalance = employee.leaveBalances?.find(lb => lb.year === parsedYear);
    const dueLeave = leaveBalance?.dueLeave || 0;
    const workingDays = dueLeave < 0 ? 30 + dueLeave : 30; // standard 30 days
    const workingDaySalary = (totalSalary / 30) * workingDays;

    // Advance Salary deduction
    const advances = await (await getTenantPrisma()).advanceSalary.findMany({
      where: {
        employeeId: employeeId,
        month: parsedMonth,
        year: parsedYear,
        isDeducted: false, 
      }
    });
    let advanceSalaryAmount = advances.reduce((sum, adv) => sum + adv.amount, 0);

    // Loan adjustment deduction
    const loans = await (await getTenantPrisma()).loan.findMany({
      where: {
        employeeId: employeeId,
        dueAmount: { gt: 0 },
        OR: [
          { startYear: null },
          { startYear: { lt: parsedYear } },
          { startYear: parsedYear, startMonth: { lte: parsedMonth } },
          { startYear: parsedYear, startMonth: null }
        ]
      }
    });
    
    let baseLoanAdjustAmount = loans.reduce((sum, loan) => {
      return sum + Math.min(loan.installmentAmount, loan.dueAmount);
    }, 0);

    const festivalBonus = employee.salaryStructure?.festivalBonus || 0;
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
