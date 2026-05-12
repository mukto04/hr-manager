export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { loans, advanceSalaries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET() {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getTenantDb();

    const [empLoans, advances] = await Promise.all([
      db
        .select()
        .from(loans)
        .where(eq(loans.employeeId, employeeId))
        .orderBy(desc(loans.createdAt)),
      db
        .select()
        .from(advanceSalaries)
        .where(eq(advanceSalaries.employeeId, employeeId))
        .orderBy(desc(advanceSalaries.year), desc(advanceSalaries.month))
    ]);

    return NextResponse.json({ loans: empLoans, advances });
  } catch (error) {
    console.error("Loans API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
