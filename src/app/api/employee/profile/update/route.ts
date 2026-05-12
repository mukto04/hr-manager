export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { employees, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getEmployeeSession } from "@/lib/employee-auth";
import { createNotification } from "@/lib/notify";

export async function POST(request: NextRequest) {
  try {
    const session = await getEmployeeSession();
    const employeeId = session?.employeeId as string;

    if (!employeeId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { image } = (await request.json()) as any;

    if (!image) {
      return NextResponse.json({ message: "Image data is required" }, { status: 400 });
    }

    const db = await getTenantDb();

    await db
      .update(employees)
      .set({ image, updatedAt: now() })
      .where(eq(employees.id, employeeId));

    // Notify employee about profile picture update
    await createNotification({
      employeeId,
      title: "Profile Picture Updated",
      message: "Your profile picture has been successfully updated.",
      type: "PROFILE"
    });

    return NextResponse.json({ message: "Profile picture updated successfully!" });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
