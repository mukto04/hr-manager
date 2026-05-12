export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
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

    const prisma = await getTenantPrisma();
    
    // 1. Get Settings for mode check
    const settings = await prisma.tenantSettings.findFirst();
    if (settings && settings.autoLeaveDeduction === false) {
      return NextResponse.json({ message: "Automatic deduction is disabled in settings." }, { status: 400 });
    }

    // 2. Get active employees
    const employees = await prisma.employee.findMany({
      where: { status: "ACTIVE" },
      include: {
        leaveBalances: { where: { year } }
      }
    });

    // 3. Get Holidays
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);
    const today = startOfDay(new Date());
    
    // We only sync up to today (or end of month if in past)
    const syncEnd = isBefore(today, endDate) ? today : endDate;

    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: syncEnd
        }
      }
    });
    const holidayDates = new Set(holidays.map(h => format(h.date, "yyyy-MM-dd")));

    // 4. Get all attendance records for the period to find gaps
    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: syncEnd
        }
      }
    });

    // Map of employeeId -> Set of dates they were present
    const attendanceMap = new Map<string, Set<string>>();
    attendances.forEach(att => {
      if (!attendanceMap.has(att.employeeId)) {
        attendanceMap.set(att.employeeId, new Set());
      }
      attendanceMap.get(att.employeeId)?.add(format(att.date, "yyyy-MM-dd"));
    });

    // 5. Get existing LeaveRecords (Automatic category) to avoid double deduction
    const existingDeductions = await prisma.leaveRecord.findMany({
      where: {
        category: "AUTOMATIC",
        year,
        date: {
          gte: startDate,
          lte: syncEnd
        }
      }
    });
    const deductionMap = new Map<string, Set<string>>();
    existingDeductions.forEach(rec => {
      if (!deductionMap.has(rec.employeeId)) {
        deductionMap.set(rec.employeeId, new Set());
      }
      deductionMap.get(rec.employeeId)?.add(format(rec.date, "yyyy-MM-dd"));
    });

    const days = eachDayOfInterval({ start: startDate, end: syncEnd });
    let createdCount = 0;

    // 6. Process each employee
    for (const employee of employees) {
      const balance = employee.leaveBalances[0];
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

        // DEDUCT!
        await prisma.$transaction(async (tx) => {
          // Update Balance
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              dueLeave: { decrement: 1 }
            }
          });

          // Create Record
          await tx.leaveRecord.create({
            data: {
              employeeId: employee.id,
              date: startOfDay(day),
              amount: 1,
              type: "DEDUCTION",
              category: "AUTOMATIC",
              note: "Automatic Absent Deduction",
              year
            }
          });
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

