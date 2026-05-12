"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useState, useEffect } from "react";
import { useNavigationStore } from "@/stores/use-navigation-store";

const AUTH_ROUTES = ["/", "/login", "/employee-login", "/employee", "/setup", "/super-admin"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auth pages: known routes + any branded company URLs (e.g. /slug-hr, /slug-employee)
  const isBrandedHrUrl = pathname.endsWith("-hr");
  const isBrandedEmpUrl = pathname.endsWith("-employee");
  const isAuthPage = isBrandedHrUrl || isBrandedEmpUrl || AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(`${r}/`));

  const { isNavigating, setIsNavigating } = useNavigationStore();

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsNavigating(false); // Reset navigation state when page changes
  }, [pathname, setIsNavigating]);

  if (isAuthPage) {
    // Render login / public pages without any chrome
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white relative">
      {/* Top Navigation Progress Bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[1000] h-[2px] bg-slate-100 overflow-hidden">
          <div className="h-full bg-indigo-600 animate-progress-bar shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
        </div>
      )}

      <div className="print:hidden">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>
      <div className="lg:pl-72 print:pl-0">
        <div className="print:hidden">
          <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        </div>
        <main className="p-4 md:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
