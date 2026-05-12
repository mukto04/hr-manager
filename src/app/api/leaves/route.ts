export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { leaveBalances, employees } from "@/lib/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { leaveSchema } from "@/app/api/_helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  const db = await getTenantDb();

  // Fetch leave balances filtered by year if provided
  const balances = year
    ? await db.select().from(leaveBalances).where(eq(leaveBalances.year, parseInt(year)))
    : await db.select().from(leaveBalances);

  // Fetch associated employees
  const empIds = [...new Set(balances.map((b) => b.employeeId))];
  const emps = empIds.length
    ? await db.select().from(employees).where(inArray(employees.id, empIds))
    : [];
  const empMap = Object.fromEntries(emps.map((e) => [e.id, e]));

  // Sort by employee joiningDate asc
  const result = balances
    .map((b) => ({ ...b, employee: empMap[b.employeeId] ?? null }))
    .sort((a, b) => {
      const da = a.employee?.joiningDate ?? "";
      const db2 = b.employee?.joiningDate ?? "";
      return da < db2 ? -1 : da > db2 ? 1 : 0;
    });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = leaveSchema.parse((await request.json()) as any);

    const db = await getTenantDb();

    const exists = await db
      .select()
      .from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, parsed.employeeId), eq(leaveBalances.year, parsed.year)))
      .limit(1)
      .get();

    if (exists) {
      return NextResponse.json(
        { message: `Leave balance for year ${parsed.year} already exists for this employee` },
        { status: 400 }
      );
    }

    const leave = await db
      .insert(leaveBalances)
      .values({ id: newId(), ...parsed, createdAt: now(), updatedAt: now() })
      .returning()
      .get();

    // Fetch employee for include
    const employee = leave
      ? await db.select().from(employees).where(eq(employees.id, leave.employeeId)).get()
      : null;

    return NextResponse.json({ ...leave, employee }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create leave balance", error }, { status: 400 });
  }
}
