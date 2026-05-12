import { PrismaClient } from "@prisma/client";

/**
 * Calculates the attendance status based on work duration.
 * Rule: < 7 hours (420 mins) = HALF_DAY, >= 7 hours = PRESENT
 * Threshold: > 5 mins for any record.
 */
/**
 * Calculates the attendance status based on work duration and start time.
 * Rule: 
 * 1. Start Time > Late Threshold = LATE (if duration >= halfDayThreshold)
 * 2. Duration < 7 hours (420 mins) = HALF_DAY
 * 3. Duration >= 7 hours = PRESENT
 */
export function calculateAttendanceStatus(
  checkIn: Date | null, 
  checkOut: Date | null, 
  halfDayThreshold: number = 420,
  lateThresholdTime?: string, // e.g., "09:15 AM"
  weeklySchedule?: any[],
  defaultInTime?: string // e.g., "09:00 AM"
): string {
  if (!checkIn || !checkOut) return "PRESENT"; 

  const durationMs = checkOut.getTime() - checkIn.getTime();
  const durationMins = durationMs / (1000 * 60);

  if (durationMins < 5) return "PRESENT"; 

  // Check for LATE
  // 1. Determine the threshold for the current day
  let finalLateThreshold = lateThresholdTime;

  if (weeklySchedule && weeklySchedule.length > 0 && defaultInTime) {
    try {
      // Get current day name in BDT
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[checkIn.getDay()];

      const dayConfig = weeklySchedule.find(s => s.day === dayName);
      
      if (dayConfig && dayConfig.enabled) {
        // Calculate grace period from global defaults
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

        // Apply grace to day-specific InTime
        const dayInMins = parseTime(dayConfig.inTime);
        const dayLateMins = dayInMins + graceMins;

        // Convert back to string for the existing parsing logic below
        const h = Math.floor(dayLateMins / 60);
        const m = dayLateMins % 60;
        finalLateThreshold = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
      } else if (dayConfig && !dayConfig.enabled) {
        // If day is disabled (Weekend), it shouldn't be LATE? 
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

/**
 * Syncs the leave balance based on attendance status transitions.
 * - From anything to HALF_DAY: Deduct 0.5
 * - From HALF_DAY to anything else: Refund 0.5
 */
export async function syncLeaveBalanceForAttendance(
  tx: any, // Prisma Transaction Client
  employeeId: string,
  oldStatus: string | null | undefined,
  newStatus: string,
  date: Date
) {
  const year = date.getFullYear();
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // 1. Check if auto leave deduction is enabled
  const settings = await tx.tenantSettings.findFirst();
  if (settings && settings.autoLeaveDeduction === false) {
    console.log(`[LeaveSync] Skipping automatic deduction for employee ${employeeId} as manual mode is enabled.`);
    return;
  }

  // 2. Get current leave balance
  const balance = await tx.leaveBalance.findUnique({
    where: { employeeId_year: { employeeId, year } }
  });

  if (!balance) return;

  let adjustment = 0;

  // 3. Check for ANY existing AUTOMATIC DEDUCTION record for this date
  // This covers cases where they were previously ABSENT (1.0) or HALF_DAY (0.5)
  const existingRecord = await tx.leaveRecord.findFirst({
    where: {
      employeeId,
      date: d,
      category: "AUTOMATIC",
      type: "DEDUCTION"
    }
  });

  if (existingRecord) {
    // Refund the existing deduction first
    adjustment += existingRecord.amount;
    await tx.leaveRecord.delete({
      where: { id: existingRecord.id }
    });
    console.log(`[LeaveSync] Refunding existing ${existingRecord.amount} day deduction for ${employeeId} on ${d.toISOString().split('T')[0]}`);
  }

  // 4. Determine if the new status warrants a deduction
  let newDeductionAmount = 0;
  if (newStatus === "HALF_DAY") {
    newDeductionAmount = 0.5;
  } else if (newStatus === "ABSENT") {
    newDeductionAmount = 1.0;
  }

  if (newDeductionAmount > 0) {
    adjustment -= newDeductionAmount;
    
    // Create new automatic deduction record
    await tx.leaveRecord.create({
      data: {
        employeeId,
        date: d,
        amount: newDeductionAmount,
        type: "DEDUCTION",
        category: "AUTOMATIC",
        note: newDeductionAmount === 1.0 ? 'Automatic Absent Deduction' : 'Automatic Half-Day Deduction',
        year
      }
    });
  }

  // 5. Apply net adjustment to balance
  if (adjustment !== 0) {
    await tx.leaveBalance.update({
      where: { id: balance.id },
      data: {
        dueLeave: {
          increment: adjustment
        }
      }
    });

    console.log(`[LeaveSync] Employee ${employeeId}: Net adjustment of ${adjustment} for ${d.toISOString().split('T')[0]} (Status: ${oldStatus} -> ${newStatus})`);
  }
}
