import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";
import * as jose from "jose";

const COOKIE_NAME = "hr_auth_token";
const SESSION_SECRET = "appdevs-hr-portal-secure-vault-998877";

export async function POST(request: NextRequest) {
  try {
    const { slug, username, password } = await request.json();

    if (!slug || !username || !password) {
      return NextResponse.json({ message: "Company identifier, username and password are required." }, { status: 400 });
    }

    // 1. Initial Checks
    if (!process.env.DATABASE_URL) {
      console.error("CRITICAL: DATABASE_URL is not set in environment.");
      return NextResponse.json({ message: "Server configuration error: Database URL missing." }, { status: 500 });
    }

    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!tenant) {
      console.warn(`Login attempt for non-existent company: ${slug}`);
      return NextResponse.json({ message: `Invalid login URL or company: ${slug}` }, { status: 404 });
    }

    if (tenant.status === "FROZEN") {
      return NextResponse.json({ message: "Your company account is frozen. Please contact administration." }, { status: 403 });
    }

    // 2. Tenant Credential Check
    if (username !== tenant.adminUsername || password !== tenant.adminPassword) {
        console.warn(`Invalid credentials for company ${slug}: User ${username}`);
        return NextResponse.json({ message: "Invalid username or password for this company." }, { status: 401 });
    }

    // 3. Create Session Token (JWT) with Dynamic DB URL
    const secretKey = process.env.SESSION_SECRET || SESSION_SECRET;
    const secret = new TextEncoder().encode(secretKey);
    
    console.log(`Generating token for ${tenant.companyName} (${tenant.slug})`);

    const token = await new jose.SignJWT({
      slug: tenant.slug,
      companyName: tenant.companyName,
      role: "HR_ADMIN",
      permissions: tenant.permissions
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    const response = NextResponse.json({ 
      message: "Login successful",
      companyName: tenant.companyName,
      slug: tenant.slug
    });

    // 4. Set Session Cookie
    const oneDay = 24 * 60 * 60 * 1000;
    const expires = new Date(Date.now() + oneDay);

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
      secure: true
    });

    console.log(`[Login] Successful. Token length: ${token.length}. Expires: ${expires.toISOString()}`);
    return response;
  } catch (error: any) {
    console.error("Multi-tenant login error:", error);
    return NextResponse.json({ 
      message: "An unexpected error occurred during login.",
      detail: error.message 
    }, { status: 500 });
  }
}
