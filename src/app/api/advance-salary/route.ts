export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { advanceSalaries, employees, salaryStructures, loans } from "@/lib/db/schema";
import { eq, and, or, lt, lte, isNull, gt, inArray } from "drizzle-orm";
import { advanceSalarySchema } from "@/app/api/_helpers";

export async function GET() {
  const db = await getTenantDb();

  const allAdvances = await db.select().from(advanceSalaries);
  const empIds = [...new Set(allAdvances.map(a => a.employeeId))];
  const allEmps = empIds.length
    ? await db.select().from(employees).where(inArray(employees.id, empIds))
    : [];
  const empMap = Object.fromEntries(allEmps.map(e => [e.id, e]));

  const result = allAdvances
    .map(a => ({ ...a, employee: empMap[a.employeeId] }))
    .sort((a, b) => {
      const da = a.employee?.joiningDate || "";
      const db2 = b.employee?.joiningDate || "";
      return da < db2 ? -1 : da > db2 ? 1 : 0;
    });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = advanceSalarySchema.parse((await request.json()) as any);

    const db = await getTenantDb();

    // Check expected payable salary
    const salary = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.employeeId, parsed.employeeId))
      .get();

    if (!salary) {
      return NextResponse.json({ message: "Employee does not have a salary structure" }, { status: 400 });
    }

    const empLoans = await db
      .select()
      .from(loans)
      .where(
        and(
          eq(loans.employeeId, parsed.employeeId),
          gt(loans.dueAmount, 0),
          or(
            isNull(loans.startYear),
            lt(loans.startYear, parsed.year),
            and(eq(loans.startYear, parsed.year), lte(loans.startMonth, parsed.month)),
            and(eq(loans.startYear, parsed.year), isNull(loans.startMonth))
          )
        )
      );
    const loanDeduction = empLoans.reduce(
      (sum, loan) => sum + Math.min(loan.installmentAmount, loan.dueAmount),
      0
    );

    const existingAdvances = await db
      .select()
      .from(advanceSalaries)
      .where(
        and(
          eq(advanceSalaries.employeeId, parsed.employeeId),
          eq(advanceSalaries.month, parsed.month),
          eq(advanceSalaries.year, parsed.year)
        )
      );
    const existingAdvanceAmount = existingAdvances.reduce((sum, adv) => sum + adv.amount, 0);

    const expectedPayable = salary.totalSalary - loanDeduction - existingAdvanceAmount;
    if (expectedPayable - parsed.amount < 0) {
      return NextResponse.json(
        {
          message: `Cannot allocate advance. Max limit available after loans/advances is BDT ${Math.max(0, expectedPayable)}`,
        },
        { status: 400 }
      );
    }

    const advanceSalary = await db
      .insert(advanceSalaries)
      .values({ id: newId(), ...parsed, createdAt: now(), updatedAt: now() })
      .returning()
      .get();

    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, advanceSalary.employeeId))
      .get();

    return NextResponse.json({ ...advanceSalary, employee }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to allocate advance salary", error }, { status: 400 });
  }
}
