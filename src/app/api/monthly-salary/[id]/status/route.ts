export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { monthlySalaries, employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { isPaid, isHeld } = (await request.json()) as any;

    const dataToUpdate: any = { updatedAt: now() };
    if (isPaid !== undefined) dataToUpdate.isPaid = isPaid;
    if (isHeld !== undefined) dataToUpdate.isHeld = isHeld;

    if (Object.keys(dataToUpdate).length === 1) {
      // Only updatedAt was set — no real data provided
      return NextResponse.json({ message: "No data provided" }, { status: 400 });
    }

    const db = await getTenantDb();

    const updated = await db
      .update(monthlySalaries)
      .set(dataToUpdate)
      .where(eq(monthlySalaries.id, id))
      .returning()
      .get();

    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, updated.employeeId))
      .get();

    return NextResponse.json({ ...updated, employee });
  } catch (error) {
    return NextResponse.json({ message: "Failed to update status", error }, { status: 400 });
  }
}
