export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { attendances, employees, holidays, breakRecords } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { endOfMonth, eachDayOfInterval, format, isSaturday, isSunday } from "date-fns";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    // Create BDT (UTC+6) relative dates
    // 00:00 BDT = 18:00 UTC of previous day
    const startDate = new Date(Date.UTC(year, month - 1, 1, -6, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 17, 59, 59, 999)); // Last day of month 23:59:59 BDT

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    const daysInMonth = eachDayOfInterval({
      start: new Date(year, month - 1, 1),
      end: endOfMonth(new Date(year, month - 1, 1))
    });

    const db = await getTenantDb();

    // Fetch all active employees
    const allEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.status, "ACTIVE"));
    // sort by employeeCode
    allEmployees.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode));

    // Fetch all attendance for this month
    const allAttendances = await db
      .select()
      .from(attendances)
      .where(and(gte(attendances.date, startDateStr), lte(attendances.date, endDateStr)));

    // Fetch all holidays for this month
    const allHolidays = await db
      .select()
      .from(holidays)
      .where(and(gte(holidays.date, startDateStr), lte(holidays.date, endDateStr)));

    // Fetch all break records for this month
    const allBreaks = await db
      .select()
      .from(breakRecords)
      .where(and(gte(breakRecords.date, startDateStr), lte(breakRecords.date, endDateStr)));

    // Precompute holidays as a map for O(1) lookups
    const holidayMap = new Map(allHolidays.map(h => [format(new Date(new Date(h.date).getTime() + 12 * 60 * 60 * 1000), "yyyy-MM-dd"), h]));

    const reportData = allEmployees.map(employee => {
      const employeeAttendances = allAttendances.filter(a => a.employeeId === employee.id);
      const attMap = new Map(employeeAttendances.map(a => [format(new Date(new Date(a.date).getTime() + 12 * 60 * 60 * 1000), "yyyy-MM-dd"), a]));

      const employeeBreaks = allBreaks.filter(b => b.employeeId === employee.id);
      const breakMap = new Map<string, number>();
      employeeBreaks.forEach(b => {
        const key = format(new Date(new Date(b.date).getTime() + 12 * 60 * 60 * 1000), "yyyy-MM-dd");
        breakMap.set(key, (breakMap.get(key) || 0) + b.duration);
      });

      let presentCount = 0;
      let totalWorkingMs = 0;
      let totalBreakMins = 0;
      const dailyRecords: Record<string, any> = {};

      daysInMonth.forEach(day => {
        const dateKey = format(day, "yyyy-MM-dd");
        const att = attMap.get(dateKey);
        const holiday = holidayMap.get(dateKey);
        const isWeekend = isSaturday(day) || isSunday(day);

        let status = "ABSENT";
        let countsAsPresent = false;

        if (att) {
          status = att.status;
          const isPresentLike = status === "PRESENT" || status === "LATE" || status === "HALF_DAY";

          if (isPresentLike) {
            const weight = status === "HALF_DAY" ? 0.5 : 1.0;
            presentCount += weight;
            countsAsPresent = true;

            if (att.checkIn && att.checkOut) {
              const ci = new Date(att.checkIn as string);
              const co = new Date(att.checkOut as string);

              if (co.getTime() > ci.getTime()) {
                let dailyDurationMs = co.getTime() - ci.getTime();

                // Subtract breaks
                const breakMins = breakMap.get(dateKey) || 0;
                totalBreakMins += breakMins;
                dailyDurationMs = Math.max(0, dailyDurationMs - (breakMins * 60 * 1000));

                totalWorkingMs += dailyDurationMs * weight;
              }
            }
          }
        } else if (isWeekend || holiday) {
          status = "WEEKEND";
        }

        dailyRecords[dateKey] = {
          checkIn: att?.checkIn || null,
          checkOut: att?.checkOut || null,
          status: status,
          isWeekendOrHoliday: isWeekend || !!holiday,
          holidayName: holiday?.name || null,
          countsAsPresent: countsAsPresent,
        };
      });

      const avgWorkingHours = presentCount > 0 ? (totalWorkingMs / (1000 * 60 * 60)) / presentCount : 0;
      const absentCount = daysInMonth.filter(day => {
        const dateKey = format(day, "yyyy-MM-dd");
        const rec = dailyRecords[dateKey];
        return !rec.countsAsPresent && !rec.isWeekendOrHoliday;
      }).length;

      return {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        designation: employee.designation,
        department: employee.department,
        records: dailyRecords,
        summary: {
          present: presentCount,
          absent: absentCount,
          totalBreakHours: parseFloat((totalBreakMins / 60).toFixed(2)),
          avgWorkingHours: parseFloat(avgWorkingHours.toFixed(2))
        }
      };
    });

    return NextResponse.json({
      dates: daysInMonth.map(d => ({
        full: format(d, "yyyy-MM-dd"),
        day: format(d, "dd"),
        month: format(d, "MMM"),
        isWeekend: isSaturday(d) || isSunday(d)
      })),
      report: reportData
    });

  } catch (error: any) {
    console.error("Error creating matrix report:", error);
    return NextResponse.json({ message: error.message || "Failed to generate report" }, { status: 500 });
  }
}
