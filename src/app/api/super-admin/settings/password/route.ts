import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Identify current master password
    const adminConfig = await masterPrisma.masterAdmin.findFirst();
    const masterPassword = adminConfig?.password || process.env.SUPER_ADMIN_PASSWORD || "superadmin123";

    if (currentPassword !== masterPassword) {
      return NextResponse.json({ message: "Current password is incorrect" }, { status: 403 });
    }

    // Upsert the new password
    if (adminConfig) {
      await masterPrisma.masterAdmin.update({
        where: { id: adminConfig.id },
        data: { password: newPassword, updatedAt: new Date() }
      });
    } else {
      await masterPrisma.masterAdmin.create({
        data: { password: newPassword }
      });
    }

    return NextResponse.json({ message: "Master password updated successfully" });
  } catch (error: any) {
    console.error("Change Password Error:", error);
    return NextResponse.json({ message: "Failed to update password", error: error.message }, { status: 500 });
  }
}
