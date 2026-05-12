export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { leaveRecords, leaveBalances } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const year = searchParams.get("year");

  if (!employeeId || !year) {
    return NextResponse.json({ message: "Employee ID and Year are required" }, { status: 400 });
  }

  try {
    const db = await getTenantDb();
    const records = await db
      .select()
      .from(leaveRecords)
      .where(and(eq(leaveRecords.employeeId, employeeId), eq(leaveRecords.year, parseInt(year))))
      .orderBy(desc(leaveRecords.date));

    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch leave history" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "ID is required" }, { status: 400 });
  }

  try {
    const db = await getTenantDb();

    // Find the record to know how much to refund
    const record = await db
      .select()
      .from(leaveRecords)
      .where(eq(leaveRecords.id, id))
      .limit(1)
      .get();

    if (!record) return NextResponse.json({ message: "Record not found" }, { status: 404 });

    // 1. Delete record
    await db.delete(leaveRecords).where(eq(leaveRecords.id, id));

    // 2. Refund balance
    const balance = await db
      .select()
      .from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, record.employeeId), eq(leaveBalances.year, record.year)))
      .limit(1)
      .get();

    if (balance) {
      const refundAmount = record.type === "DEDUCTION" ? record.amount : -record.amount;
      await db
        .update(leaveBalances)
        .set({
          dueLeave: sql`${leaveBalances.dueLeave} + ${refundAmount}`,
          updatedAt: now()
        })
        .where(eq(leaveBalances.id, balance.id));
    }

    return NextResponse.json({ message: "Leave record deleted and balance refunded" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete leave record" }, { status: 500 });
  }
}
