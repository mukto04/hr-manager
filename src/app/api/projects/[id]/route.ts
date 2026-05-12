export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { projects, projectMembers, projectPayments, employees } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createNotification } from "@/lib/notify";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getTenantDb();

    const project = await db.select().from(projects).where(eq(projects.id, id)).get();

    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const members = await db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        employeeId: projectMembers.employeeId,
        role: projectMembers.role,
        assignedAt: projectMembers.assignedAt,
        employeeId2: employees.id,
        employeeName: employees.name,
        employeeDesignation: employees.designation,
        employeeCode: employees.employeeCode,
        employeeImage: employees.image,
      })
      .from(projectMembers)
      .leftJoin(employees, eq(projectMembers.employeeId, employees.id))
      .where(eq(projectMembers.projectId, id));

    const payments = await db
      .select()
      .from(projectPayments)
      .where(eq(projectPayments.projectId, id))
      .orderBy(desc(projectPayments.date));

    return NextResponse.json({
      ...project,
      members: members.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        employeeId: m.employeeId,
        role: m.role,
        assignedAt: m.assignedAt,
        employee: {
          id: m.employeeId2,
          name: m.employeeName,
          designation: m.employeeDesignation,
          employeeCode: m.employeeCode,
          image: m.employeeImage,
        },
      })),
      payments,
    });
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
    const db = await getTenantDb();

    // Fetch old project to compare status and members
    const oldProject = await db.select().from(projects).where(eq(projects.id, id)).get();

    if (!oldProject) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const oldMembers = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, id));

    // 1. Update project details
    const project = await db
      .update(projects)
      .set({
        name: data.name,
        type: data.type,
        startDate: data.startDate ? data.startDate : null,
        endDate: data.endDate ? data.endDate : null,
        totalAmount: parseFloat(data.totalAmount) || 0,
        description: data.description,
        status: data.status,
        clientSource: data.clientSource,
        projectManagerId: data.projectManagerId,
        updatedAt: now(),
      })
      .where(eq(projects.id, id))
      .returning()
      .get();

    // 2. Only update members if memberIds is provided in the request
    if (data.memberIds) {
      // Remove existing members
      await db.delete(projectMembers).where(eq(projectMembers.projectId, id));

      // Create new members
      if (data.memberIds.length > 0) {
        for (const empId of data.memberIds) {
          await db.insert(projectMembers).values({
            id: newId(),
            projectId: id,
            employeeId: empId,
            role: "Member",
            assignedAt: now(),
          });
        }
      }
    }

    // Fetch current members for notifications
    const members = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, id));

    // 1. If status changed, notify all members
    if (data.status && data.status !== oldProject.status) {
      for (const member of members) {
        await createNotification({
          employeeId: member.employeeId,
          title: "Project Status Updated",
          message: `The status of project "${project!.name}" has been updated to: ${data.status}`,
          type: "PROJECT",
        });
      }
    }

    // 2. If members were updated, notify newly added members
    if (data.memberIds) {
      const oldMemberIds = oldMembers.map((m) => m.employeeId);
      const newMemberIds = data.memberIds.filter((empId: string) => !oldMemberIds.includes(empId));

      for (const empId of newMemberIds) {
        await createNotification({
          employeeId: empId,
          title: "New Project Assigned",
          message: `You have been assigned to project: ${project!.name}`,
          type: "PROJECT",
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
    const db = await getTenantDb();
    await db.delete(projects).where(eq(projects.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete project:", error);
    return NextResponse.json({ message: "Failed to delete project", error: error.message }, { status: 500 });
  }
}
