export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    
    // Machine usually sends employee identifier and timestamp
    const { employeeCode, timestamp } = body;

    if (!employeeCode || !timestamp) {
      return NextResponse.json({ message: "employeeCode and timestamp are required" }, { status: 400 });
    }

    // 1. Try to find employee by fingerprintId first (most common for machine sync)
    // 2. Fallback to employeeCode
    // @ts-ignore
    const employee = await (await getTenantPrisma()).employee.findFirst({
      where: {
        OR: [
          // @ts-ignore
          { fingerprintId: employeeCode },
          { employeeCode: employeeCode }
        ]
      }
    });

    if (!employee) {
      return NextResponse.json({ message: `Employee not found for code/id: ${employeeCode}` }, { status: 404 });
    }

    const punchTime = new Date(timestamp);
    const dateStr = new Date(punchTime);
    dateStr.setHours(0,0,0,0);

    // Retrieve existing attendance for the day
    const existing = await (await getTenantPrisma()).attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: dateStr,
        }
      }
    });

    let attendance;

      if (!existing) {
        // First punch of the day: Check In
        attendance = await (await getTenantPrisma()).attendance.create({
          data: {
            employeeId: employee.id,
            date: dateStr,
            checkIn: punchTime,
            status: "PRESENT",
            isManual: false,
          }
        });
      } else if (existing.isManual) {
        // Manual data takes precedence. Do not overwrite.
        attendance = existing;
      } else {
        // Subsequent punch: Determine if it's a new Check-In or a new Check-Out
        let updateData: any = {};
        
        // If this punch is EARLIER than recorded checkIn, update checkIn
        if (!existing.checkIn || punchTime < existing.checkIn) {
        updateData.checkIn = punchTime;
      }
      
      // Only set or update checkOut if it's significantly later than checkIn (e.g. 5 mins)
      const effectiveCheckIn = updateData.checkIn || existing.checkIn;
      const isCheckoutNewer = !existing.checkOut || punchTime > existing.checkOut;
      const isAfterThreshold = punchTime.getTime() - new Date(effectiveCheckIn).getTime() >= 5 * 60 * 1000;

      if (isCheckoutNewer && isAfterThreshold) {
        updateData.checkOut = punchTime;
      }

      if (Object.keys(updateData).length > 0) {
        attendance = await (await getTenantPrisma()).attendance.update({
          where: { id: existing.id },
          data: {
            ...updateData,
            isManual: false,
          }
        });
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

