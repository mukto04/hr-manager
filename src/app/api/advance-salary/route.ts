import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { advanceSalarySchema } from "@/app/api/_helpers";

export async function GET() {
  const advanceSalaries = await (await getTenantPrisma()).advanceSalary.findMany({
    include: { employee: true },
    orderBy: { 
      employee: {
        joiningDate: "asc"
      }
    }
  });

  return NextResponse.json(advanceSalaries);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = advanceSalarySchema.parse(await request.json());

    // Check expected payable salary
    const salary = await (await getTenantPrisma()).salaryStructure.findUnique({ where: { employeeId: parsed.employeeId } });
    if (!salary) {
      return NextResponse.json({ message: "Employee does not have a salary structure" }, { status: 400 });
    }

    const loans = await (await getTenantPrisma()).loan.findMany({ 
      where: { 
        employeeId: parsed.employeeId, 
        dueAmount: { gt: 0 },
        OR: [
          { startYear: null },
          { startYear: { lt: parsed.year } },
          { startYear: parsed.year, startMonth: { lte: parsed.month } },
          { startYear: parsed.year, startMonth: null }
        ]
      } 
    });
    const loanDeduction = loans.reduce((sum, loan) => sum + Math.min(loan.installmentAmount, loan.dueAmount), 0);
    
    const existingAdvances = await (await getTenantPrisma()).advanceSalary.findMany({ where: { employeeId: parsed.employeeId, month: parsed.month, year: parsed.year } });
    const existingAdvanceAmount = existingAdvances.reduce((sum, adv) => sum + adv.amount, 0);

    const expectedPayable = salary.totalSalary - loanDeduction - existingAdvanceAmount;
    if (expectedPayable - parsed.amount < 0) {
      return NextResponse.json({ message: `Cannot allocate advance. Max limit available after loans/advances is BDT ${Math.max(0, expectedPayable)}` }, { status: 400 });
    }

    const advanceSalary = await (await getTenantPrisma()).advanceSalary.create({
      data: parsed,
      include: { employee: true }
    });

    return NextResponse.json(advanceSalary, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to allocate advance salary", error }, { status: 400 });
  }
}
