export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { employees, leaveBalances, loans, attendances, holidays } from "@/lib/db/schema";
import { eq, and, gt, gte, lte, asc } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET() {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getTenantDb();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [employee, empLeaveBalances, empLoans, empAttendances, upcomingHolidays] = await Promise.all([
      db.select().from(employees).where(eq(employees.id, employeeId)).get(),
      db
        .select()
        .from(leaveBalances)
        .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, now.getFullYear()))),
      db
        .select()
        .from(loans)
        .where(and(eq(loans.employeeId, employeeId), gt(loans.dueAmount, 0))),
      db
        .select()
        .from(attendances)
        .where(
          and(
            eq(attendances.employeeId, employeeId),
            gte(attendances.date, startOfMonth.toISOString()),
            lte(attendances.date, endOfMonth.toISOString())
          )
        ),
      db
        .select()
        .from(holidays)
        .where(gte(holidays.date, now.toISOString()))
        .orderBy(asc(holidays.date))
        .limit(3)
    ]);

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const presentCount = empAttendances.filter(a => a.status === "PRESENT").length;
    const leaveData = empLeaveBalances[0] || { totalLeave: 0, dueLeave: 0 };

    return NextResponse.json({
      employee: {
        name: employee.name,
        employeeCode: employee.employeeCode,
        designation: employee.designation,
      },
      attendance: { presentCount },
      leaves: {
        available: leaveData.dueLeave,
        total: leaveData.totalLeave
      },
      loans: { activeCount: empLoans.length },
      holidays: upcomingHolidays
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
