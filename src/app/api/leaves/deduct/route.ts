export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { leaveRecords, leaveBalances } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createNotification } from "@/lib/notify";

export async function POST(request: NextRequest) {
  try {
    const { employeeId, fromDate, toDate, note, amount } = (await request.json()) as any;

    if (!employeeId || !fromDate || !amount) {
      return NextResponse.json({ message: "Employee, Date and Amount are required" }, { status: 400 });
    }

    const start = new Date(fromDate);
    const end = toDate ? new Date(toDate) : null;
    const year = start.getFullYear();

    const db = await getTenantDb();

    // 1. Find Leave Balance
    const balance = await db
      .select()
      .from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, year)))
      .limit(1)
      .get();

    if (!balance) {
      throw new Error(`No leave balance found for year ${year}. Please generate balances first.`);
    }

    // 2. Create Leave Record
    await db.insert(leaveRecords).values({
      id: newId(),
      employeeId,
      date: start.toISOString(),
      toDate: end ? end.toISOString() : null,
      amount: parseFloat(amount),
      type: "DEDUCTION",
      category: "MANUAL",
      note,
      year,
      createdAt: now(),
      updatedAt: now()
    });

    // 3. Update Leave Balance (decrement dueLeave)
    await db
      .update(leaveBalances)
      .set({
        dueLeave: sql`${leaveBalances.dueLeave} - ${parseFloat(amount)}`,
        updatedAt: now()
      })
      .where(eq(leaveBalances.id, balance.id));

    // Notify Employee
    await createNotification({
      employeeId,
      title: "Leave Deducted",
      message: `${amount} day(s) leave has been manually deducted by HR. Note: ${note || 'None'}`,
      type: "LEAVE"
    });

    return NextResponse.json({ message: "Leave deducted successfully" });
  } catch (error: any) {
    console.error("Deduct Leave Error:", error);
    return NextResponse.json({ message: error.message || "Failed to deduct leave" }, { status: 500 });
  }
}
