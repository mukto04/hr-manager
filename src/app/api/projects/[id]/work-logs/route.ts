import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prisma = await getTenantPrisma();
    const logs = await prisma.projectWorkLog.findMany({
      where: { projectId: id },
      include: {
        employee: {
          select: {
            name: true,
            image: true,
            designation: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("Failed to fetch work logs:", error);
    return NextResponse.json({ message: "Failed to fetch work logs", error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const prisma = await getTenantPrisma();

    const log = await prisma.projectWorkLog.create({
      data: {
        project: { connect: { id: id } },
        employee: { connect: { id: data.employeeId } },
        phase: data.phase,
        hours: parseFloat(data.hours),
        note: data.note || null,
        date: data.date ? new Date(data.date) : new Date()
      }
    });

    // Auto-transition project status based on phase
    const project = await prisma.project.findUnique({
      where: { id: id },
      select: { status: true }
    });

    if (project) {
      let newStatus = null;
      if (data.phase === "RUNNING_WORK" && (project.status === "PLANNED" || project.status === "ASSIGNED")) {
        newStatus = "RUNNING";
      } else if (data.phase === "IN_TESTING" && project.status !== "IN_TESTING") {
        newStatus = "IN_TESTING";
      } else if (data.phase === "ISSUE_FIXING" && project.status !== "ISSUE_FIXING") {
        newStatus = "ISSUE_FIXING";
      }

      if (newStatus) {
        await prisma.project.update({
          where: { id: id },
          data: { status: newStatus }
        });
      }
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create work log:", error);
    return NextResponse.json({ message: "Failed to create work log", error: error.message }, { status: 500 });
  }
}
