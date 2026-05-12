export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { salaryStructures, employees, tenantSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { salarySchema, toSalaryPayload } from "@/app/api/_helpers";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = await getTenantDb();

    const salary = await db.select().from(salaryStructures).where(eq(salaryStructures.id, id)).get();

    if (!salary) {
      return NextResponse.json({ message: "Salary structure not found" }, { status: 404 });
    }

    const employee = await db.select().from(employees).where(eq(employees.id, salary.employeeId)).get();

    return NextResponse.json({ ...salary, employee });
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch salary structure", error }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = salarySchema.parse((await request.json()) as any);

    const db = await getTenantDb();
    const settings = await db.select().from(tenantSettings).limit(1).get();

    const payload = toSalaryPayload(parsed, settings?.salaryStructure);

    const salary = await db
      .update(salaryStructures)
      .set({ ...payload, updatedAt: now() })
      .where(eq(salaryStructures.id, id))
      .returning()
      .get();

    const employee = await db.select().from(employees).where(eq(employees.id, salary.employeeId)).get();

    return NextResponse.json({ ...salary, employee });
  } catch (error) {
    return NextResponse.json({ message: "Failed to update salary structure", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantDb()).delete(salaryStructures).where(eq(salaryStructures.id, id));
    return NextResponse.json({ message: "Salary structure deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete salary structure", error }, { status: 400 });
  }
}
