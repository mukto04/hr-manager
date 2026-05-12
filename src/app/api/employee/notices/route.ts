export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { notices } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getTenantDb();

    const empNotices = await db
      .select()
      .from(notices)
      .orderBy(desc(notices.createdAt))
      .limit(5); // Get latest 5 notices

    return NextResponse.json(empNotices);
  } catch (error) {
    console.error("Notices API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
