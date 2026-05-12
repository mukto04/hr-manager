import { NextRequest, NextResponse } from "next/server";
import { getPrismaBySlug } from "@/lib/prisma";
import { calculateAttendanceStatus, syncLeaveBalanceForAttendance } from "@/lib/attendance-utils";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const tenantSlug = slug[0];
  const path = slug.slice(1).join("/");
  const searchParams = request.nextUrl.searchParams;
  const sn = searchParams.get("SN");
  const fullUrl = request.nextUrl.pathname + request.nextUrl.search;

  try {
    const prisma = await getPrismaBySlug(tenantSlug);
    await (prisma as any).admsLog.create({ data: { sn, path: fullUrl, method: "GET" } });

    if (sn) {
      const device = await prisma.attendanceDevice.findUnique({ where: { serialNumber: sn } });
      if (device) {
        await prisma.attendanceDevice.update({
          where: { id: device.id },
          data: { 
            lastSeen: new Date(),
            status: "ACTIVE",
            ipAddress: request.headers.get("x-forwarded-for") || (request as any).ip || "unknown"
          }
        });
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
  const path = slug.slice(1).join("/");
  const searchParams = request.nextUrl.searchParams;
  const sn = searchParams.get("SN");
  const table = searchParams.get("table");
  const fullUrl = request.nextUrl.pathname + request.nextUrl.search;

  try {
    const prisma = await getPrismaBySlug(tenantSlug);
    const body = await request.text();

    await (prisma as any).admsLog.create({
      data: { sn, table: table || "NONE", path: fullUrl, body: body.substring(0, 1000), method: "POST" }
    });

    if (body.includes("DeviceType=") && (!table || table === "NONE")) {
        return new NextResponse("RegistryCode=3985793847593\r\nServerVersion=2.4.1\r\nServerName=ADMS\r\nPushVersion=2.0.335\r\nOK\r\n", { 
            headers: { "Content-Type": "text/plain" } 
        });
    }

    const isLog = table === "ATTLOG" || table === "EVENT" || table === "rtlog" || body.includes("pin=");
    if (isLog) {
      const lines = body.split("\n").filter(l => l.trim().length > 0);
      const settings = await prisma.tenantSettings.findFirst();
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
        
        // INTERPRET AS BDT (+06:00) to fix timezone shift
        const punchTime = new Date(`${dateStr}T${timeStr}+06:00`);
        if (isNaN(punchTime.getTime())) continue;

        const numericId = parseInt(employeeCodeRaw).toString();
        const employee = await prisma.employee.findFirst({
          where: { OR: [{ employeeCode: employeeCodeRaw }, { employeeCode: numericId }, { fingerprintId: employeeCodeRaw }, { fingerprintId: numericId }] }
        });

        if (employee) {
          await prisma.$transaction(async (tx) => {
            const existing = await tx.attendance.findUnique({
              where: { employeeId_date: { employeeId: employee.id, date: dateOnly } }
            });

            // 4. Protection for manual HR edits
            if (existing && existing.isManual) return;

            let updateData: any = {};
            if (!existing) {
              updateData = { checkIn: punchTime, status: "PRESENT" };
            } else {
              // 2. 2-minute deduplication
              const diffMs = Math.abs(punchTime.getTime() - (existing.checkIn?.getTime() || 0));
              const diffMsOut = Math.abs(punchTime.getTime() - (existing.checkOut?.getTime() || 0));
              if (diffMs < 2 * 60 * 1000 || diffMsOut < 2 * 60 * 1000) return;

              // 3. First-In Last-Out Logic
              if (!existing.checkOut || punchTime > existing.checkOut) {
                // If there was already a checkOut, the old checkOut might become a break
                if (existing.checkOut) {
                    await tx.breakRecord.create({
                        data: { 
                          employeeId: employee.id, 
                          attendanceId: existing.id, 
                          date: dateOnly, 
                          startTime: existing.checkOut, 
                          endTime: punchTime, 
                          note: "Auto-detected break (middle punch)", 
                          status: "COMPLETED" 
                        }
                    });
                }
                updateData.checkOut = punchTime;
              } else if (punchTime < (existing.checkIn || new Date())) {
                updateData.checkIn = punchTime;
              } else {
                // Middle punch -> Record as BreakRecord
                await tx.breakRecord.create({
                    data: { 
                      employeeId: employee.id, 
                      attendanceId: existing.id, 
                      date: dateOnly, 
                      startTime: punchTime, 
                      endTime: punchTime, 
                      note: "Biometric middle punch", 
                      status: "COMPLETED" 
                    }
                });
              }
            }

            const finalCheckIn = updateData.checkIn || existing?.checkIn;
            const finalCheckOut = updateData.checkOut || existing?.checkOut;

            if (finalCheckIn) {
              updateData.status = calculateAttendanceStatus(
                finalCheckIn, finalCheckOut || null, threshold, lateThresholdTime, weeklySchedule, defaultInTime
              );
            }

            const record = await tx.attendance.upsert({
              where: { employeeId_date: { employeeId: employee.id, date: dateOnly } },
              update: updateData,
              create: { employeeId: employee.id, date: dateOnly, ...updateData, isManual: false }
            });

            await syncLeaveBalanceForAttendance(tx, employee.id, existing?.status, record.status, dateOnly);
          });
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
