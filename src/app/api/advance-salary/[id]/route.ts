export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { advanceSalaries, employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { advanceSalarySchema } from "@/app/api/_helpers";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = advanceSalarySchema.parse((await request.json()) as any);

    const db = await getTenantDb();

    const advanceSalary = await db
      .update(advanceSalaries)
      .set({ ...parsed, updatedAt: now() })
      .where(eq(advanceSalaries.id, id))
      .returning()
      .get();

    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, advanceSalary.employeeId))
      .get();

    return NextResponse.json({ ...advanceSalary, employee });
  } catch (error) {
    return NextResponse.json({ message: "Failed to update advance salary", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantDb()).delete(advanceSalaries).where(eq(advanceSalaries.id, id));
    return NextResponse.json({ message: "Advance salary deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete advance salary", error }, { status: 400 });
  }
}
