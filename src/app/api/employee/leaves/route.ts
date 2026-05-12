export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { leaveBalances, leaveRecords } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET() {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getTenantDb();

    // Get the latest leave balance
    const empLeaveBalances = await db
      .select()
      .from(leaveBalances)
      .where(eq(leaveBalances.employeeId, employeeId))
      .orderBy(desc(leaveBalances.year))
      .limit(1);

    // Get all leave records
    const empLeaveRecords = await db
      .select()
      .from(leaveRecords)
      .where(eq(leaveRecords.employeeId, employeeId))
      .orderBy(desc(leaveRecords.date));

    return NextResponse.json({
      leaveBalance: empLeaveBalances[0] || null,
      leaveRecords: empLeaveRecords || []
    });
  } catch (error) {
    console.error("Leaves API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
