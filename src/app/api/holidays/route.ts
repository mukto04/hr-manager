import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { holidaySchema } from "@/app/api/_helpers";

export async function GET() {
  const holidays = await (await getTenantPrisma()).holiday.findMany({
    orderBy: { date: "asc" }
  });

  return NextResponse.json(holidays);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = holidaySchema.parse(await request.json());

    const holiday = await (await getTenantPrisma()).holiday.create({
      data: {
        ...parsed,
        date: new Date(parsed.date)
      }
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create holiday", error }, { status: 400 });
  }
}
