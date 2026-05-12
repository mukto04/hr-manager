export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { masterAdmins } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as any;

    // Fetch dynamic password from DB
    const adminConfig = await getDb()
      .select()
      .from(masterAdmins)
      .get();
    const masterPassword = adminConfig?.password || process.env.SUPER_ADMIN_PASSWORD || "superadmin123";

    if (password !== masterPassword) {
      return NextResponse.json({ message: "Invalid super admin password." }, { status: 401 });
    }

    const response = NextResponse.json({ message: "Welcome, Super Admin." });

    // Set secure super session cookie
    response.cookies.set("super_session", masterPassword, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json({ message: "Login failed" }, { status: 500 });
  }
}
