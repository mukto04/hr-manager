import "./globals.css";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";
export const runtime = "edge";

import { DialogProvider } from "@/components/ui/dialog-provider";
import { Plus_Jakarta_Sans } from "next/font/google";

import { masterPrisma } from "@/lib/prisma";

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const branding = await masterPrisma.landingPageContent.findUnique({
      where: { section: "BRANDING" }
    });
    
    const content = branding?.content as any || {};
    
    return {
      title: content.siteTitle || "AppDevs HR Dashboard",
      description: content.siteDescription || "Modern HR Management Dashboard built with Next.js, Tailwind CSS, TypeScript and Prisma.",
      icons: {
        icon: content.favicon || "/favicon.png",
      },
    };
  } catch (e) {
    return {
      title: "AppDevs HR Dashboard",
      description: "Modern HR Management Dashboard",
      icons: { icon: "/favicon.png" }
    };
  }
}

import { Toaster } from "sonner";
import { GlobalSettingsProvider } from "@/components/providers/global-settings-provider";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <body suppressHydrationWarning className={`${jakarta.className} antialiased`}>
        <DialogProvider>
          <GlobalSettingsProvider>
            <AppShell>{children}</AppShell>
            <Toaster position="top-center" richColors />
          </GlobalSettingsProvider>
        </DialogProvider>
      </body>
    </html>
  );
}
