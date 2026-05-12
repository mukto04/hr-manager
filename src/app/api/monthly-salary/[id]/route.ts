export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { monthlySalaries, employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { monthlySalarySchema, toMonthlySalaryPayload } from "@/app/api/_helpers";
import { createNotification } from "@/lib/notify";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = monthlySalarySchema.parse((await request.json()) as any);

    const db = await getTenantDb();

    // Fetch previous state to know if it was just marked as paid
    const previous = await db
      .select()
      .from(monthlySalaries)
      .where(eq(monthlySalaries.id, id))
      .get();

    const payload = toMonthlySalaryPayload(parsed);

    const item = await db
      .update(monthlySalaries)
      .set({ ...payload, updatedAt: now() })
      .where(eq(monthlySalaries.id, id))
      .returning()
      .get();

    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, item.employeeId))
      .get();

    const result = { ...item, employee };

    // Notify if marked as paid
    if (item.isPaid && previous && !previous.isPaid) {
      await createNotification({
        employeeId: item.employeeId,
        title: "Salary Processed",
        message: `Your salary for ${new Date(item.year, item.month - 1).toLocaleString("default", { month: "long" })} ${item.year} has been processed and paid.`,
        type: "SALARY",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update monthly salary", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantDb()).delete(monthlySalaries).where(eq(monthlySalaries.id, id));
    return NextResponse.json({ message: "Monthly salary deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete monthly salary", error }, { status: 400 });
  }
}
