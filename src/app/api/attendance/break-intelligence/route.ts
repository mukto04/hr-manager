export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, format } from "date-fns";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const startDate = new Date(year, month - 1, 1);
    const endDate = endOfMonth(startDate);

    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      }
    };

    if (employeeId && employeeId !== "all") {
      where.employeeId = employeeId;
    }

    const breakRecords = await (await getTenantPrisma()).breakRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
            image: true,
          }
        }
      },
      orderBy: {
        startTime: "desc"
      }
    });

    return NextResponse.json(breakRecords);
  } catch (error: any) {
    console.error("Error fetching break records:", error);
    return NextResponse.json({ message: "Failed to fetch break records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const { employeeId, date, startTime, endTime, note } = body;

    if (!employeeId) {
      return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    let duration = 0;

    if (start && end) {
      duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    // Normalize date to midnight of the start time's date
    const recordDate = new Date(start);
    recordDate.setHours(0, 0, 0, 0);

    const breakRecord = await (await getTenantPrisma()).breakRecord.create({
      data: {
        employeeId,
        date: recordDate,
        startTime: start,
        endTime: end,
        duration,
        note,
      },
      include: {
        employee: true
      }
    });

    return NextResponse.json(breakRecord);
  } catch (error: any) {
    console.error("Error creating break record:", error);
    return NextResponse.json({ message: "Failed to create break record" }, { status: 500 });
  }
}

