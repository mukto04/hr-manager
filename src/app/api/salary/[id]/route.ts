export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { salarySchema, toSalaryPayload } from "@/app/api/_helpers";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const salary = await (await getTenantPrisma()).salaryStructure.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!salary) {
      return NextResponse.json({ message: "Salary structure not found" }, { status: 404 });
    }

    return NextResponse.json(salary);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch salary structure", error }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = salarySchema.parse((await request.json()) as any);

    const prisma = await getTenantPrisma();
    const settings = await prisma.tenantSettings.findFirst();

    const salary = await prisma.salaryStructure.update({
      where: { id },
      data: toSalaryPayload(parsed, settings?.salaryStructure) as any,
      include: { employee: true }
    });

    return NextResponse.json(salary);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update salary structure", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantPrisma()).salaryStructure.delete({ where: { id } });
    return NextResponse.json({ message: "Salary structure deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete salary structure", error }, { status: 400 });
  }
}
