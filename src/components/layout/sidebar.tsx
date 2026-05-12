"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  CalendarDays, 
  Coins, 
  CreditCard, 
  LayoutDashboard, 
  ShieldCheck, 
  Users, 
  Banknote, 
  Receipt, 
  X, 
  ClipboardList,
  Lock,
  Clock,
  FileSpreadsheet,
  Coffee,
  StickyNote,
  ClipboardCheck,
  TrendingUp
} from "lucide-react";
import { cn } from "@/utils/classnames";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { useNavigationStore } from "@/stores/use-navigation-store";
import { useTranslation } from "@/hooks/use-translation";

const sidebarGroups = [
  {
    title: "Main Menu",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, serviceId: "main_menu" },
      { href: "/employees", label: "Employees", icon: Users, serviceId: "main_menu" },
      { href: "/requests", label: "Request Applications", icon: ClipboardCheck, serviceId: "main_menu" },
      { href: "/notepad", label: "Quick Notepad", icon: StickyNote, serviceId: "main_menu" },
    ]
  },
  {
    title: "Project Management",
    links: [
      { href: "/projects", label: "Project Tracking", icon: ClipboardList, serviceId: "main_menu" },
      { href: "/payments", label: "Payment Tracking", icon: Coins, serviceId: "main_menu" },
    ]
  },
  {
    title: "Attendance Management",
    links: [
      { href: "/attendance", label: "Attendance Tracking", icon: Clock, serviceId: "attendance" },
      { href: "/attendance/requests", label: "Manual Requests", icon: ClipboardList, serviceId: "attendance" },
      { href: "/attendance/report", label: "Attendance Report", icon: FileSpreadsheet, serviceId: "attendance" },
      { href: "/attendance/break-intelligence", label: "Break Time Report", icon: Clock, serviceId: "attendance" },
    ]
  },
  {
    title: "Leaves & Holidays",
    links: [
      { href: "/holidays", label: "Holidays", icon: CalendarDays, serviceId: "leaves" },
      { href: "/leaves", label: "Leave Balance", icon: ShieldCheck, serviceId: "leaves" },
    ]
  },
  {
    title: "Finance & Payroll",
    links: [
      { href: "/loans", label: "Loans", icon: CreditCard, serviceId: "finance" },
      { href: "/advance-salary", label: "Advance Salary", icon: Banknote, serviceId: "finance" },
      { href: "/salary", label: "Salary Structure", icon: Coins, serviceId: "finance" },
      { href: "/finance/salary-increment", label: "Salary Increment", icon: TrendingUp, serviceId: "finance" },
      { href: "/monthly-salary", label: "Monthly Salary", icon: Coins, serviceId: "finance" },
    ]
  },
  {
    title: "Office Administration",
    links: [
      { href: "/office-cost", label: "Office Cost Calculator", icon: Receipt, serviceId: "office_admin" },
      { href: "/google-sheet", label: "Company Spreadsheet", icon: FileSpreadsheet, serviceId: "office_admin" },
    ]
  }
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useAsyncData<any>("/api/me", { companyName: "HR Portal", slug: "" });
  const { data: reqCounts } = useAsyncData<any>("/api/requests", { total: 0 });
  const { setIsNavigating } = useNavigationStore();
  const { t } = useTranslation();

  // Handle body scroll locking when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button onClick={onClose} className="absolute right-4 top-6 lg:hidden text-slate-400 hover:text-white">
          <X className="h-6 w-6" />
        </button>
        <div className="border-b border-white/10 px-6 py-6 font-bold flex flex-col gap-1">
          <h2 className="text-xl font-bold truncate" title={session?.companyName}>
            {session?.companyName || "HR Portal"}
          </h2>
          {session?.planName && (
             <span className="text-[10px] text-red-500 uppercase tracking-widest">{session.planName} Plan</span>
          )}
        </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {sidebarGroups.map((group, index) => (
          <div key={group.title} className={cn("mb-6", index === sidebarGroups.length - 1 ? "mb-0" : "")}>
            <h3 className="px-4 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {t(group.title)}
            </h3>
            <div className="space-y-1">
              {group.links.map(({ href, label, icon: Icon, serviceId }: any) => {
                // Prefix the link with company slug if available for professional branded URL
                const brandedHref = session?.slug ? `/${session.slug}-hr${href}` : href;
                const active = pathname === href || pathname === brandedHref;
                
                const isEnabled = !serviceId || session?.permissions?.[serviceId] !== false;

                return (
                  <Link
                    key={href}
                    href={brandedHref}
                    onClick={() => setIsNavigating(true)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition group",
                      active ? "bg-brand-600 text-white shadow-soft-xl shadow-brand-900/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-white" : "text-slate-400 group-hover:text-white transition-colors")} />
                    <span className="flex-1">{t(label)}</span>
                    {href === "/requests" && reqCounts?.total > 0 && (
                      <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white text-[9px] font-black">
                        {reqCounts.total}
                      </span>
                    )}
                    {!isEnabled && (
                       <Lock className="w-3 h-3 text-slate-500 group-hover:text-red-500 transition-colors" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </aside>
    </>
  );
}
