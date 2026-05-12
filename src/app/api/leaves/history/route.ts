export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId");
  const year = searchParams.get("year");

  if (!employeeId || !year) {
    return NextResponse.json({ message: "Employee ID and Year are required" }, { status: 400 });
  }

  try {
    const prisma = await getTenantPrisma();
    const records = await prisma.leaveRecord.findMany({
      where: {
        employeeId,
        year: parseInt(year)
      },
      orderBy: { date: "desc" }
    });

    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch leave history" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "ID is required" }, { status: 400 });
  }

  try {
    const prisma = await getTenantPrisma();
    
    // Find the record to know how much to refund
    const record = await prisma.leaveRecord.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ message: "Record not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // 1. Delete record
      await tx.leaveRecord.delete({ where: { id } });

      // 2. Refund balance
      const balance = await tx.leaveBalance.findUnique({
        where: { employeeId_year: { employeeId: record.employeeId, year: record.year } }
      });

      if (balance) {
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            dueLeave: {
              increment: record.type === "DEDUCTION" ? record.amount : -record.amount
            }
          }
        });
      }
    });

    return NextResponse.json({ message: "Leave record deleted and balance refunded" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete leave record" }, { status: 500 });
  }
}

