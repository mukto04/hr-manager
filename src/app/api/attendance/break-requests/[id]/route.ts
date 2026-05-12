export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { status, hrNote } = (await request.json()) as any;

    if (!id) return NextResponse.json({ message: "ID is required" }, { status: 400 });

    const prisma = await getTenantPrisma();

    // Fetch the break request first to get employeeId
    const breakReq = await prisma.breakRequest.findUnique({
      where: { id },
    });

    if (!breakReq) return NextResponse.json({ message: "Request not found" }, { status: 404 });

    // If approved, create a BreakRecord
    if (status === "APPROVED") {
      // Calculate duration
      const duration = Math.floor(
        (new Date(breakReq.endTime).getTime() - new Date(breakReq.startTime).getTime()) / 60000
      );

      await prisma.$transaction([
        prisma.breakRequest.update({
          where: { id },
          data: { status: "APPROVED", hrNote }
        }),
        prisma.breakRecord.create({
          data: {
            employeeId: breakReq.employeeId,
            date: breakReq.date,
            startTime: breakReq.startTime,
            endTime: breakReq.endTime,
            duration,
            note: breakReq.reason
          }
        })
      ]);
    } else {
      await prisma.breakRequest.update({
        where: { id },
        data: { status, hrNote }
      });
    }

    // Notify Employee
    const dateStr = new Date(breakReq.date).toLocaleDateString();
    await createNotification({
      employeeId: breakReq.employeeId,
      title: `Break Request ${status}`,
      message: `Your break request for ${dateStr} has been ${status.toLowerCase()}.${hrNote ? ` HR Note: ${hrNote}` : ''}`,
      type: "BREAK"
    });

    return NextResponse.json({ message: `Request ${status} successfully` });
  } catch (error) {
    console.error("Error processing break request:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
