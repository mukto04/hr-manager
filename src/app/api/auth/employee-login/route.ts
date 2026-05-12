export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDb, getDbBySlug } from "@/lib/db";
import { tenants, employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";

const COOKIE_NAME = "employee_session";

export async function POST(request: NextRequest) {
  try {
    const { slug, employeeCode, password } = (await request.json()) as any;

    if (!slug || !employeeCode || !password) {
      return NextResponse.json({ message: "Login URL, employee code and password are required." }, { status: 400 });
    }

    // 1. Resolve Tenant from Master DB
    const tenant = await getDb()
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug.toLowerCase()))
      .get();

    if (!tenant) {
      return NextResponse.json({ message: "Invalid Login URL or Company." }, { status: 404 });
    }

    if (tenant.status === "FROZEN") {
      return NextResponse.json({ message: "Company account is frozen." }, { status: 403 });
    }

    // 2. Connect to Tenant DB and Verify Employee
    const tenantDb = await getDbBySlug(slug.toLowerCase());

    const employee = await tenantDb
      .select()
      .from(employees)
      .where(eq(employees.employeeCode, employeeCode))
      .get();

    if (!employee || employee.status !== "ACTIVE" || employee.password !== password) {
      return NextResponse.json({ message: "Invalid Employee Code or Password." }, { status: 401 });
    }

    // 3. Create Session JWT (aligned with Multi-Tenant Routing)
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret");

    const token = await new SignJWT({
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
  }
}
