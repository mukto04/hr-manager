export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { projects, projectMembers, projectPayments, employees } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await getTenantDb();

    // Fetch all projects ordered by createdAt desc
    const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));

    // Fetch members and payments for each project
    const result = await Promise.all(
      allProjects.map(async (project) => {
        const members = await db
          .select({
            id: projectMembers.id,
            projectId: projectMembers.projectId,
            employeeId: projectMembers.employeeId,
            role: projectMembers.role,
            assignedAt: projectMembers.assignedAt,
            employeeName: employees.name,
            employeeImage: employees.image,
          })
          .from(projectMembers)
          .leftJoin(employees, eq(projectMembers.employeeId, employees.id))
          .where(eq(projectMembers.projectId, project.id));

        const payments = await db
          .select()
          .from(projectPayments)
          .where(eq(projectPayments.projectId, project.id));

        return {
          ...project,
          members: members.map((m) => ({
            id: m.id,
            projectId: m.projectId,
            employeeId: m.employeeId,
            role: m.role,
            assignedAt: m.assignedAt,
            employee: {
              name: m.employeeName,
              image: m.employeeImage,
            },
          })),
          payments,
          _count: {
            members: members.length,
            payments: payments.length,
          },
        };
      })
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ message: "Failed to fetch projects", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = (await request.json()) as any;
    const db = await getTenantDb();

    if (!data.name) {
      return NextResponse.json({ message: "Project name is required" }, { status: 400 });
    }

    const { memberIds, ...projectData } = data;
    console.log("Creating project with members:", memberIds);

    const projectId = newId();
    const project = await db
      .insert(projects)
      .values({
        id: projectId,
        name: projectData.name,
        type: projectData.type || null,
        startDate: projectData.startDate ? projectData.startDate : null,
        endDate: projectData.endDate ? projectData.endDate : null,
        totalAmount: parseFloat(projectData.totalAmount) || 0,
        description: projectData.description || null,
        status: projectData.status || "PLANNED",
        clientSource: projectData.clientSource || null,
        projectManagerId: projectData.projectManagerId || null,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning()
      .get();

    // Create members
    if (memberIds && memberIds.length > 0) {
      for (const empId of memberIds) {
        await db.insert(projectMembers).values({
          id: newId(),
          projectId,
          employeeId: empId,
          role: "Member",
          assignedAt: now(),
        });
      }
    }

    // Fetch members with employee info for response
    const members = await db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        employeeId: projectMembers.employeeId,
        role: projectMembers.role,
        assignedAt: projectMembers.assignedAt,
        employeeName: employees.name,
        employeeImage: employees.image,
      })
      .from(projectMembers)
      .leftJoin(employees, eq(projectMembers.employeeId, employees.id))
      .where(eq(projectMembers.projectId, projectId));

    console.log("Project created successfully:", project.id, "Members count:", members.length);

    // Notify members
    if (memberIds && memberIds.length > 0) {
      for (const empId of memberIds) {
        await createNotification({
          employeeId: empId,
          title: "New Project Assigned",
          message: `You have been assigned to a new project: ${project.name}`,
          type: "PROJECT",
        });
      }
    }

    const responseProject = {
      ...project,
      members: members.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        employeeId: m.employeeId,
        role: m.role,
        assignedAt: m.assignedAt,
        employee: {
          name: m.employeeName,
          image: m.employeeImage,
        },
      })),
      _count: {
        members: members.length,
        payments: 0,
      },
    };

    return NextResponse.json(responseProject, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ message: "Failed to create project", error: error.message }, { status: 500 });
  }
}
