import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

export async function POST(request: NextRequest) {
  try {
    const { employeeId, fromDate, toDate, note, amount } = await request.json();

    if (!employeeId || !fromDate || !amount) {
      return NextResponse.json({ message: "Employee, Date and Amount are required" }, { status: 400 });
    }

    const start = new Date(fromDate);
    const end = toDate ? new Date(toDate) : null;
    const year = start.getFullYear();

    const prisma = await getTenantPrisma();

    await prisma.$transaction(async (tx) => {
      // 1. Create Leave Record
      await tx.leaveRecord.create({
        data: {
          employeeId,
          date: start,
          toDate: end,
          amount: parseFloat(amount),
          type: "DEDUCTION",
          category: "MANUAL",
          note,
          year
        }
      });

      // 2. Update Leave Balance
      const balance = await tx.leaveBalance.findUnique({
        where: { employeeId_year: { employeeId, year } }
      });

      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            dueLeave: {
              decrement: parseFloat(amount)
            }
          }
        });
      } else {
        throw new Error(`No leave balance found for year ${year}. Please generate balances first.`);
      }
    });

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
