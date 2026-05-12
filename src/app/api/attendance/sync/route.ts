export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { attendances, employees } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;

    // Machine usually sends employee identifier and timestamp
    const { employeeCode, timestamp } = body;

    if (!employeeCode || !timestamp) {
      return NextResponse.json({ message: "employeeCode and timestamp are required" }, { status: 400 });
    }

    const db = await getTenantDb();

    // 1. Try to find employee by fingerprintId first (most common for machine sync)
    // 2. Fallback to employeeCode
    const employee = await db
      .select()
      .from(employees)
      .where(
        or(
          eq(employees.fingerprintId, employeeCode),
          eq(employees.employeeCode, employeeCode)
        )
      )
      .get();

    if (!employee) {
      return NextResponse.json({ message: `Employee not found for code/id: ${employeeCode}` }, { status: 404 });
    }

    const punchTime = new Date(timestamp);
    const dateObj = new Date(punchTime);
    dateObj.setHours(0, 0, 0, 0);
    const dateStr = dateObj.toISOString();
    const punchTimeStr = punchTime.toISOString();

    // Retrieve existing attendance for the day
    const existing = await db
      .select()
      .from(attendances)
      .where(and(eq(attendances.employeeId, employee.id), eq(attendances.date, dateStr)))
      .get();

    let attendance: any;

    if (!existing) {
      // First punch of the day: Check In
      attendance = await db
        .insert(attendances)
        .values({
          id: newId(),
          employeeId: employee.id,
          date: dateStr,
          checkIn: punchTimeStr,
          status: "PRESENT",
          isManual: false,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning()
        .get();
    } else if (existing.isManual) {
      // Manual data takes precedence. Do not overwrite.
      attendance = existing;
    } else {
      // Subsequent punch: Determine if it's a new Check-In or a new Check-Out
      let updateData: any = {};

      // If this punch is EARLIER than recorded checkIn, update checkIn
      if (!existing.checkIn || punchTime < new Date(existing.checkIn)) {
        updateData.checkIn = punchTimeStr;
      }

      // Only set or update checkOut if it's significantly later than checkIn (e.g. 5 mins)
      const effectiveCheckIn = updateData.checkIn || existing.checkIn;
      const isCheckoutNewer = !existing.checkOut || punchTime > new Date(existing.checkOut);
      const isAfterThreshold = punchTime.getTime() - new Date(effectiveCheckIn).getTime() >= 5 * 60 * 1000;

      if (isCheckoutNewer && isAfterThreshold) {
        updateData.checkOut = punchTimeStr;
      }

      if (Object.keys(updateData).length > 0) {
        attendance = await db
          .update(attendances)
          .set({ ...updateData, isManual: false, updatedAt: now() })
          .where(eq(attendances.id, existing.id))
          .returning()
          .get();
      } else {
        attendance = existing;
      }
    }

    return NextResponse.json({ message: "Sync successful", attendance });
  } catch (error: any) {
    console.error("Error syncing attendance:", error);
    return NextResponse.json({ message: error.message || "Failed to sync attendance" }, { status: 500 });
  }
}
