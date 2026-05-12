export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
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
    
    const dateRange = {
      gte: filterDate,
      lt: nextDay,
    };

    // 1. Get all active employees
    const activeEmployees = await (await getTenantPrisma()).employee.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        designation: true,
        department: true,
      },
      orderBy: {
        joiningDate: 'asc'
      }
    });

    // 2. Get attendance records for the selected date
    const attendances = await (await getTenantPrisma()).attendance.findMany({
      where: {
        date: dateRange
      }
    });

    // 3. Merge data
    const mergedData = activeEmployees.map(employee => {
      const attendance = attendances.find(a => a.employeeId === employee.id);
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
    const body = await request.json();
    const { employeeId, date, checkIn, checkOut, status, isManual, note } = body;

    if (!employeeId || !date) {
      return NextResponse.json({ message: "Employee ID and Date are required" }, { status: 400 });
    }

    const parts = date.split("-");
    const parsedDate = parts.length === 3 
      ? new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), -6, 0, 0, 0))
      : new Date(date);

    const checkInDate = checkIn ? new Date(checkIn) : null;
    const checkOutDate = checkOut ? new Date(checkOut) : null;

    const prisma = await getTenantPrisma();

    const attendance = await prisma.$transaction(async (tx) => {
      // 1. Get existing record and settings
      const existing = await tx.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId,
            date: parsedDate,
          }
        }
      });

      const settings = await tx.tenantSettings.findFirst();
      const threshold = settings?.halfDayThreshold || 420;
      const lateThresholdTime = settings?.lateThresholdTime;
      const weeklySchedule = settings?.weeklySchedule as any[];
      const defaultInTime = settings?.defaultInTime;

      // 2. Determine new status
      let finalStatus = status;
      // If we have times, we should calculate the status automatically unless it's a specific manual override like "HALF_DAY" that the user chose
      // But usually, if they set times, they want the system to determine if it's LATE or PRESENT
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

      // 3. Upsert attendance
      const record = await tx.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date: parsedDate,
          }
        },
        update: {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          status: finalStatus,
          isManual: isManual !== undefined ? isManual : true,
          note,
        },
        create: {
          employeeId,
          date: parsedDate,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          status: finalStatus,
          isManual: isManual !== undefined ? isManual : true,
          note,
        }
      });

      // 4. Sync Leave Balance
      await syncLeaveBalanceForAttendance(tx, employeeId, existing?.status, finalStatus, parsedDate);

      return record;
    });

    return NextResponse.json(attendance);
  } catch (error: any) {
    console.error("Error creating/updating attendance:", error);
    return NextResponse.json({ message: error.message || "Failed to save attendance" }, { status: 500 });
  }
}

