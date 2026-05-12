export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { employees, leaveBalances, leaveRecords, attendances, tenantSettings, holidays } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSaturday,
  isSunday,
  isBefore,
  startOfDay
} from "date-fns";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const db = await getTenantDb();

    // 1. Get Settings for mode check
    const settings = await db.select().from(tenantSettings).limit(1).get();
    if (settings && settings.autoLeaveDeduction === false) {
      return NextResponse.json({ message: "Automatic deduction is disabled in settings." }, { status: 400 });
    }

    // 2. Get active employees
    const activeEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.status, "ACTIVE"));

    // 3. Get leave balances for the year for these employees
    const empIds = activeEmployees.map((e) => e.id);
    const balancesAll = empIds.length
      ? await db
          .select()
          .from(leaveBalances)
          .where(and(eq(leaveBalances.year, year)))
      : [];
    const balanceMap = Object.fromEntries(balancesAll.map((b) => [b.employeeId, b]));

    // 4. Date range
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);
    const today = startOfDay(new Date());
    const syncEnd = isBefore(today, endDate) ? today : endDate;

    const startDateStr = format(startDate, "yyyy-MM-dd");
    const syncEndStr = format(syncEnd, "yyyy-MM-dd");

    // 5. Get Holidays in range
    const holidayRows = await db
      .select()
      .from(holidays)
      .where(and(gte(holidays.date, startDateStr), lte(holidays.date, syncEndStr)));
    const holidayDates = new Set(holidayRows.map((h) => h.date.substring(0, 10)));

    // 6. Get all attendance records for the period
    const attendanceRows = await db
      .select()
      .from(attendances)
      .where(and(gte(attendances.date, startDateStr), lte(attendances.date, syncEndStr)));

    const attendanceMap = new Map<string, Set<string>>();
    attendanceRows.forEach((att) => {
      if (!attendanceMap.has(att.employeeId)) {
        attendanceMap.set(att.employeeId, new Set());
      }
      attendanceMap.get(att.employeeId)?.add(att.date.substring(0, 10));
    });

    // 7. Get existing automatic deduction records to avoid double deduction
    const existingDeductions = await db
      .select()
      .from(leaveRecords)
      .where(
        and(
          eq(leaveRecords.category, "AUTOMATIC"),
          eq(leaveRecords.year, year),
          gte(leaveRecords.date, startDateStr),
          lte(leaveRecords.date, syncEndStr)
        )
      );
    const deductionMap = new Map<string, Set<string>>();
    existingDeductions.forEach((rec) => {
      if (!deductionMap.has(rec.employeeId)) {
        deductionMap.set(rec.employeeId, new Set());
      }
      deductionMap.get(rec.employeeId)?.add(rec.date.substring(0, 10));
    });

    const days = eachDayOfInterval({ start: startDate, end: syncEnd });
    let createdCount = 0;

    // 8. Process each employee
    for (const employee of activeEmployees) {
      const balance = balanceMap[employee.id];
      if (!balance) continue;

      const empAttendances = attendanceMap.get(employee.id) || new Set();
      const empDeductions = deductionMap.get(employee.id) || new Set();

      for (const day of days) {
        const dateKey = format(day, "yyyy-MM-dd");

        // Skip if weekend or holiday
        if (isSaturday(day) || isSunday(day) || holidayDates.has(dateKey)) continue;

        // Skip if employee was present
        if (empAttendances.has(dateKey)) continue;

        // Skip if already deducted
        if (empDeductions.has(dateKey)) continue;

        // DEDUCT: Update Balance
        await db
          .update(leaveBalances)
          .set({
            dueLeave: sql`${leaveBalances.dueLeave} - 1`,
            updatedAt: now()
          })
          .where(eq(leaveBalances.id, balance.id));

        // Create Record
        await db.insert(leaveRecords).values({
          id: newId(),
          employeeId: employee.id,
          date: startOfDay(day).toISOString(),
          amount: 1,
          type: "DEDUCTION",
          category: "AUTOMATIC",
          note: "Automatic Absent Deduction",
          year,
          createdAt: now(),
          updatedAt: now()
        });

        createdCount++;
      }
    }

    return NextResponse.json({
      message: "Absence synchronization completed.",
      count: createdCount
    });

  } catch (error: any) {
    console.error("Sync Absent Error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
