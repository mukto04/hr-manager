export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { breakRecords } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET(request: NextRequest) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  try {
    const db = await getTenantDb();

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const breaks = await db
      .select()
      .from(breakRecords)
      .where(
        and(
          eq(breakRecords.employeeId, employeeId),
          gte(breakRecords.date, startOfMonth.toISOString()),
          lte(breakRecords.date, endOfMonth.toISOString())
        )
      )
      .orderBy(desc(breakRecords.date));

    return NextResponse.json(breaks);
  } catch (error) {
    console.error("Breaks API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
