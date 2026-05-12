import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const [loans, advances, salaries, officeCosts] = await Promise.all([
      // 1. Running Loans (employees with outstanding debt)
      (await getTenantPrisma()).loan.findMany({
        where: { dueAmount: { gt: 0 } },
        include: { employee: { select: { name: true, employeeCode: true, designation: true } } },
        orderBy: { employee: { name: 'asc' } }
      }),

      // 2. Advance Salary for the month
      (await getTenantPrisma()).advanceSalary.findMany({
        where: { month, year },
        include: { employee: { select: { name: true, employeeCode: true, designation: true } } },
        orderBy: { employee: { name: 'asc' } }
      }),

      // 3. Monthly Salary (Payroll) for the month
      (await getTenantPrisma()).monthlySalary.findMany({
        where: { month, year },
        include: { employee: { select: { name: true, employeeCode: true, designation: true, department: true } } },
        orderBy: { employee: { name: 'asc' } }
      }),

      // 4. Office Cost (Daily Expenses) for the month
      (await getTenantPrisma()).officeCost.findMany({
        where: { month, year },
        orderBy: { date: 'asc' }
      })
    ]);

    return NextResponse.json({
      loans,
      advances,
      salaries,
      officeCosts,
      meta: {
        month,
        year,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("Error generating consolidated report data:", error);
    return NextResponse.json({ message: error.message || "Failed to fetch report data" }, { status: 500 });
  }
}
