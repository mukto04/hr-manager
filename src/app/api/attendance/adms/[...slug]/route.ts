export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDbBySlug, newId, now } from "@/lib/db";
import { attendances, attendanceDevices, admsLogs, breakRecords, employees, tenantSettings } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { calculateAttendanceStatus, syncLeaveBalanceForAttendance } from "@/lib/attendance-utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const tenantSlug = slug[0];
  const searchParams = request.nextUrl.searchParams;
  const sn = searchParams.get("SN");
  const fullUrl = request.nextUrl.pathname + request.nextUrl.search;

  try {
    const db = await getDbBySlug(tenantSlug);

    await db.insert(admsLogs).values({
      id: newId(),
      sn: sn || null,
      path: fullUrl,
      method: "GET",
      createdAt: now(),
    });

    if (sn) {
      const device = await db
        .select()
        .from(attendanceDevices)
        .where(eq(attendanceDevices.serialNumber, sn))
        .get();

      if (device) {
        await db
          .update(attendanceDevices)
          .set({
            lastSeen: now(),
            status: "ACTIVE",
            ipAddress: request.headers.get("x-forwarded-for") || (request as any).ip || "unknown",
            updatedAt: now(),
          })
          .where(eq(attendanceDevices.id, device.id));
      }
    }
  } catch (err) { console.error("ADMS GET Error:", err); }

  return new NextResponse("OK", { headers: { "Content-Type": "text/plain" } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const tenantSlug = slug[0];
  const searchParams = request.nextUrl.searchParams;
  const sn = searchParams.get("SN");
  const table = searchParams.get("table");
  const fullUrl = request.nextUrl.pathname + request.nextUrl.search;

  try {
    const db = await getDbBySlug(tenantSlug);
    const body = await request.text();

    await db.insert(admsLogs).values({
      id: newId(),
      sn: sn || null,
      table: table || "NONE",
      path: fullUrl,
      body: body.substring(0, 1000),
      method: "POST",
      createdAt: now(),
    });

    if (body.includes("DeviceType=") && (!table || table === "NONE")) {
      return new NextResponse("RegistryCode=3985793847593\r\nServerVersion=2.4.1\r\nServerName=ADMS\r\nPushVersion=2.0.335\r\nOK\r\n", {
        headers: { "Content-Type": "text/plain" }
      });
    }

    const isLog = table === "ATTLOG" || table === "EVENT" || table === "rtlog" || body.includes("pin=");
    if (isLog) {
      const lines = body.split("\n").filter(l => l.trim().length > 0);

      const settings = await db.select().from(tenantSettings).get();
      const threshold = settings?.halfDayThreshold || 420;
      const lateThresholdTime = settings?.lateThresholdTime;
      const weeklySchedule = settings?.weeklySchedule as any[];
      const defaultInTime = settings?.defaultInTime;

      for (const line of lines) {
        let employeeCodeRaw = "";
        let dateStr = "";
        let timeStr = "";

        if (line.includes("pin=") && line.includes("time=")) {
          const timeMatch = line.match(/time=([\d-]+\s[\d:]+)/);
          const fullTimeStr = timeMatch ? timeMatch[1] : "";
          const pinMatch = line.match(/pin=(\w+)/);
          employeeCodeRaw = pinMatch ? pinMatch[1] : "";
          if (fullTimeStr) [dateStr, timeStr] = fullTimeStr.split(" ");
        } else {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 2) continue;
          employeeCodeRaw = parts[0];
          const potentialDate = parts.find(p => p.includes("-") && p.split("-").length === 3);
          if (potentialDate) {
            const idx = parts.indexOf(potentialDate);
            dateStr = potentialDate;
            timeStr = parts[idx + 1];
          }
        }

        if (!employeeCodeRaw || !dateStr || !timeStr) continue;

        // BDT Midnight (UTC+6)
        const dParts = dateStr.split("-");
        const dateOnly = new Date(Date.UTC(parseInt(dParts[0]), parseInt(dParts[1]) - 1, parseInt(dParts[2]), -6, 0, 0, 0));
        const dateOnlyStr = dateOnly.toISOString();

        // INTERPRET AS BDT (+06:00) to fix timezone shift
        const punchTime = new Date(`${dateStr}T${timeStr}+06:00`);
        if (isNaN(punchTime.getTime())) continue;
        const punchTimeStr = punchTime.toISOString();

        const numericId = parseInt(employeeCodeRaw).toString();
        const employee = await db
          .select()
          .from(employees)
          .where(
            or(
              eq(employees.employeeCode, employeeCodeRaw),
              eq(employees.employeeCode, numericId),
              eq(employees.fingerprintId, employeeCodeRaw),
              eq(employees.fingerprintId, numericId)
            )
          )
          .get();

        if (employee) {
          const existing = await db
            .select()
            .from(attendances)
            .where(and(eq(attendances.employeeId, employee.id), eq(attendances.date, dateOnlyStr)))
            .get();

          // Protection for manual HR edits
          if (existing && existing.isManual) continue;

          let updateData: any = {};
          if (!existing) {
            updateData = { checkIn: punchTimeStr, status: "PRESENT" };
          } else {
            // 2-minute deduplication
            const diffMs = Math.abs(punchTime.getTime() - (existing.checkIn ? new Date(existing.checkIn).getTime() : 0));
            const diffMsOut = Math.abs(punchTime.getTime() - (existing.checkOut ? new Date(existing.checkOut).getTime() : 0));
            if (diffMs < 2 * 60 * 1000 || diffMsOut < 2 * 60 * 1000) continue;

            // First-In Last-Out Logic
            if (!existing.checkOut || punchTime > new Date(existing.checkOut)) {
              // If there was already a checkOut, the old checkOut might become a break
              if (existing.checkOut) {
                await db.insert(breakRecords).values({
                  id: newId(),
                  employeeId: employee.id,
                  attendanceId: existing.id,
                  date: dateOnlyStr,
                  startTime: existing.checkOut,
                  endTime: punchTimeStr,
                  note: "Auto-detected break (middle punch)",
                  status: "COMPLETED",
                  duration: 0,
                  createdAt: now(),
                  updatedAt: now(),
                });
              }
              updateData.checkOut = punchTimeStr;
            } else if (punchTime < new Date(existing.checkIn || new Date())) {
              updateData.checkIn = punchTimeStr;
            } else {
              // Middle punch -> Record as BreakRecord
              await db.insert(breakRecords).values({
                id: newId(),
                employeeId: employee.id,
                attendanceId: existing.id,
                date: dateOnlyStr,
                startTime: punchTimeStr,
                endTime: punchTimeStr,
                note: "Biometric middle punch",
                status: "COMPLETED",
                duration: 0,
                createdAt: now(),
                updatedAt: now(),
              });
            }
          }

          const finalCheckIn = updateData.checkIn || existing?.checkIn;
          const finalCheckOut = updateData.checkOut || existing?.checkOut;

          if (finalCheckIn) {
            updateData.status = calculateAttendanceStatus(
              new Date(finalCheckIn),
              finalCheckOut ? new Date(finalCheckOut) : null,
              threshold,
              lateThresholdTime,
              weeklySchedule,
              defaultInTime
            );
          }

          let record: any;
          if (!existing) {
            record = await db
              .insert(attendances)
              .values({
                id: newId(),
                employeeId: employee.id,
                date: dateOnlyStr,
                isManual: false,
                createdAt: now(),
                updatedAt: now(),
                ...updateData,
              })
              .returning()
              .get();
          } else {
            record = await db
              .update(attendances)
              .set({ ...updateData, updatedAt: now() })
              .where(eq(attendances.id, existing.id))
              .returning()
              .get();
          }

          await syncLeaveBalanceForAttendance(db, employee.id, existing?.status, record.status, dateOnly);
        }
      }
      return new NextResponse("OK", { headers: { "Content-Type": "text/plain" } });
    }
    return new NextResponse("OK", { headers: { "Content-Type": "text/plain" } });
  } catch (error: any) {
    console.error("ADMS POST Error:", error);
    return new NextResponse("OK", { headers: { "Content-Type": "text/plain" } });
  }
}
