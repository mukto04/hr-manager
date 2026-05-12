import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { isPaid, isHeld } = await request.json();

    const dataToUpdate: any = {};
    if (isPaid !== undefined) dataToUpdate.isPaid = isPaid;
    if (isHeld !== undefined) dataToUpdate.isHeld = isHeld;

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ message: "No data provided" }, { status: 400 });
    }

    // Update the MonthlySalary record
    const updated = await (await getTenantPrisma()).monthlySalary.update({
      where: { id },
      data: dataToUpdate,
      include: { employee: true }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update status", error }, { status: 400 });
  }
}
