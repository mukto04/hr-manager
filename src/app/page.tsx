export const runtime = "edge";
import { LandingPage } from "@/modules/landing/landing-page";
import { masterPrisma } from "@/lib/prisma";

export default async function IndexPage() {
  const content = await masterPrisma.landingPageContent.findMany();
  
  // Convert array to a section-keyed object for initial hydration
  const initialData = content.reduce((acc, item) => {
    acc[item.section] = item.content;
    return acc;
  }, {} as Record<string, any>);

  return <LandingPage initialData={initialData} />;
}
