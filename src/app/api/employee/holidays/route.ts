export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { and, gte, lte, asc } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET() {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getTenantDb();
    const currentYear = new Date().getFullYear();

    const empHolidays = await db
      .select()
      .from(holidays)
      .where(
        and(
          gte(holidays.date, new Date(currentYear, 0, 1).toISOString()),
          lte(holidays.date, new Date(currentYear, 11, 31).toISOString())
        )
      )
      .orderBy(asc(holidays.date));

    return NextResponse.json(empHolidays);
  } catch (error) {
    console.error("Holidays API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
