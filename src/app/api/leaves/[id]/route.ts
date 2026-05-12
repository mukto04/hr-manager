export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { leaveBalances, employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { leaveSchema } from "@/app/api/_helpers";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = leaveSchema.parse((await request.json()) as any);

    const db = await getTenantDb();

    const leave = await db
      .update(leaveBalances)
      .set({ ...parsed, updatedAt: now() })
      .where(eq(leaveBalances.id, id))
      .returning()
      .get();

    // Fetch employee for include
    const employee = leave
      ? await db.select().from(employees).where(eq(employees.id, leave.employeeId)).get()
      : null;

    return NextResponse.json({ ...leave, employee });
  } catch (error) {
    return NextResponse.json({ message: "Failed to update leave balance", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = await getTenantDb();
    await db.delete(leaveBalances).where(eq(leaveBalances.id, id));
    return NextResponse.json({ message: "Leave balance deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete leave balance", error }, { status: 400 });
  }
}
