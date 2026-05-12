export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { salaryStructures, employees, tenantSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { salarySchema, toSalaryPayload } from "@/app/api/_helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showHistory = searchParams.get("history") === "true";

    const db = await getTenantDb();

    const targetStatus = showHistory ? "DISABLED" : "ACTIVE";
    const allSalaries = await db.select().from(salaryStructures);
    const allEmployees = await db.select().from(employees).where(eq(employees.status, targetStatus));

    const empMap = Object.fromEntries(allEmployees.map(e => [e.id, e]));

    const salaries = allSalaries
      .filter(s => empMap[s.employeeId])
      .map(s => ({ ...s, employee: empMap[s.employeeId] }))
      .sort((a, b) => {
        const da = a.employee?.joiningDate || "";
        const db2 = b.employee?.joiningDate || "";
        return da < db2 ? -1 : da > db2 ? 1 : 0;
      });

    return NextResponse.json(salaries);
  } catch (error: any) {
    console.error("Salary GET Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = salarySchema.parse((await request.json()) as any);

    const db = await getTenantDb();

    const existing = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.employeeId, parsed.employeeId))
      .get();

    if (existing) {
      return NextResponse.json({ message: "Salary structure already exists for this employee" }, { status: 400 });
    }

    const settings = await db.select().from(tenantSettings).limit(1).get();

    const payload = toSalaryPayload(parsed, settings?.salaryStructure);

    const salary = await db
      .insert(salaryStructures)
      .values({ id: newId(), ...payload, createdAt: now(), updatedAt: now() })
      .returning()
      .get();

    const employee = await db.select().from(employees).where(eq(employees.id, salary.employeeId)).get();

    return NextResponse.json({ ...salary, employee }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create salary structure", error }, { status: 400 });
  }
}
