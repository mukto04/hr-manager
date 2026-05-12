import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import * as schema from "./schema";
import { tenants } from "./schema";

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

function getD1Binding(): D1Database {
  // @ts-ignore
  const d1 = process.env.DB || (globalThis as any).env?.DB;
  if (!d1) throw new Error("D1 binding not available");
  return d1;
}

export function getDb(): DrizzleDB {
  return drizzle(getD1Binding(), { schema });
}

export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export async function getTenantSlug(): Promise<string> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("hr_auth_token")?.value ||
    cookieStore.get("employee_session")?.value;

  if (!token) throw new Error("No active session.");

  const secretStr = process.env.SESSION_SECRET || "fallback-secret";
  const secret = new TextEncoder().encode(secretStr);
  const { payload } = await jwtVerify(token, secret);

  return (payload.slug || payload.companyCode) as string;
}

export async function getTenantDb(): Promise<DrizzleDB> {
  const slug = await getTenantSlug();
  if (!slug) throw new Error("Tenant identifier (slug) not found in session.");

  const database = getDb();
  const tenant = await database
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug.toLowerCase()))
    .get();

  if (!tenant) throw new Error(`Tenant company "${slug}" not found in records.`);

  const isStatusFrozen = tenant.status === "FROZEN";
  const isExpired =
    tenant.subscriptionEnd && new Date(tenant.subscriptionEnd) < new Date();

  if (isStatusFrozen || isExpired) {
    throw new Error(
      "ACCOUNT_FROZEN: Your subscription has expired or this account has been frozen by the administrator."
    );
  }

  return database;
}

export async function getDbBySlug(slug: string): Promise<DrizzleDB> {
  const database = getDb();
  const tenant = await database
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug.toLowerCase()))
    .get();

  if (!tenant || tenant.status === "FROZEN") {
    throw new Error("Tenant not found or account frozen");
  }

  return database;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
