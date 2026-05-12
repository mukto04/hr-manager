import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { holidaySchema } from "@/app/api/_helpers";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = holidaySchema.parse(await request.json());

    const holiday = await (await getTenantPrisma()).holiday.update({
      where: { id },
      data: {
        ...parsed,
        date: new Date(parsed.date)
      }
    });

    return NextResponse.json(holiday);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update holiday", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantPrisma()).holiday.delete({ where: { id } });
    return NextResponse.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete holiday", error }, { status: 400 });
  }
}
