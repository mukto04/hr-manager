export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { loans, employees, salaryStructures } from "@/lib/db/schema";
import { eq, and, gt, ne } from "drizzle-orm";
import { loanSchema, toLoanPayload } from "@/app/api/_helpers";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = loanSchema.parse((await request.json()) as any);

    const db = await getTenantDb();

    const salary = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.employeeId, parsed.employeeId))
      .get();

    if (!salary) {
      return NextResponse.json({ message: "Employee does not have a salary structure" }, { status: 400 });
    }

    const activeLoans = await db
      .select()
      .from(loans)
      .where(
        and(
          eq(loans.employeeId, parsed.employeeId),
          gt(loans.dueAmount, 0),
          ne(loans.id, id)
        )
      );

    const existingInstallments = activeLoans.reduce((sum, loan) => sum + loan.installmentAmount, 0);

    if (existingInstallments + parsed.installmentAmount > salary.totalSalary) {
      const maxAvailable = Math.max(0, salary.totalSalary - existingInstallments);
      return NextResponse.json(
        { message: `Installment too high. Max available from salary is BDT ${maxAvailable}` },
        { status: 400 }
      );
    }

    const payload = toLoanPayload(parsed);

    const loan = await db
      .update(loans)
      .set({ ...payload, updatedAt: now() })
      .where(eq(loans.id, id))
      .returning()
      .get();

    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, loan.employeeId))
      .get();

    return NextResponse.json({ ...loan, employee });
  } catch (error) {
    return NextResponse.json({ message: "Failed to update loan", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantDb()).delete(loans).where(eq(loans.id, id));
    return NextResponse.json({ message: "Loan deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete loan", error }, { status: 400 });
  }
}
