export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { projects, projectWorkLogs, employees } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getTenantDb();

    const logs = await db
      .select({
        id: projectWorkLogs.id,
        projectId: projectWorkLogs.projectId,
        employeeId: projectWorkLogs.employeeId,
        phase: projectWorkLogs.phase,
        hours: projectWorkLogs.hours,
        date: projectWorkLogs.date,
        note: projectWorkLogs.note,
        createdAt: projectWorkLogs.createdAt,
        employeeName: employees.name,
        employeeImage: employees.image,
        employeeDesignation: employees.designation,
      })
      .from(projectWorkLogs)
      .leftJoin(employees, eq(projectWorkLogs.employeeId, employees.id))
      .where(eq(projectWorkLogs.projectId, id))
      .orderBy(desc(projectWorkLogs.createdAt));

    return NextResponse.json(
      logs.map((l) => ({
        id: l.id,
        projectId: l.projectId,
        employeeId: l.employeeId,
        phase: l.phase,
        hours: l.hours,
        date: l.date,
        note: l.note,
        createdAt: l.createdAt,
        employee: {
          name: l.employeeName,
          image: l.employeeImage,
          designation: l.employeeDesignation,
        },
      }))
    );
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
    const data = (await request.json()) as any;
    const db = await getTenantDb();

    const log = await db
      .insert(projectWorkLogs)
      .values({
        id: newId(),
        projectId: id,
        employeeId: data.employeeId,
        phase: data.phase,
        hours: parseFloat(data.hours),
        note: data.note || null,
        date: data.date ? data.date : now(),
        createdAt: now(),
      })
      .returning()
      .get();

    // Auto-transition project status based on phase
    const project = await db
      .select({ status: projects.status })
      .from(projects)
      .where(eq(projects.id, id))
      .get();

    if (project) {
      let newStatus: string | null = null;
      if (data.phase === "RUNNING_WORK" && (project.status === "PLANNED" || project.status === "ASSIGNED")) {
        newStatus = "RUNNING";
      } else if (data.phase === "IN_TESTING" && project.status !== "IN_TESTING") {
        newStatus = "IN_TESTING";
      } else if (data.phase === "ISSUE_FIXING" && project.status !== "ISSUE_FIXING") {
        newStatus = "ISSUE_FIXING";
      }

      if (newStatus) {
        await db
          .update(projects)
          .set({ status: newStatus, updatedAt: now() })
          .where(eq(projects.id, id));
      }
    }

    return NextResponse.json(log, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create work log:", error);
    return NextResponse.json({ message: "Failed to create work log", error: error.message }, { status: 500 });
  }
}
