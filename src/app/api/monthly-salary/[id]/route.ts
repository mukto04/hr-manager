import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { monthlySalarySchema, toMonthlySalaryPayload } from "@/app/api/_helpers";
import { createNotification } from "@/lib/notify";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = monthlySalarySchema.parse(await request.json());

    // Fetch previous state to know if it was just marked as paid
    const prisma = await getTenantPrisma();
    const previous = await prisma.monthlySalary.findUnique({ where: { id } });

    const item = await prisma.monthlySalary.update({
      where: { id },
      data: toMonthlySalaryPayload(parsed),
      include: { employee: true }
    });

    // Notify if marked as paid
    if (item.isPaid && previous && !previous.isPaid) {
      await createNotification({
        employeeId: item.employeeId,
        title: "Salary Processed",
        message: `Your salary for ${new Date(item.year, item.month - 1).toLocaleString('default', { month: 'long' })} ${item.year} has been processed and paid.`,
        type: "SALARY"
      });
    }

    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update monthly salary", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantPrisma()).monthlySalary.delete({ where: { id } });
    return NextResponse.json({ message: "Monthly salary deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete monthly salary", error }, { status: 400 });
  }
}
