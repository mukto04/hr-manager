export const runtime = "edge";
import { LandingPage } from "@/modules/landing/landing-page";
import { getDb } from "@/lib/db";
import { landingPageContents } from "@/lib/db/schema";

export default async function IndexPage() {
  const content = await getDb().select().from(landingPageContents);
  
  // Convert array to a section-keyed object for initial hydration
  const initialData = content.reduce((acc, item) => {
    acc[item.section] = item.content;
    return acc;
  }, {} as Record<string, any>);

  return <LandingPage initialData={initialData} />;
}
