export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET(request: NextRequest) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

  try {
    const prisma = await getTenantPrisma();
    
    // Bangladesh Time (BDT) is UTC+6
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, -6, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 17, 59, 59, 999));

    // Parallel fetch for speed
    const [attendances, holidays, breakRecords, settings] = await Promise.all([
      prisma.attendance.findMany({
        where: { employeeId, date: { gte: startOfMonth, lte: endOfMonth } }
      }),
      prisma.holiday.findMany({
        where: { date: { gte: startOfMonth, lte: endOfMonth } }
      }),
      prisma.breakRecord.findMany({
        where: { employeeId, date: { gte: startOfMonth, lte: endOfMonth } }
      }),
      prisma.tenantSettings.findFirst()
    ]);

    const breakMap = new Map();
    breakRecords.forEach(b => {
      const day = parseInt(new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(b.date)));
      breakMap.set(day, (breakMap.get(day) || 0) + b.duration);
    });

    const attMap = new Map();
    attendances.forEach(a => {
      const day = parseInt(new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(a.date)));
      attMap.set(day, a);
    });

    const holMap = new Map();
    holidays.forEach(h => {
      const day = parseInt(new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(h.date)));
      holMap.set(day, h);
    });

    const records = [];
    let presentCount = 0;
    let absentCount = 0;
    let totalWorkingMins = 0;
    let validWorkingDaysForAvg = 0;

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      const currentD = new Date(year, month - 1, d);
      const isWeekend = currentD.getDay() === 0 || currentD.getDay() === 6;
      
      let status = "ABSENT";
      let checkIn = null;
      let checkOut = null;
      let note = "";

      const att = attMap.get(d);
      const hol = holMap.get(d);

      if (att) {
        status = att.status;
        checkIn = att.checkIn;
        checkOut = att.checkOut;
        note = att.note;
        
        if (["PRESENT", "LATE", "HALF_DAY"].includes(status)) {
          presentCount += (status === "HALF_DAY" ? 0.5 : 1.0);
          
          if (checkIn && checkOut) {
            const ci = new Date(checkIn);
            const co = new Date(checkOut);
            
            // Only calculate if checkOut is actually after checkIn
            if (co.getTime() > ci.getTime()) {
              let dailyMins = Math.floor((co.getTime() - ci.getTime()) / 60000);
              
              // Subtract break duration for this day
              const breakMins = breakMap.get(d) || 0;
              dailyMins = Math.max(0, dailyMins - breakMins);
              
              totalWorkingMins += dailyMins;
            }
          }
        }
      } else {
        if (isWeekend) status = "WEEKEND";
        else if (hol) {
          status = "HOLIDAY";
          note = hol.name;
        }
      }
      
      if (!att && status === "ABSENT") {
        if (currentD > today) status = "UPCOMING";
        else absentCount++;
      }

      records.push({
        id: att?.id || `virtual-${d}`,
        date: currentD.toISOString(),
        status,
        checkIn,
        checkOut,
        note
      });
    }

    const avgWorkingHoursDecimal = presentCount > 0 ? (totalWorkingMins / 60) / presentCount : 0;
    let avgWorkingHoursStr = "-";
    if (avgWorkingHoursDecimal > 0) {
      const h = Math.floor(avgWorkingHoursDecimal);
      const m = Math.round((avgWorkingHoursDecimal - h) * 60);
      avgWorkingHoursStr = `${h}h ${m}m`;
    }

    return NextResponse.json({
      summary: {
        totalDays: endOfMonth.getDate(),
        presentCount,
        absentCount,
        avgWorkingHours: avgWorkingHoursStr,
        reqWorkingTime: settings?.avgRequestTime || "09:00"
      },
      records: records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    });
  } catch (error) {
    console.error("Attendance API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

