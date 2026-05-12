import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { startTime, endTime, note } = body;

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    let duration = 0;

    if (start && end) {
      duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    const recordDate = new Date(start);
    recordDate.setHours(0, 0, 0, 0);

    const breakRecord = await (await getTenantPrisma()).breakRecord.update({
      where: { id },
      data: {
        date: recordDate,
        startTime: start,
        endTime: end,
        duration,
        note,
      },
    });

    return NextResponse.json(breakRecord);
  } catch (error: any) {
    console.error("Error updating break record:", error);
    return NextResponse.json({ message: "Failed to update break record" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await (await getTenantPrisma()).breakRecord.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Break record deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting break record:", error);
    return NextResponse.json({ message: "Failed to delete break record" }, { status: 500 });
  }
}
