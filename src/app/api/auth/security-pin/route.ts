export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as jose from "jose";
import { getDb, getTenantDb, now } from "@/lib/db";
import { tenants, employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
    secure: IS_PROD,
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
      const tenant = await getDb()
        .select({ securityPin: tenants.securityPin })
        .from(tenants)
        .where(eq(tenants.slug, auth.payload.slug as string))
        .get();
      hasPin = !!tenant?.securityPin;
    } else {
      const db = await getTenantDb();
      const employee = await db
        .select({ securityPin: employees.securityPin })
        .from(employees)
        .where(eq(employees.id, auth.payload.employeeId as string))
        .get();
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

  const { action, password, pin, newPin } = (await request.json()) as any;

  // --- SETUP ---
  if (action === "setup") {
    try {
      if (auth.type === "HR_ADMIN") {
        const tenant = await getDb()
          .select()
          .from(tenants)
          .where(eq(tenants.slug, auth.payload.slug as string))
          .get();
        if (!tenant || tenant.adminPassword !== password) {
          return NextResponse.json({ message: "Invalid portal password" }, { status: 401 });
        }
        await getDb()
          .update(tenants)
          .set({ securityPin: pin })
          .where(eq(tenants.slug, auth.payload.slug as string));
      } else {
        const db = await getTenantDb();
        const employee = await db
          .select()
          .from(employees)
          .where(eq(employees.id, auth.payload.employeeId as string))
          .get();
        if (!employee || employee.password !== password) {
          return NextResponse.json({ message: "Invalid portal password" }, { status: 401 });
        }
        await db
          .update(employees)
          .set({ securityPin: pin, updatedAt: now() })
          .where(eq(employees.id, employee.id));
      }
    } catch (err: any) {
      console.error("[security-pin setup] Error:", err.message);
      return NextResponse.json({ message: "Failed to save PIN" }, { status: 500 });
    }

    return setCookieOptions(NextResponse.json({ message: "PIN setup successful" }));
  }

  // --- VERIFY ---
  if (action === "verify") {
    let isValid = false;
    try {
      if (auth.type === "HR_ADMIN") {
        const tenant = await getDb()
          .select({ securityPin: tenants.securityPin })
          .from(tenants)
          .where(eq(tenants.slug, auth.payload.slug as string))
          .get();
        isValid = !!tenant?.securityPin && tenant.securityPin === pin;
      } else {
        const db = await getTenantDb();
        const employee = await db
          .select({ securityPin: employees.securityPin })
          .from(employees)
          .where(eq(employees.id, auth.payload.employeeId as string))
          .get();
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

  // --- RESET ---
  if (action === "reset") {
    try {
      if (auth.type === "HR_ADMIN") {
        const tenant = await getDb()
          .select()
          .from(tenants)
          .where(eq(tenants.slug, auth.payload.slug as string))
          .get();
        if (!tenant || tenant.adminPassword !== password) {
          return NextResponse.json({ message: "Invalid portal password" }, { status: 401 });
        }
        await getDb()
          .update(tenants)
          .set({ securityPin: newPin })
          .where(eq(tenants.slug, auth.payload.slug as string));
      } else {
        const db = await getTenantDb();
        const employee = await db
          .select()
          .from(employees)
          .where(eq(employees.id, auth.payload.employeeId as string))
          .get();
        if (!employee || employee.password !== password) {
          return NextResponse.json({ message: "Invalid portal password" }, { status: 401 });
        }
        await db
          .update(employees)
          .set({ securityPin: newPin, updatedAt: now() })
          .where(eq(employees.id, employee.id));
      }
    } catch (err: any) {
      console.error("[security-pin reset] Error:", err.message);
      return NextResponse.json({ message: "Failed to reset PIN" }, { status: 500 });
    }

    return setCookieOptions(NextResponse.json({ message: "PIN reset successful" }));
  }

  return NextResponse.json({ message: "Invalid action" }, { status: 400 });
}
