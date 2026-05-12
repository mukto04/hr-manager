export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prisma = await getTenantPrisma();
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                designation: true,
                employeeCode: true,
                image: true
              }
            }
          }
        },
        payments: {
          orderBy: { date: "desc" }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Failed to fetch project:", error);
    return NextResponse.json({ message: "Failed to fetch project", error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = (await request.json()) as any;
    const prisma = await getTenantPrisma();

    // Fetch old project to compare status and members
    const oldProject = await prisma.project.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!oldProject) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const project = await prisma.$transaction(async (tx) => {
      // 1. Update project details
      const p = await tx.project.update({
        where: { id },
        data: {
          name: data.name,
          type: data.type,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          totalAmount: parseFloat(data.totalAmount) || 0,
          description: data.description,
          status: data.status,
          clientSource: data.clientSource,
          projectManagerId: data.projectManagerId
        }
      });

      // 2. Only update members if memberIds is provided in the request
      if (data.memberIds) {
        // Remove existing members
        await tx.projectMember.deleteMany({
          where: { projectId: id }
        });

        // Create new members
        if (data.memberIds.length > 0) {
          await tx.projectMember.createMany({
            data: data.memberIds.map((empId: string) => ({
              projectId: id,
              employeeId: empId,
              role: "Member"
            }))
          });
        }
      }

      return p;
    });

    // Notifications
    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: { employee: true }
    });

    // 1. If status changed, notify all members
    if (data.status && data.status !== oldProject.status) {
      for (const member of members) {
        await createNotification({
          employeeId: member.employeeId,
          title: "Project Status Updated",
          message: `The status of project "${project.name}" has been updated to: ${data.status}`,
          type: "PROJECT"
        });
      }
    }

    // 2. If members were updated, notify newly added members
    if (data.memberIds) {
      const oldMemberIds = oldProject.members.map(m => m.employeeId);
      const newMemberIds = data.memberIds.filter((id: string) => !oldMemberIds.includes(id));

      for (const empId of newMemberIds) {
        await createNotification({
          employeeId: empId,
          title: "New Project Assigned",
          message: `You have been assigned to project: ${project.name}`,
          type: "PROJECT"
        });
      }
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Failed to update project:", error);
    return NextResponse.json({ message: "Failed to update project", error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prisma = await getTenantPrisma();
    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ message: "Failed to delete project", error: error.message }, { status: 500 });
  }
}
