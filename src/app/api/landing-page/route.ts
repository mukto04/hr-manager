import { NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const content = await masterPrisma.landingPageContent.findMany();
    
    // Convert array to a section-keyed object for easier consumption
    const keyedContent = content.reduce((acc, item) => {
      acc[item.section] = item.content;
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json(keyedContent);
  } catch (error: any) {
    console.error("Landing Page Public Fetch Error:", error);
    return NextResponse.json({ 
      message: "Failed to fetch landing page content", 
      error: error.message 
    }, { status: 500 });
  }
}
