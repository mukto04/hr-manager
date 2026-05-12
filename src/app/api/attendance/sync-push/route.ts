export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDb, getDbBySlug, getTenantDb, newId, now } from "@/lib/db";
import { attendances, employees, attendanceDevices, breakRecords, tenantSettings } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { format } from "date-fns";
import { calculateAttendanceStatus, syncLeaveBalanceForAttendance } from "@/lib/attendance-utils";

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ message: "API Key is required" }, { status: 401 });
    }

    const { logs } = (await request.json()) as any;
    if (!Array.isArray(logs)) {
      return NextResponse.json({ message: "Logs must be an array" }, { status: 400 });
    }

    let tenantSlug = request.headers.get("x-tenant-slug");
    if (tenantSlug && tenantSlug.endsWith("-hr")) {
      tenantSlug = tenantSlug.replace("-hr", "");
    }

    let db;
    try {
      if (tenantSlug && !['default', 'attendance', 'undefined', ''].includes(tenantSlug)) {
        db = await getDbBySlug(tenantSlug);
      } else {
        db = await getTenantDb();
      }
    } catch (e) {
      db = getDb();
    }

    const settings = await db.select().from(tenantSettings).get();
    const threshold = settings?.halfDayThreshold || 420;

    // 1. Verify Device
    const device = await db
      .select()
      .from(attendanceDevices)
      .where(eq(attendanceDevices.apiKey, apiKey))
      .get();

    if (!device) {
      return NextResponse.json({ message: "Invalid API Key" }, { status: 401 });
    }

    console.log(`Sync Push: Received ${logs.length} logs from device ${device.deviceName}`);

    let syncCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // 2. Group logs by employee and date
    const groupedLogs: Map<string, { timestamps: Date[]; machineUserId: string }> = new Map();

    for (const log of logs) {
      const { deviceUserId, recordTime } = log;
      const normalizedId = deviceUserId?.toString().trim();
      if (!normalizedId) continue;

      const recordDate = new Date(recordTime);
      const dateStr = format(recordDate, "yyyy-MM-dd");
      const key = `${normalizedId}_${dateStr}`;

      const existingGroup = groupedLogs.get(key);
      if (!existingGroup) {
        groupedLogs.set(key, { timestamps: [recordDate], machineUserId: normalizedId });
      } else {
        existingGroup.timestamps.push(recordDate);
      }
    }

    // 3. Process grouped sessions
    for (const [key, data] of groupedLogs.entries()) {
      try {
        const { machineUserId, timestamps } = data;

        // Sort timestamps to find In, Out, and Breaks
        timestamps.sort((a, b) => a.getTime() - b.getTime());
        const earliest = timestamps[0];
        const latest = timestamps[timestamps.length - 1];

        // Find employee by fingerprintId
        const employee = await db
          .select()
          .from(employees)
          .where(eq(employees.fingerprintId, machineUserId))
          .get();

        if (!employee) {
          skipCount++;
          continue;
        }

        const dateObj = new Date(earliest);
        dateObj.setHours(0, 0, 0, 0);
        const dateObjStr = dateObj.toISOString();

        // A. Handle Attendance (In/Out)
        const existing = await db
          .select()
          .from(attendances)
          .where(and(eq(attendances.employeeId, employee.id), eq(attendances.date, dateObjStr)))
          .get();

        const hasValidCheckout = latest.getTime() - earliest.getTime() >= 5 * 60 * 1000;

        if (!existing) {
          const finalStatus = calculateAttendanceStatus(earliest, hasValidCheckout ? latest : null);
          await db.insert(attendances).values({
            id: newId(),
            employeeId: employee.id,
            date: dateObjStr,
            checkIn: earliest.toISOString(),
            checkOut: hasValidCheckout ? latest.toISOString() : null,
            status: finalStatus,
            isManual: false,
            createdAt: now(),
            updatedAt: now(),
          });
          await syncLeaveBalanceForAttendance(db, employee.id, null, finalStatus, dateObj);
          syncCount++;
        } else if (existing.isManual) {
          // Manual data takes precedence. Do not overwrite.
          skipCount++;
        } else {
          let updateData: any = {};
          if (!existing.checkIn || earliest < new Date(existing.checkIn)) updateData.checkIn = earliest.toISOString();

          const effectiveCheckIn = updateData.checkIn || existing.checkIn;
          const isCheckoutNewer = !existing.checkOut || latest > new Date(existing.checkOut);
          const isAfterThreshold = latest.getTime() - new Date(effectiveCheckIn).getTime() >= 5 * 60 * 1000;

          if (isCheckoutNewer && isAfterThreshold) updateData.checkOut = latest.toISOString();

          if (Object.keys(updateData).length > 0) {
            const finalCheckIn = updateData.checkIn || existing.checkIn;
            const finalCheckOut = updateData.checkOut || existing.checkOut;
            const finalStatus = calculateAttendanceStatus(
              new Date(finalCheckIn),
              finalCheckOut ? new Date(finalCheckOut) : null,
              threshold
            );
            await db
              .update(attendances)
              .set({ ...updateData, status: finalStatus, isManual: false, updatedAt: now() })
              .where(eq(attendances.id, existing.id));
            await syncLeaveBalanceForAttendance(db, employee.id, existing.status, finalStatus, dateObj);
            syncCount++;
          } else {
            skipCount++;
          }
        }

        // B. Handle Breaks (Intermediate Punches)
        // If there are 4 punches: In, BreakStart, BreakEnd, Out
        // If there are 6 punches: In, B1S, B1E, B2S, B2E, Out
        if (timestamps.length >= 4) {
          for (let i = 1; i < timestamps.length - 1; i += 2) {
            const bStart = timestamps[i];
            const bEnd = timestamps[i + 1];

            if (bStart && bEnd && bEnd.getTime() - bStart.getTime() > 1 * 60 * 1000) {
              // Check if this break already recorded to avoid duplicates
              const existingBreak = await db
                .select()
                .from(breakRecords)
                .where(
                  and(
                    eq(breakRecords.employeeId, employee.id),
                    eq(breakRecords.startTime, bStart.toISOString()),
                    eq(breakRecords.endTime, bEnd.toISOString())
                  )
                )
                .get();

              if (!existingBreak) {
                const duration = Math.round((bEnd.getTime() - bStart.getTime()) / (1000 * 60));
                await db.insert(breakRecords).values({
                  id: newId(),
                  employeeId: employee.id,
                  date: dateObjStr,
                  startTime: bStart.toISOString(),
                  endTime: bEnd.toISOString(),
                  duration,
                  createdAt: now(),
                  updatedAt: now(),
                });
              }
            }
          }
        }
      } catch (e) {
        console.error(`Sync Push Error for ${key}:`, e);
        errorCount++;
      }
    }

    // 4. Update device "Last Seen" and "Status"
    await db
      .update(attendanceDevices)
      .set({
        lastSync: syncCount > 0 ? now() : device.lastSync,
        lastSeen: now(),
        status: "ACTIVE",
        updatedAt: now(),
      })
      .where(eq(attendanceDevices.id, device.id));

    return NextResponse.json({
      message: "Push synchronization completed",
      summary: {
        received: logs.length,
        synced: syncCount,
        skipped: skipCount,
        errors: errorCount
      }
    });

  } catch (error: any) {
    console.error("Critical Sync Push error:", error);
    return NextResponse.json(
      { message: "Push sync failed", error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
