import type { DrizzleDB } from "@/lib/db";
import { leaveBalances, leaveRecords, tenantSettings } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { newId, now } from "@/lib/db";

export function calculateAttendanceStatus(
  checkIn: Date | null,
  checkOut: Date | null,
  halfDayThreshold: number = 420,
  lateThresholdTime?: string,
  weeklySchedule?: any[],
  defaultInTime?: string
): string {
  if (!checkIn || !checkOut) return "PRESENT";

  const durationMs = checkOut.getTime() - checkIn.getTime();
  const durationMins = durationMs / (1000 * 60);

  if (durationMins < 5) return "PRESENT";

  let finalLateThreshold = lateThresholdTime;

  if (weeklySchedule && weeklySchedule.length > 0 && defaultInTime) {
    try {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[checkIn.getDay()];
      const dayConfig = weeklySchedule.find(s => s.day === dayName);

      if (dayConfig && dayConfig.enabled) {
        const parseTime = (t: string) => {
          const [time, modifier] = t.split(" ");
          let [h, m] = time.split(":").map(Number);
          if (modifier === "PM" && h < 12) h += 12;
          if (modifier === "AM" && h === 12) h = 0;
          return h * 60 + m;
        };

        const globalInMins = parseTime(defaultInTime);
        const globalLateMins = parseTime(lateThresholdTime || defaultInTime);
        const graceMins = Math.max(0, globalLateMins - globalInMins);

        const dayInMins = parseTime(dayConfig.inTime);
        const dayLateMins = dayInMins + graceMins;

        const h = Math.floor(dayLateMins / 60);
        const m = dayLateMins % 60;
        finalLateThreshold = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
      } else if (dayConfig && !dayConfig.enabled) {
        return durationMins < halfDayThreshold ? "HALF_DAY" : "PRESENT";
      }
    } catch (e) {
      console.error("Failed to calculate dynamic late threshold:", e);
    }
  }

  if (finalLateThreshold) {
    try {
      const [time, modifier] = finalLateThreshold.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;

      const checkInTotalMins = checkIn.getHours() * 60 + checkIn.getMinutes();
      const thresholdTotalMins = hours * 60 + minutes;

      if (checkInTotalMins > thresholdTotalMins) {
        if (durationMins < halfDayThreshold) return "HALF_DAY";
        return "LATE";
      }
    } catch (e) {
      console.error("Failed to parse finalLateThreshold:", e);
    }
  }

  if (durationMins < halfDayThreshold) return "HALF_DAY";

  return "PRESENT";
}

export async function syncLeaveBalanceForAttendance(
  db: DrizzleDB,
  employeeId: string,
  oldStatus: string | null | undefined,
  newStatus: string,
  date: Date
) {
  const year = date.getFullYear();
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dateStr = d.toISOString().split('T')[0];

  const settings = await db.select().from(tenantSettings).limit(1).get();
  if (settings && settings.autoLeaveDeduction === false) {
    console.log(`[LeaveSync] Skipping automatic deduction for employee ${employeeId} as manual mode is enabled.`);
    return;
  }

  const balance = await db.select().from(leaveBalances)
    .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, year)))
    .get();

  if (!balance) return;

  let adjustment = 0;

  const existingRecord = await db.select().from(leaveRecords)
    .where(and(
      eq(leaveRecords.employeeId, employeeId),
      sql`substr(${leaveRecords.date}, 1, 10) = ${dateStr}`,
      eq(leaveRecords.category, "AUTOMATIC"),
      eq(leaveRecords.type, "DEDUCTION")
    ))
    .limit(1)
    .get();

  if (existingRecord) {
    adjustment += existingRecord.amount;
    await db.delete(leaveRecords).where(eq(leaveRecords.id, existingRecord.id));
    console.log(`[LeaveSync] Refunding existing ${existingRecord.amount} day deduction for ${employeeId} on ${dateStr}`);
  }

  let newDeductionAmount = 0;
  if (newStatus === "HALF_DAY") {
    newDeductionAmount = 0.5;
  } else if (newStatus === "ABSENT") {
    newDeductionAmount = 1.0;
  }

  if (newDeductionAmount > 0) {
    adjustment -= newDeductionAmount;
    await db.insert(leaveRecords).values({
      id: newId(),
      employeeId,
      date: d.toISOString(),
      amount: newDeductionAmount,
      type: "DEDUCTION",
      category: "AUTOMATIC",
      note: newDeductionAmount === 1.0 ? 'Automatic Absent Deduction' : 'Automatic Half-Day Deduction',
      year,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  if (adjustment !== 0) {
    await db.update(leaveBalances)
      .set({
        dueLeave: sql`${leaveBalances.dueLeave} + ${adjustment}`,
        updatedAt: now(),
      })
      .where(eq(leaveBalances.id, balance.id));

    console.log(`[LeaveSync] Employee ${employeeId}: Net adjustment of ${adjustment} for ${dateStr} (Status: ${oldStatus} -> ${newStatus})`);
  }
}
