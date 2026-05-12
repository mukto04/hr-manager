export const runtime = "edge";
import { NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const adminConfig = await masterPrisma.masterAdmin.findFirst();
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

