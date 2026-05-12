export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { salaryStructures, monthlySalaries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET() {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getTenantDb();

    const [salaryStructure, empMonthlySalaries] = await Promise.all([
      db
        .select()
        .from(salaryStructures)
        .where(eq(salaryStructures.employeeId, employeeId))
        .get(),
      db
        .select()
        .from(monthlySalaries)
        .where(eq(monthlySalaries.employeeId, employeeId))
        .orderBy(desc(monthlySalaries.year), desc(monthlySalaries.month))
    ]);

    return NextResponse.json({ salaryStructure: salaryStructure || null, monthlySalaries: empMonthlySalaries });
  } catch (error) {
    console.error("Salary API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
