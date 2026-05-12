export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { masterPrisma, getTenantPrisma } from "@/lib/prisma";

const PIN_AUTH_COOKIE = "financial_auth_token";
const SESSION_SECRET = process.env.SESSION_SECRET || "appdevs-hr-portal-secure-vault-998877";
const IS_PROD = process.env.NODE_ENV === "production";

async function getAuthContext() {
  const cookieStore = await cookies();
  const hrToken = cookieStore.get("hr_auth_token")?.value;
  const empToken = cookieStore.get("employee_session")?.value;

  const secret = new TextEncoder().encode(SESSION_SECRET);

  if (hrToken) {
    try {
      const { payload } = await jose.jwtVerify(hrToken, secret);
      return { type: "HR_ADMIN", payload };
    } catch (e) {}
  }

  if (empToken) {
    try {
      const { payload } = await jose.jwtVerify(empToken, secret);
      return { type: "EMPLOYEE", payload };
    } catch (e) {}
  }

  return null;
}

function setCookieOptions(response: NextResponse) {
  response.cookies.set(PIN_AUTH_COOKIE, "true", {
    httpOnly: true,
    secure: IS_PROD, // false on localhost, true in production
    sameSite: "lax",
    path: "/",
    maxAge: 3600 // 1 hour
  });
  return response;
}

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const pinAuth = cookieStore.get(PIN_AUTH_COOKIE)?.value;

  let hasPin = false;
  try {
    if (auth.type === "HR_ADMIN") {
      const tenant = await masterPrisma.tenant.findUnique({
        where: { slug: auth.payload.slug as string },
        select: { securityPin: true }
      });
      hasPin = !!tenant?.securityPin;
    } else {
      const prisma = await getTenantPrisma();
      const employee = await prisma.employee.findUnique({
        where: { id: auth.payload.employeeId as string },
        select: { securityPin: true }
      });
      hasPin = !!employee?.securityPin;
    }
  } catch (err: any) {
    console.error("[security-pin GET] Error:", err.message);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ 
    hasPin,
    authorized: !!pinAuth 
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { action, password, pin, newPin } = await request.json();

  // â”€â”€â”€ SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (action === "setup") {
    try {
      if (auth.type === "HR_ADMIN") {
        const tenant = await masterPrisma.tenant.findUnique({
          where: { slug: auth.payload.slug as string }
        });
        if (!tenant || tenant.adminPassword !== password) {
          return NextResponse.json({ message: "Invalid portal password" }, { status: 401 });
        }
        await masterPrisma.tenant.update({
          where: { slug: auth.payload.slug as string },
          data: { securityPin: pin }
        });
      } else {
        const prisma = await getTenantPrisma();
        const employee = await prisma.employee.findUnique({
          where: { id: auth.payload.employeeId as string }
        });
        if (!employee || employee.password !== password) {
          return NextResponse.json({ message: "Invalid portal password" }, { status: 401 });
        }
        await prisma.employee.update({
          where: { id: employee.id },
          data: { securityPin: pin }
        });
      }
    } catch (err: any) {
      console.error("[security-pin setup] Error:", err.message);
      return NextResponse.json({ message: "Failed to save PIN" }, { status: 500 });
    }

    return setCookieOptions(NextResponse.json({ message: "PIN setup successful" }));
  }

  // â”€â”€â”€ VERIFY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (action === "verify") {
    let isValid = false;
    try {
      if (auth.type === "HR_ADMIN") {
        const tenant = await masterPrisma.tenant.findUnique({
          where: { slug: auth.payload.slug as string },
          select: { securityPin: true }
        });
        isValid = !!tenant?.securityPin && tenant.securityPin === pin;
      } else {
        const prisma = await getTenantPrisma();
        const employee = await prisma.employee.findUnique({
          where: { id: auth.payload.employeeId as string },
          select: { securityPin: true }
        });
        isValid = !!employee?.securityPin && employee.securityPin === pin;
      }
    } catch (err: any) {
      console.error("[security-pin verify] Error:", err.message);
      return NextResponse.json({ message: "Verification failed" }, { status: 500 });
    }

    if (!isValid) {
      return NextResponse.json({ message: "Invalid PIN" }, { status: 401 });
    }

    return setCookieOptions(NextResponse.json({ message: "Authorized" }));
  }

  // â”€â”€â”€ RESET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (action === "reset") {
    try {
      if (auth.type === "HR_ADMIN") {
        const tenant = await masterPrisma.tenant.findUnique({
          where: { slug: auth.payload.slug as string }
        });
        if (!tenant || tenant.adminPassword !== password) {
          return NextResponse.json({ message: "Invalid portal password" }, { status: 401 });
        }
        await masterPrisma.tenant.update({
          where: { slug: auth.payload.slug as string },
          data: { securityPin: newPin }
        });
      } else {
        const prisma = await getTenantPrisma();
        const employee = await prisma.employee.findUnique({
          where: { id: auth.payload.employeeId as string }
        });
        if (!employee || employee.password !== password) {
          return NextResponse.json({ message: "Invalid portal password" }, { status: 401 });
        }
        await prisma.employee.update({
          where: { id: employee.id },
          data: { securityPin: newPin }
        });
      }
    } catch (err: any) {
      console.error("[security-pin reset] Error:", err.message);
      return NextResponse.json({ message: "Failed to reset PIN" }, { status: 500 });
    }

    return setCookieOptions(NextResponse.json({ message: "PIN reset successful" }));
  }

  return NextResponse.json({ message: "Invalid action" }, { status: 400 });
}

