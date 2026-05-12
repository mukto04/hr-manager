import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Fetch dynamic password from DB
    const adminConfig = await masterPrisma.masterAdmin.findFirst();
    const masterPassword = adminConfig?.password || process.env.SUPER_ADMIN_PASSWORD || "superadmin123";

    if (password !== masterPassword) {
      return NextResponse.json({ message: "Invalid super admin password." }, { status: 401 });
    }

    const response = NextResponse.json({ message: "Welcome, Super Admin." });

    // Set secure super session cookie
    response.cookies.set("super_session", masterPassword, {
      httpOnly: true,
      secure: true, // Force secure on Vercel
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json({ message: "Login failed" }, { status: 500 });
  }
}
