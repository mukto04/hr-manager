"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Globe, 
  Settings, 
  LogOut,
  ChevronRight,
  Monitor,
  Menu,
  X
} from "lucide-react";
import * as LucideIcons from "lucide-react";

import { Toast } from "@/components/ui/toast";
import { useToastStore } from "@/lib/store/use-toast-store";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { message, type, hideToast } = useToastStore();

  // If it's the login page, don't show the sidebar
  if (pathname === "/super-admin/login") {
    return <>{children}</>;
  }

  const menuItems = [
    {
      title: "Service Controller",
      icon: <Monitor className="w-5 h-5" />,
      href: "/super-admin/tenants",
      description: "Manage instances & DBs"
    },
    {
      title: "Landing Controller",
      icon: <Globe className="w-5 h-5" />,
      href: "/super-admin/landing-controller",
      description: "Update content & images"
    },
    {
      title: "System Settings",
      icon: <Settings className="w-5 h-5" />,
      href: "/super-admin/settings",
      description: "Change admin password"
    }
  ];

  return (
    <div className="h-screen overflow-hidden bg-slate-950 flex flex-col lg:flex-row text-slate-200">
      {/* Mobile/Tablet Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-1.5 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-sm font-bold text-white uppercase tracking-tight">Master Controller</h1>
        </div>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
          {isMobileOpen ? <LucideIcons.X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`${
          isCollapsed ? "lg:w-20" : "lg:w-72"
        } fixed lg:static inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 lg:bg-slate-900/50 lg:backdrop-blur-xl flex flex-col transition-all duration-300 z-[60] h-full overflow-y-auto 
        ${isMobileOpen ? "translate-x-0 shadow-2xl shadow-black" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-xl shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-lg font-bold text-white leading-tight">Master Controller</h1>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Root Access Only</p>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item, i) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={i} 
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all group ${
                  isActive 
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className={`${isActive ? "text-white" : "text-slate-500 group-hover:text-red-500"}`}>
                  {item.icon}
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-bold truncate">{item.title}</div>
                    <div className={`text-[10px] truncate ${isActive ? "text-red-100" : "text-slate-500"}`}>
                      {item.description}
                    </div>
                  </div>
                )}
                {(!isCollapsed || isMobileOpen) && isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
           <button 
             onClick={() => setIsCollapsed(!isCollapsed)}
             className="hidden lg:flex w-full items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-white/5 transition-all overflow-hidden whitespace-nowrap"
           >
             <LucideIcons.ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
             {!isCollapsed && <span className="text-sm font-medium">Collapse Sidebar</span>}
           </button>
           <Link 
             href="/super-admin/login"
             className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-bold overflow-hidden whitespace-nowrap"
           >
             <LogOut className="w-5 h-5 shrink-0" />
             {(!isCollapsed || isMobileOpen) && <span className="text-sm truncate">Sign Out System</span>}
           </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto relative min-w-0">
        <div className="max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>

      {message && (
        <Toast 
          message={message} 
          type={type} 
          onClose={hideToast} 
        />
      )}
    </div>
  );
}
