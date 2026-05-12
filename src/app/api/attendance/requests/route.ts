import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const requests = await (await getTenantPrisma()).attendanceRequest.findMany({
      where: status ? { status } : {},
      include: {
        employee: {
          select: {
            name: true,
            employeeCode: true,
            designation: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching attendance requests:", error);
    return NextResponse.json({ message: "Failed to fetch requests" }, { status: 500 });
  }
}
