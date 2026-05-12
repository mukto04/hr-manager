export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { employees, holidays, monthlySalaries, loans, officeCosts, attendances, leaveRecords, tenantSettings } from "@/lib/db/schema";
import { eq, and, gte, lte, gt, or, asc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : (new Date().getMonth() + 1);
    const year = searchParams.get("year") ? Number(searchParams.get("year")) : new Date().getFullYear();

    // Pre-resolve DB client once to avoid parallel session lookups
    const db = await getTenantDb();

    const [empList, allHolidays, empMonthlySalaries, activeLoans, empOfficeCosts] = await Promise.all([
      db
        .select()
        .from(employees)
        .where(eq(employees.status, "ACTIVE"))
        .orderBy(asc(employees.name)),
      db.select().from(holidays),
      db
        .select()
        .from(monthlySalaries)
        .where(and(eq(monthlySalaries.month, month), eq(monthlySalaries.year, year))),
      db
        .select()
        .from(loans)
        .where(gt(loans.dueAmount, 0)),
      db
        .select()
        .from(officeCosts)
        .where(and(eq(officeCosts.month, month), eq(officeCosts.year, year)))
    ]);

    // Attendance Today (Relative to BDT 00:00)
    const bdtDate = new Date(new Date().getTime() + 6 * 60 * 60 * 1000);
    const startOfToday = new Date(Date.UTC(bdtDate.getUTCFullYear(), bdtDate.getUTCMonth(), bdtDate.getUTCDate(), -6, 0, 0, 0));
    const endOfToday = new Date(Date.UTC(bdtDate.getUTCFullYear(), bdtDate.getUTCMonth(), bdtDate.getUTCDate(), 17, 59, 59, 999));

    const [todayAttendance, todayLeaves, settings] = await Promise.all([
      db
        .select()
        .from(attendances)
        .where(
          and(
            gte(attendances.date, startOfToday.toISOString()),
            lte(attendances.date, endOfToday.toISOString())
          )
        ),
      db
        .select()
        .from(leaveRecords)
        .where(
          or(
            and(gte(leaveRecords.date, startOfToday.toISOString()), lte(leaveRecords.date, endOfToday.toISOString())),
            and(lte(leaveRecords.date, startOfToday.toISOString()), gte(leaveRecords.toDate as any, startOfToday.toISOString()))
          )
        ),
      db.select().from(tenantSettings).get()
    ]);

    // Parse defaultInTime (e.g. "09:00 AM")
    const parseTimeToMinutes = (timeStr: string) => {
      const [time, modifier] = timeStr.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const defaultInTimeStr = settings?.defaultInTime || "09:00 AM";
    const inTimeMinutes = parseTimeToMinutes(defaultInTimeStr);
    const lateThresholdMinutes = inTimeMinutes + 60; // 1 hour buffer

    const lateCount = todayAttendance.filter(a => {
      if (!a.checkIn) return false;
      // Convert UTC checkIn to BDT for comparison
      const bdtCheckIn = new Date(new Date(a.checkIn).getTime() + 6 * 60 * 60 * 1000);
      const checkInMinutes = bdtCheckIn.getUTCHours() * 60 + bdtCheckIn.getUTCMinutes();
      return checkInMinutes > lateThresholdMinutes;
    }).length;

    const presentCount = todayAttendance.filter(a => ["PRESENT", "LATE", "HALF_DAY"].includes(a.status) || a.checkIn).length;
    const onLeaveCount = todayLeaves.length;
    const absentCount = Math.max(0, empList.length - (presentCount + onLeaveCount));

    const birthdays = empList.filter((employee) => new Date(employee.dateOfBirth).getMonth() === (month - 1));
    const anniversaries = empList.filter((employee) => new Date(employee.joiningDate).getMonth() === (month - 1));
    const holidaysThisMonth = allHolidays.filter(
      (holiday) => new Date(holiday.date).getMonth() === (month - 1) && new Date(holiday.date).getFullYear() === year
    ).length;

    const salaryExpenseSummary = empMonthlySalaries.reduce((sum, item) => sum + item.payableSalary, 0);
    const pendingLoans = activeLoans.reduce((sum, item) => sum + item.dueAmount, 0);
    const currentMonthOfficeCost = empOfficeCosts.reduce((sum, item) => {
      return sum + item.bazarCost + item.extraCost + item.recurringCost + item.capitalCost;
    }, 0);

    return NextResponse.json({
      totalEmployees: empList.length,
      birthdaysThisMonth: birthdays.length,
      anniversariesThisMonth: anniversaries.length,
      holidaysThisMonth,
      salaryExpenseSummary,
      pendingLeaves: 0,
      pendingLoans,
      currentMonthOfficeCost,
      birthdayEmployees: birthdays.map((item) => ({ id: item.id, name: item.name, date: item.dateOfBirth })),
      anniversaryEmployees: anniversaries.map((item) => ({ id: item.id, name: item.name, date: item.joiningDate })),
      expenseChart: [
        { name: "Salary", amount: salaryExpenseSummary },
        { name: "Off. Cost", amount: currentMonthOfficeCost },
        { name: "Loans", amount: pendingLoans }
      ],
      attendanceToday: {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        onLeave: onLeaveCount
      }
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error.message);
    if (error.message && error.message.includes("ACCOUNT_FROZEN")) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: `Dashboard error: ${error.message}` },
      { status: 500 }
    );
  }
}
