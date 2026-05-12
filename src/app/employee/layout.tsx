"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Banknote,
  Wallet,
  Menu,
  X,
  LogOut,
  Coffee,
  User,
  Lock,
  Bell,
  CheckCircle2,
  Check,
  Eye,
  EyeOff,
  ClipboardList,
  Cake,
  Fingerprint,
  ShieldCheck,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigationStore } from "@/stores/use-navigation-store";
import { useTranslation } from "@/hooks/use-translation";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/employee/dashboard", icon: LayoutDashboard },
  { name: "My Projects", href: "/employee/projects", icon: ClipboardList },
  { name: "My Profile", href: "/employee/profile", icon: User },
  { name: "My Attendance", href: "/employee/attendance", icon: CalendarDays },
  { name: "Leave Balance", href: "/employee/leaves", icon: Coffee },
  { name: "My Holidays", href: "/employee/holidays", icon: CalendarRange },
  { name: "Break Time", href: "/employee/breaks", icon: Coffee },
  { name: "Loan & Salary Advance", href: "/employee/loans", icon: Wallet },
  { name: "Salary & Payslip", href: "/employee/salary", icon: Banknote },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState("Employee");
  const [companyName, setCompanyName] = useState("Portal");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const prevNotifIdsRef = useRef<Set<string>>(new Set());
  const { t } = useTranslation();

  const { isNavigating, setIsNavigating } = useNavigationStore();

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsNavigating(false); // Reset navigation state when page changes
  }, [pathname, setIsNavigating]);

  // Update tab title with flashing alert when unread notifications exist
  useEffect(() => {
    let interval: any;
    const baseTitle = document.title.replace(/^\(\d+\)\s|🔔.*-\s/g, "");
    
    if (unreadCount > 0) {
      let toggle = false;
      interval = setInterval(() => {
        document.title = toggle 
          ? `(${unreadCount}) ${baseTitle}` 
          : `🔔 ${t("New Alert!")} - ${baseTitle}`;
        toggle = !toggle;
      }, 1000);
    } else {
      document.title = baseTitle;
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [unreadCount, t]);

  // Prevent body scroll when sidebars/modals are open
  useEffect(() => {
    if (isSidebarOpen || isPasswordModalOpen || isNotificationsOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isSidebarOpen, isPasswordModalOpen, isNotificationsOpen]);

  useEffect(() => {
    // Only fetch if not already in session storage (simple caching)
    const cachedName = sessionStorage.getItem("emp_name");
    const cachedCompany = sessionStorage.getItem("emp_company");
    
    if (cachedName && cachedCompany) {
      setEmployeeName(cachedName);
      setCompanyName(cachedCompany);
    }

    fetch("/api/employee/me")
      .then(res => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then(data => {
        if (data && data.name) {
          const shortName = data.name.split(" ").pop() || data.name;
          setEmployeeName(shortName);
          setCompanyName(data.companyName || "Portal");
          
          sessionStorage.setItem("emp_name", shortName);
          sessionStorage.setItem("emp_company", data.companyName || "Portal");
        }
      })
      .catch(err => console.error("Failed to fetch employee data:", err));

    fetchNotifications();

    // Auto-refresh notifications every 15 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Handle browser popups when new notifications arrive
  useEffect(() => {
    if (notifications.length > 0) {
      const currentIds = new Set(notifications.map(n => n.id));
      const newNotifs = notifications.filter(n => !prevNotifIdsRef.current.has(n.id) && !n.isRead);
      
      if (newNotifs.length > 0) {
        // Browser Push Notification
        if ("Notification" in window && Notification.permission === "granted") {
          newNotifs.forEach(n => {
            new Notification(n.title, {
              body: n.message || n.subtitle || "New update in your portal",
              icon: "/favicon.png"
            });
          });
        }
      }
      prevNotifIdsRef.current = currentIds;
    }
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        // Handle both old array format and new object format
        const list = Array.isArray(data) ? data : (data.notifications || []);
        setNotifications(list);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAsRead = async (id?: string) => {
    try {
      const payload = id ? { id } : { all: true };
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/employee-logout", { method: "POST" });
    router.push("/employee-login");
    router.refresh();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return;
    setIsUpdatingPassword(true);
    try {
      const res = await fetch("/api/employee/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setIsPasswordModalOpen(false);
        setNewPassword("");
        alert(t("Password updated successfully!"));
      } else {
        alert(t("Failed to update password."));
      }
    } catch (err) {
      alert(t("Something went wrong"));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden selection:bg-indigo-500/30 relative">
      {/* Top Navigation Progress Bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[1000] h-[2px] bg-indigo-100 overflow-hidden">
          <div className="h-full bg-indigo-600 animate-progress-bar shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-md lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[100] w-72 bg-[#0F172A] border-r border-slate-800 text-white transform transition-transform duration-500 lg:translate-x-0 lg:static lg:inset-auto flex flex-col shrink-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-20 shrink-0 items-center justify-between px-8 bg-slate-900/40 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.3)] shrink-0 relative overflow-hidden">
               <div className="absolute inset-0 bg-white/10 opacity-20" />
               <span className="text-white font-bold text-xl relative">{companyName.charAt(0)}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white tracking-tight truncate leading-none mb-1">
                {companyName}
              </span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none">Portal</span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-8 px-5 space-y-1">
          {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsNavigating(true)}
                  className={`group flex items-center gap-x-3.5 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 relative ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-slate-400 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 transition-transform duration-300 ${
                      isActive ? "text-white scale-110" : "text-slate-500 group-hover:text-white"
                    }`}
                  />
                  {t(item.name)}
                  {isActive && (
                    <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
                  )}
                </Link>
              );
            })}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-5 py-8 border-t border-slate-800/50 bg-slate-900/30">
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-x-3.5 rounded-2xl px-4 py-3.5 text-sm font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
          >
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
               <LogOut className="h-4 w-4 shrink-0" />
            </div>
            {t("Sign Out")}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/80 backdrop-blur-xl px-6 sm:px-10">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-600 lg:hidden hover:bg-slate-50 rounded-xl transition-all"
            onClick={() => setIsSidebarOpen(true)}
          >
            <span className="sr-only">{t("Open sidebar")}</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end items-center">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-white box-content animate-pulse" />
                )}
              </button>
            </div>

            <div className="w-px h-8 bg-slate-200 hidden sm:block" />

            {/* Profile Menu */}
            <div 
              className="flex items-center gap-4 text-sm font-bold text-slate-700 hover:text-indigo-600 cursor-pointer transition-all px-4 py-2 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 group" 
              onClick={() => setIsPasswordModalOpen(true)}
            >
              <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <User size={18} strokeWidth={2} />
              </div>
              <div className="hidden sm:flex flex-col">
                 <span className="leading-none mb-0.5">{t("Welcome")}, {employeeName}</span>
                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">{t("Security Access")}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto relative">
           {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="px-6 sm:px-10 py-8 lg:py-10">
            <div className="w-full">
              {children}
            </div>
          </div>
        </main>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsPasswordModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100">
            <div className="mb-8 space-y-2">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                 <Lock size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{t("Security Access")}</h3>
              <p className="text-[14px] font-medium text-slate-500">{t("Update your portal login password for secure infrastructure access.")}</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("New Access Password")}</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder={t("Minimum 6 characters")} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required 
                    minLength={6}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={isUpdatingPassword || newPassword.length < 6} 
                  className="w-full h-12 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
                >
                  {isUpdatingPassword ? t("Updating Access...") : t("Update Security Password")}
                </button>
                <button 
                  type="button" 
                  className="w-full h-10 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors" 
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  {t("Keep Existing Password")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Slide-over */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-[110] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsNotificationsOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-md w-full flex">
            <div className="w-full h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-xl z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">{t("Notifications")}</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{unreadCount} {t("unread messages")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAsRead()}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title={t("Mark all as read")}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-50/50">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-5 rounded-2xl border transition-all relative ${
                        notification.isRead 
                          ? 'bg-white border-slate-100 shadow-sm opacity-75' 
                          : 'bg-rose-50/40 border-rose-100 shadow-md ring-1 ring-rose-50'
                      }`}
                    >
                      {!notification.isRead && (
                        <span className="absolute top-5 right-5 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                      <div className="flex gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                          notification.isRead ? 'bg-slate-100 text-slate-400' :
                          notification.type === 'PROJECT' ? 'bg-emerald-50 text-emerald-600' :
                          notification.type === 'SALARY' ? 'bg-amber-50 text-amber-600' :
                          notification.type === 'LEAVE' ? 'bg-sky-50 text-sky-600' :
                          notification.type === 'ATTENDANCE' ? 'bg-indigo-50 text-indigo-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {notification.type === 'PROJECT' ? <ClipboardList size={18} /> :
                           notification.type === 'SALARY' ? <Banknote size={18} /> :
                           notification.type === 'LEAVE' ? <Coffee size={18} /> :
                           notification.type === 'ATTENDANCE' ? <Clock size={18} /> :
                           <Bell size={18} />}
                        </div>
                        <div className="flex-1 space-y-1 pr-6">
                          <h4 className={`text-sm font-bold transition-colors ${
                            notification.isRead ? 'text-slate-700' : 'text-slate-900'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className={`text-xs leading-relaxed font-medium line-clamp-2 ${
                            notification.isRead ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {notification.message || notification.subtitle}
                          </p>
                          <span className={`text-[10px] font-bold uppercase tracking-widest block pt-2 ${
                            notification.isRead ? 'text-slate-400' : 'text-rose-500'
                          }`}>
                            {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : t("Recent")}
                          </span>
                        </div>
                        {!notification.isRead && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="h-8 w-8 shrink-0 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all absolute bottom-5 right-5"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <Bell className="h-12 w-12 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">{t("No notifications yet")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
