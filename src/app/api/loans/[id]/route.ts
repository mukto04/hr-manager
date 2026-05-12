import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { loanSchema, toLoanPayload } from "@/app/api/_helpers";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = loanSchema.parse(await request.json());

    const salary = await (await getTenantPrisma()).salaryStructure.findUnique({ where: { employeeId: parsed.employeeId } });
    if (!salary) {
      return NextResponse.json({ message: "Employee does not have a salary structure" }, { status: 400 });
    }

    const activeLoans = await (await getTenantPrisma()).loan.findMany({ 
      where: { 
        employeeId: parsed.employeeId, 
        dueAmount: { gt: 0 },
        id: { not: id } 
      } 
    });
    const existingInstallments = activeLoans.reduce((sum, loan) => sum + loan.installmentAmount, 0);

    if (existingInstallments + parsed.installmentAmount > salary.totalSalary) {
      const maxAvailable = Math.max(0, salary.totalSalary - existingInstallments);
      return NextResponse.json({ message: `Installment too high. Max available from salary is BDT ${maxAvailable}` }, { status: 400 });
    }

    const loan = await (await getTenantPrisma()).loan.update({
      where: { id },
      data: toLoanPayload(parsed),
      include: { employee: true }
    });

    return NextResponse.json(loan);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update loan", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantPrisma()).loan.delete({ where: { id } });
    return NextResponse.json({ message: "Loan deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete loan", error }, { status: 400 });
  }
}
