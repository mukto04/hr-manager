import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { leaveSchema } from "@/app/api/_helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  const where = year ? { year: parseInt(year) } : {};

  const leaves = await (await getTenantPrisma()).leaveBalance.findMany({
    where,
    include: { employee: true },
    orderBy: { 
      employee: {
        joiningDate: "asc"
      }
    }

  });

  return NextResponse.json(leaves);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = leaveSchema.parse(await request.json());

    const exists = await (await getTenantPrisma()).leaveBalance.findFirst({
      where: { employeeId: parsed.employeeId, year: parsed.year }
    });

    if (exists) {
      return NextResponse.json(
        { message: `Leave balance for year ${parsed.year} already exists for this employee` },
        { status: 400 }
      );
    }

    const leave = await (await getTenantPrisma()).leaveBalance.create({
      data: parsed,
      include: { employee: true }
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create leave balance", error }, { status: 400 });
  }
}
