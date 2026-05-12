export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const prisma = await getTenantPrisma();
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: {
            members: true,
            payments: true
          }
        },
        members: {
          include: {
            employee: {
              select: {
                name: true,
                image: true
              }
            }
          }
        },
        payments: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ message: "Failed to fetch projects", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = (await request.json()) as any;
    const prisma = await getTenantPrisma();

    if (!data.name) {
      return NextResponse.json({ message: "Project name is required" }, { status: 400 });
    }

    const { memberIds, ...projectData } = data;
    console.log("Creating project with members:", memberIds);

    const project = await prisma.project.create({
      data: {
        name: projectData.name,
        type: projectData.type || null,
        startDate: projectData.startDate ? new Date(projectData.startDate) : null,
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
        totalAmount: parseFloat(projectData.totalAmount) || 0,
        description: projectData.description || null,
        status: projectData.status || "PLANNED",
        clientSource: projectData.clientSource || null,
        projectManagerId: projectData.projectManagerId || null,
        members: {
          create: (memberIds || []).map((empId: string) => ({
            employeeId: empId,
            role: "Member"
          }))
        }
      },
      include: {
        _count: {
          select: {
            members: true,
            payments: true
          }
        },
        members: {
          include: {
            employee: {
              select: {
                name: true,
                image: true
              }
            }
          }
        }
      }
    });

    console.log("Project created successfully:", project.id, "Members count:", project._count.members);

    // Notify members
    if (memberIds && memberIds.length > 0) {
      for (const empId of memberIds) {
        await createNotification({
          employeeId: empId,
          title: "New Project Assigned",
          message: `You have been assigned to a new project: ${project.name}`,
          type: "PROJECT"
        });
      }
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ message: "Failed to create project", error: error.message }, { status: 500 });
  }
}

