import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { leaveSchema } from "@/app/api/_helpers";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = leaveSchema.parse(await request.json());

    const leave = await (await getTenantPrisma()).leaveBalance.update({
      where: { id },
      data: parsed,
      include: { employee: true }
    });

    return NextResponse.json(leave);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update leave balance", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantPrisma()).leaveBalance.delete({ where: { id } });
    return NextResponse.json({ message: "Leave balance deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete leave balance", error }, { status: 400 });
  }
}
