import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { cookies } from "next/headers";
import * as jose from "jose";

// --- Cloudflare D1 Compatibility ---
// In Cloudflare Pages, we access bindings via the request context or process.env (shimmed)
const getD1Binding = () => {
  // @ts-ignore - DB is injected by Cloudflare
  return process.env.DB || (globalThis as any).env?.DB;
};

const createPrismaClient = () => {
  const d1 = getD1Binding();
  if (d1) {
    const adapter = new PrismaD1(d1);
    return new PrismaClient({ adapter });
  }
  // Fallback for local development or non-edge environments
  return new PrismaClient();
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const masterPrisma = prisma;

export async function getTenantSlug() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hr_auth_token")?.value || cookieStore.get("employee_session")?.value;

  if (!token) {
    throw new Error("No active session.");
  }

  const secretStr = process.env.SESSION_SECRET || "fallback-secret";
  const secret = new TextEncoder().encode(secretStr);
  const { payload } = await jose.jwtVerify(token, secret);
  
  return (payload.slug || payload.companyCode) as string;
}

/**
 * Dynamically returns the PrismaClient.
 * Since we moved to a shared database on D1, this now returns the unified client
 * after validating the tenant's status.
 */
export async function getTenantPrisma() {
  try {
    const slug = await getTenantSlug();

    if (!slug) {
      throw new Error("Tenant identifier (slug) not found in session.");
    }

    const tenantRecord = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() }
    });

    if (!tenantRecord) {
      throw new Error(`Tenant company "${slug}" not found in records.`);
    }

    // --- Subscription & Account Status Check ---
    const isStatusFrozen = tenantRecord.status === "FROZEN";
    const isExpired = tenantRecord.subscriptionEnd && new Date(tenantRecord.subscriptionEnd) < new Date();

    if (isStatusFrozen || isExpired) {
      throw new Error("ACCOUNT_FROZEN: Your subscription has expired or this account has been frozen by the administrator.");
    }

    return prisma;
  } catch (error: any) {
    console.error("Prisma Routing Error:", error.message);
    if (error.message && error.message.includes("ACCOUNT_FROZEN")) {
      throw error;
    }
    throw new Error(`Failed to resolve tenant connection: ${error.message}`);
  }
}

/**
 * Public helper to get the PrismaClient for a tenant based on slug.
 */
export async function getPrismaBySlug(slug: string) {
  const tenantRecord = await prisma.tenant.findUnique({
    where: { slug: slug.toLowerCase() }
  });

  if (!tenantRecord || tenantRecord.status === "FROZEN") {
    throw new Error("Tenant not found or account frozen");
  }

  return prisma;
}
