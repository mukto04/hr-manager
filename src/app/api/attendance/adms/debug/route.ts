export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { admsLogs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const db = await getTenantDb();
    const logs = await db
      .select()
      .from(admsLogs)
      .orderBy(desc(admsLogs.createdAt))
      .limit(50);
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
