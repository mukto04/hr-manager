export const runtime = "edge";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("hr_auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET || "appdevs-hr-portal-secure-vault-998877"
    );
    const { payload } = await jwtVerify(token, secret);
    const slug = (payload.slug || payload.companyCode) as string;

    // --- Live permissions fetch from Master DB ---
    // This ensures SuperAdmin service changes are reflected immediately
    // without requiring the HR admin to logout and login again.
    let livePermissions = payload.permissions;
    let planName = payload.planName;

    if (slug) {
      try {
        const tenant = await getDb()
          .select({
            permissions: tenants.permissions,
            planName: tenants.planName
          })
          .from(tenants)
          .where(eq(tenants.slug, slug.toLowerCase()))
          .get();
        if (tenant) {
          livePermissions = tenant.permissions ?? payload.permissions;
          planName = tenant.planName ?? payload.planName;
        }
      } catch (dbError) {
        // Non-critical: fall back to JWT permissions if DB lookup fails
        console.warn("[/api/me] DB lookup failed, using JWT permissions:", dbError);
      }
    }

    return NextResponse.json({
      companyName: payload.companyName,
      slug,
      role: payload.role,
      planName,
      permissions: livePermissions,
    });
  } catch (error) {
    return NextResponse.json({ message: "Invalid session" }, { status: 401 });
  }
}
