export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { loanSchema, toLoanPayload } from "@/app/api/_helpers";
import { createNotification } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showHistory = searchParams.get("history") === "true";

  const loans = await (await getTenantPrisma()).loan.findMany({
    where: {
      dueAmount: showHistory ? { lte: 0 } : { gt: 0 }
    },
    include: { employee: true },
    orderBy: { 
      employee: {
        joiningDate: "asc"
      }
    }
  });

  return NextResponse.json(loans);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = loanSchema.parse((await request.json()) as any);

    const salary = await (await getTenantPrisma()).salaryStructure.findUnique({ where: { employeeId: parsed.employeeId } });
    if (!salary) {
      return NextResponse.json({ message: "Employee does not have a salary structure" }, { status: 400 });
    }

    const activeLoans = await (await getTenantPrisma()).loan.findMany({ where: { employeeId: parsed.employeeId, dueAmount: { gt: 0 } } });
    const existingInstallments = activeLoans.reduce((sum, loan) => sum + loan.installmentAmount, 0);

    if (existingInstallments + parsed.installmentAmount > salary.totalSalary) {
      const maxAvailable = Math.max(0, salary.totalSalary - existingInstallments);
      return NextResponse.json({ message: `Installment too high. Max available from salary is BDT ${maxAvailable}` }, { status: 400 });
    }

    const loan = await (await getTenantPrisma()).loan.create({
      data: toLoanPayload(parsed),
      include: { employee: true }
    });

    // Notify Employee
    await createNotification({
      employeeId: loan.employeeId,
      title: "Loan Approved",
      message: `A new loan of BDT ${loan.loanAmount} has been approved and issued to you.`,
      type: "LOAN"
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create loan", error }, { status: 400 });
  }
}

