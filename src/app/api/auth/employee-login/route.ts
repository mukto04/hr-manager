import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import * as jose from "jose";

const COOKIE_NAME = "employee_session";

export async function POST(request: NextRequest) {
  let tenantClient: PrismaClient | null = null;
  try {
    const { slug, employeeCode, password } = await request.json();

    if (!slug || !employeeCode || !password) {
      return NextResponse.json({ message: "Login URL, employee code and password are required." }, { status: 400 });
    }

    // 1. Resolve Tenant from Master DB
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!tenant) {
      return NextResponse.json({ message: "Invalid Login URL or Company." }, { status: 404 });
    }

    if (tenant.status === "FROZEN") {
      return NextResponse.json({ message: "Company account is frozen." }, { status: 403 });
    }

    // 2. Connect to Tenant DB and Verify Employee
    tenantClient = new PrismaClient({
      datasources: { db: { url: tenant.dbUrl } }
    });

    const employee = await tenantClient.employee.findUnique({
      where: { employeeCode }
    });

    if (!employee || employee.status !== "ACTIVE" || employee.password !== password) {
      return NextResponse.json({ message: "Invalid Employee Code or Password." }, { status: 401 });
    }

    // 3. Create Session JWT (aligned with Multi-Tenant Routing)
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");
    
    const token = await new jose.SignJWT({
      employeeId: employee.id,
      slug: tenant.slug,
      companyName: tenant.companyName,
      dbUrl: tenant.dbUrl,
      role: "EMPLOYEE"
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    const response = NextResponse.json({ message: "Login successful" });

    // 4. Set Session Cookie
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Employee login error:", error);
    return NextResponse.json({ message: "Login failed due to an internal error." }, { status: 500 });
  } finally {
    if (tenantClient) await tenantClient.$disconnect();
  }
}
