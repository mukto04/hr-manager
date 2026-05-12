export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { attendances, employees, tenantSettings } from "@/lib/db/schema";
import { eq, and, gte, lt, asc } from "drizzle-orm";
import { calculateAttendanceStatus, syncLeaveBalanceForAttendance } from "@/lib/attendance-utils";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    let filterDate: Date;
    if (dateStr) {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        // Create a date that represents 00:00:00 in +06:00 (Bangladesh Time)
        // 00:00 BDT = 18:00 UTC of the previous day
        filterDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), -6, 0, 0, 0));
      } else {
        filterDate = new Date();
      }
    } else {
      filterDate = new Date();
      // Adjust current UTC time to BDT start of day if no date provided
      filterDate = new Date(Date.UTC(filterDate.getUTCFullYear(), filterDate.getUTCMonth(), filterDate.getUTCDate(), -6, 0, 0, 0));
    }

    const nextDay = new Date(filterDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const filterDateStr = filterDate.toISOString();
    const nextDayStr = nextDay.toISOString();

    const db = await getTenantDb();

    // 1. Get all active employees
    const activeEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeCode: employees.employeeCode,
        designation: employees.designation,
        department: employees.department,
      })
      .from(employees)
      .where(eq(employees.status, "ACTIVE"))
      .orderBy(asc(employees.joiningDate));

    // 2. Get attendance records for the selected date
    const attendanceRecords = await db
      .select()
      .from(attendances)
      .where(and(gte(attendances.date, filterDateStr), lt(attendances.date, nextDayStr)));

    // 3. Merge data
    const mergedData = activeEmployees.map(employee => {
      const attendance = attendanceRecords.find(a => a.employeeId === employee.id);
      return {
        id: attendance?.id || null,
        employeeId: employee.id,
        employee: employee,
        checkIn: attendance?.checkIn || null,
        checkOut: attendance?.checkOut || null,
        status: attendance?.status || "ABSENT",
        note: attendance?.note || null,
        isManual: attendance?.isManual || false,
        date: filterDate,
      };
    });

    return NextResponse.json(mergedData);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ message: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const { employeeId, date, checkIn, checkOut, status, isManual, note } = body;

    if (!employeeId || !date) {
      return NextResponse.json({ message: "Employee ID and Date are required" }, { status: 400 });
    }

    const parts = date.split("-");
    const parsedDate = parts.length === 3
      ? new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), -6, 0, 0, 0))
      : new Date(date);
    const parsedDateStr = parsedDate.toISOString();

    const checkInDate = checkIn ? new Date(checkIn) : null;
    const checkOutDate = checkOut ? new Date(checkOut) : null;
    const checkInStr = checkInDate ? checkInDate.toISOString() : null;
    const checkOutStr = checkOutDate ? checkOutDate.toISOString() : null;

    const db = await getTenantDb();

    // 1. Get existing record
    const existing = await db
      .select()
      .from(attendances)
      .where(and(eq(attendances.employeeId, employeeId), eq(attendances.date, parsedDateStr)))
      .get();

    // 2. Get settings
    const settings = await db.select().from(tenantSettings).get();
    const threshold = settings?.halfDayThreshold || 420;
    const lateThresholdTime = settings?.lateThresholdTime;
    const weeklySchedule = settings?.weeklySchedule as any[];
    const defaultInTime = settings?.defaultInTime;

    // 3. Determine new status
    let finalStatus = status;
    if (checkInDate && checkOutDate) {
      finalStatus = calculateAttendanceStatus(
        checkInDate,
        checkOutDate,
        threshold,
        lateThresholdTime,
        weeklySchedule,
        defaultInTime
      );
    } else if (!status) {
      finalStatus = "ABSENT";
    }

    // 4. Upsert attendance
    let record: any;
    if (!existing) {
      record = await db
        .insert(attendances)
        .values({
          id: newId(),
          employeeId,
          date: parsedDateStr,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          status: finalStatus,
          isManual: isManual !== undefined ? isManual : true,
          note: note || null,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning()
        .get();
    } else {
      record = await db
        .update(attendances)
        .set({
          checkIn: checkInStr,
          checkOut: checkOutStr,
          status: finalStatus,
          isManual: isManual !== undefined ? isManual : true,
          note: note || null,
          updatedAt: now(),
        })
        .where(eq(attendances.id, existing.id))
        .returning()
        .get();
    }

    // 5. Sync Leave Balance
    await syncLeaveBalanceForAttendance(db, employeeId, existing?.status, finalStatus, parsedDate);

    return NextResponse.json(record);
  } catch (error: any) {
    console.error("Error creating/updating attendance:", error);
    return NextResponse.json({ message: error.message || "Failed to save attendance" }, { status: 500 });
  }
}
