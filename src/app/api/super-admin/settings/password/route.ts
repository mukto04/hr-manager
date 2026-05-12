export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDb, newId, now } from "@/lib/db";
import { masterAdmins } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = (await request.json()) as any;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Identify current master password
    const adminConfig = await getDb()
      .select()
      .from(masterAdmins)
      .get();
    const masterPassword = adminConfig?.password || process.env.SUPER_ADMIN_PASSWORD || "superadmin123";

    if (currentPassword !== masterPassword) {
      return NextResponse.json({ message: "Current password is incorrect" }, { status: 403 });
    }

    // Upsert the new password
    if (adminConfig) {
      await getDb()
        .update(masterAdmins)
        .set({ password: newPassword, updatedAt: now() })
        .where(eq(masterAdmins.id, adminConfig.id));
    } else {
      await getDb()
        .insert(masterAdmins)
        .values({ id: newId(), password: newPassword, updatedAt: now() });
    }

    return NextResponse.json({ message: "Master password updated successfully" });
  } catch (error: any) {
    console.error("Change Password Error:", error);
    return NextResponse.json({ message: "Failed to update password", error: error.message }, { status: 500 });
  }
}
