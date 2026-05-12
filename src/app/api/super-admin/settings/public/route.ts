export const runtime = "edge";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { masterAdmins } from "@/lib/db/schema";

export async function GET() {
  try {
    const adminConfig = await getDb()
      .select()
      .from(masterAdmins)
      .get();
    return NextResponse.json({
      loginTitle: adminConfig?.loginTitle || "AppDevs HR Master Access",
      loginSub: adminConfig?.loginSub || "Restricted to AppDevs Administrators only."
    });
  } catch (error: any) {
    return NextResponse.json({
      loginTitle: "AppDevs HR Master Access",
      loginSub: "Restricted to AppDevs Administrators only."
    });
  }
}
