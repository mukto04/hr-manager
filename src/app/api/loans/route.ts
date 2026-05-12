export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { loans, employees, salaryStructures } from "@/lib/db/schema";
import { eq, and, gt, lte, inArray } from "drizzle-orm";
import { loanSchema, toLoanPayload } from "@/app/api/_helpers";
import { createNotification } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showHistory = searchParams.get("history") === "true";

  const db = await getTenantDb();

  const allLoans = showHistory
    ? await db.select().from(loans).where(lte(loans.dueAmount, 0))
    : await db.select().from(loans).where(gt(loans.dueAmount, 0));

  const empIds = [...new Set(allLoans.map(l => l.employeeId))];
  const allEmps = empIds.length
    ? await db.select().from(employees).where(inArray(employees.id, empIds))
    : [];
  const empMap = Object.fromEntries(allEmps.map(e => [e.id, e]));

  const result = allLoans
    .map(l => ({ ...l, employee: empMap[l.employeeId] }))
    .sort((a, b) => {
      const da = a.employee?.joiningDate || "";
      const db2 = b.employee?.joiningDate || "";
      return da < db2 ? -1 : da > db2 ? 1 : 0;
    });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
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
      .where(and(eq(loans.employeeId, parsed.employeeId), gt(loans.dueAmount, 0)));

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
      .insert(loans)
      .values({ id: newId(), ...payload, createdAt: now(), updatedAt: now() })
      .returning()
      .get();

    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, loan.employeeId))
      .get();

    // Notify Employee
    await createNotification({
      employeeId: loan.employeeId,
      title: "Loan Approved",
      message: `A new loan of BDT ${loan.loanAmount} has been approved and issued to you.`,
      type: "LOAN",
    });

    return NextResponse.json({ ...loan, employee }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create loan", error }, { status: 400 });
  }
}
