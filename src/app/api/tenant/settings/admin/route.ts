import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";

export async function PUT(request: NextRequest) {
  try {
    const rawData = await request.json();
    const { username, password } = rawData;

    if (!username || !password) {
      return NextResponse.json({ message: "Username and Password are required" }, { status: 400 });
    }

    // 1. Identify Tenant from JWT
    const cookieStore = await cookies();
    const token = cookieStore.get("hr_auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET || "appdevs-hr-portal-secure-vault-998877"
    );
    
    const { payload } = await jose.jwtVerify(token, secret);
    const slug = payload.slug as string;

    if (!slug) {
      return NextResponse.json({ message: "Invalid session" }, { status: 401 });
    }

    // 2. Update Master Tenant Recording
    await masterPrisma.tenant.update({
      where: { slug },
      data: {
        adminUsername: username,
        adminPassword: password
      }
    });

    return NextResponse.json({ message: "Credentials updated successfully" });
  } catch (error: any) {
    console.error("Admin Update Error:", error);
    return NextResponse.json(
      { message: "Failed to update credentials", error: error.message },
      { status: 500 }
    );
  }
}
