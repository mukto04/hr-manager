import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { advanceSalarySchema } from "@/app/api/_helpers";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = advanceSalarySchema.parse(await request.json());

    const advanceSalary = await (await getTenantPrisma()).advanceSalary.update({
      where: { id },
      data: parsed,
      include: { employee: true }
    });

    return NextResponse.json(advanceSalary);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update advance salary", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantPrisma()).advanceSalary.delete({ where: { id } });
    return NextResponse.json({ message: "Advance salary deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete advance salary", error }, { status: 400 });
  }
}
