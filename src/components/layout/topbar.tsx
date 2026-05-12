"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, Bell, Cake, CalendarRange, LogOut, Fingerprint, ShieldCheck, Eye, EyeOff, X, Check, CheckCircle2, ClipboardList } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { useNavigationStore } from "@/stores/use-navigation-store";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { data, loading, refresh } = useAsyncData<{ 
    notifications: Array<{ id: string; type: string; title: string; subtitle: string; date: string; isRead: boolean }>,
    subscription: { daysLeft: number, endDate: string, adminUsername: string, adminPassword?: string } | null
  }>("/api/notifications?admin=true", { notifications: [], subscription: null });
  
  // Get session info (company name + slug) for display and logout redirect
  const { data: session } = useAsyncData<{ companyName: string; slug: string; planName?: string }>("/api/me", { companyName: "HR Manager", slug: "" });

  const notifications = data?.notifications || [];
  const subscription = data?.subscription;
  
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const { t } = useTranslation();

  // Tab title alert logic
  useEffect(() => {
    let interval: any;
    const baseTitle = t("HR Management Dashboard");
    
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
      document.title = baseTitle;
    };
  }, [unreadCount, t]);
  
  // Auto-refresh notifications every 10 seconds (faster for reminders)
  useEffect(() => {
    const interval = setInterval(() => {
      refresh({ silent: true });
    }, 10000); 
    return () => clearInterval(interval);
  }, [refresh]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const prevNotifIdsRef = useRef<Set<string>>(new Set());
  const { setIsNavigating } = useNavigationStore();

  const notifRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Function to play a repeating bip-bip alert for 5 seconds
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (startTime: number) => {
        // First bip
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = 'sine';
        osc1.frequency.value = 880; // High A
        gain1.gain.setValueAtTime(0, startTime);
        gain1.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
        osc1.start(startTime);
        osc1.stop(startTime + 0.15);

        // Second bip (slightly higher)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.value = 1046; // C6
        gain2.gain.setValueAtTime(0, startTime + 0.2);
        gain2.gain.linearRampToValueAtTime(0.18, startTime + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc2.start(startTime + 0.2);
        osc2.stop(startTime + 0.35);
      };

      // Repeat bip-bip every 1 second for 5 seconds (5 cycles)
      const now = audioCtx.currentTime;
      for (let i = 0; i < 5; i++) {
        playBeep(now + i * 1.0);
      }
    } catch (e) {
      console.warn("Sound playback failed:", e);
    }
  };

  // Handle browser notifications and sound when new ones arrive
  useEffect(() => {
    if (!loading && notifications.length > 0) {
      const currentIds = new Set(notifications.map(n => n.id));
      
      // Find IDs that are in current notifications but weren't in previous ones
      const newNotifs = notifications.filter(n => !prevNotifIdsRef.current.has(n.id) && !n.isRead);
      
      if (newNotifs.length > 0) {
        // 1. Play Sound
        playNotificationSound();

        // 2. Browser Push Notification
        if ("Notification" in window && Notification.permission === "granted") {
          newNotifs.forEach(n => {
            new Notification(n.title, {
              body: (n as any).message || n.subtitle,
              icon: "/favicon.png"
            });
          });
        }
      }
      
      // Update tracked IDs for the next check
      prevNotifIdsRef.current = currentIds;
    }
  }, [notifications, loading]);

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications?admin=true", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true })
      });
      refresh({ silent: true });
    } catch (err) {
      console.error("Failed to mark all as read");
    }
  }

  useEffect(() => {
    if (subscription) {
      setAdminForm({
        username: subscription.adminUsername,
        password: subscription.adminPassword || ""
      });
    }
  }, [subscription]);
  
  async function handleAdminUpdate() {
    if (!adminForm.username || !adminForm.password) return;
    setIsSavingAdmin(true);
    try {
      const res = await fetch("/api/tenant/settings/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adminForm)
      });
      if (res.ok) {
        setIsEditingAdmin(false);
        await refresh();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to update credentials");
      }
    } catch (err) {
      alert("An error occurred while updating credentials");
    } finally {
      setIsSavingAdmin(false);
    }
  }

  async function handleLogout() {
    const slug = session?.slug;
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const result = await res.json().catch(() => ({}));
    // Redirect to branded login or generic /login
    router.push(result.redirect || (slug ? `/${slug}-hr` : "/login"));
    router.refresh();
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isInTrigger = notifRef.current?.contains(event.target as Node);
      const isInDrawer = drawerRef.current?.contains(event.target as Node);
      
      if (!isInTrigger && !isInDrawer) {
        setShowNotifications(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
        setIsEditingAdmin(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent body scroll when notifications are open
  useEffect(() => {
    if (showNotifications) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [showNotifications]);


  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-slate-50/90 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button onClick={onMenuClick} className="rounded-xl border border-slate-200 bg-white p-2 lg:hidden">
              <Menu className="h-5 w-5 text-slate-700" />
            </button>
          </div>

          {/* Middle: Service Status (Fills the empty space) */}
          <div className="hidden md:flex flex-1 max-w-xs flex-col gap-1.5 px-6">
            {subscription ? (
              <>
                <div className="flex items-center justify-between px-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Service Validity</p>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${subscription.daysLeft > 7 ? "text-indigo-600" : "text-rose-500"}`}>
                    {subscription.daysLeft} Days Remaining
                  </span>
                </div>
                <div className="h-1 w-full bg-slate-200/50 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full transition-all duration-1000 ${subscription.daysLeft > 7 ? 'bg-indigo-500' : 'bg-rose-500'}`} 
                    style={{ width: `${Math.min(100, (subscription.daysLeft / 30) * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="h-4 w-full bg-slate-100 animate-pulse rounded-full" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-xl border border-slate-200 bg-white p-2 transition-colors hover:bg-slate-100"
              >
                <Bell className="h-5 w-5 text-slate-700" />
                {!loading && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-indigo-600 border-2 border-white items-center justify-center text-[8px] font-black text-white">
                      {unreadCount}
                    </span>
                  </span>
                )}
              </button>
            </div>
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 transition-colors text-left"
              >
                <div>
                  <p className="font-semibold text-slate-900">{session?.companyName || "Admin"}</p>
                  <p className="text-xs text-slate-500">{t("HR Manager")}</p>
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-80 rounded-[28px] border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col">
                    {/* Simple Identity Header */}
                    <div className="p-5 border-b border-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl">
                          {session?.companyName?.charAt(0) || "A"}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="font-black text-slate-900 text-sm leading-none mb-1.5">{session?.companyName || "Admin Account"}</p>
                          <div className="flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                               {session?.planName || "Starter Plan"}
                             </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-6">
                      {/* Security Management */}
                      <div className="p-4 bg-slate-50 rounded-[20px] border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Protocol</p>
                           {!isEditingAdmin ? (
                             <button onClick={() => setIsEditingAdmin(true)} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Change</button>
                           ) : (
                             <div className="flex gap-2">
                               <button onClick={handleAdminUpdate} disabled={isSavingAdmin} className="text-[9px] font-black text-emerald-600 uppercase">Save</button>
                               <button onClick={() => setIsEditingAdmin(false)} className="text-[9px] font-black text-slate-400 uppercase">Exit</button>
                             </div>
                           )}
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Username</label>
                            <div className={`p-2.5 rounded-xl transition-all border ${isEditingAdmin ? 'bg-white border-indigo-200 shadow-sm' : 'bg-white/40 border-slate-200'}`}>
                              {isEditingAdmin ? (
                                <input 
                                  className="bg-transparent w-full text-xs font-black text-slate-900 outline-none"
                                  value={adminForm.username}
                                  onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                                  autoFocus
                                />
                              ) : (
                                <span className="text-xs font-black text-slate-700">{subscription?.adminUsername || "..."}</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Master Password</label>
                            <div className={`p-2.5 rounded-xl transition-all border flex items-center gap-2 ${isEditingAdmin ? 'bg-white border-indigo-200 shadow-sm' : 'bg-white/40 border-slate-200'}`}>
                              {isEditingAdmin ? (
                                <>
                                  <input 
                                    className="bg-transparent w-full text-xs font-black text-slate-900 outline-none"
                                    type={showAdminPassword ? "text" : "password"}
                                    value={adminForm.password}
                                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors px-1"
                                  >
                                    {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs font-black text-slate-700 tracking-widest">••••••••</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Simple Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 py-3.5 text-[10px] font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-500 hover:text-white"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Slide-over (Outside header to escape stacking context) */}
      {showNotifications && (
        <div className="fixed inset-0 z-[200] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300" onClick={() => setShowNotifications(false)} />
          <div className="fixed inset-y-0 right-0 max-w-md w-full flex shadow-2xl">
            <div ref={drawerRef} className="w-full h-full bg-white flex flex-col animate-in slide-in-from-right duration-300 relative z-10">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white z-20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">{t("Notifications")}</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{unreadCount} {t("new alerts")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-black text-indigo-600 uppercase hover:underline mr-2"
                  >
                    Mark All
                  </button>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-50/50">
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin">
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notif: any) => {
                    const isClickable = notif.type === "ATTENDANCE_REQUEST" || notif.type === "BREAK_REQUEST";
                    return (
                      <div 
                        key={notif.id} 
                        className={`p-5 rounded-2xl border transition-all relative ${
                          isClickable ? "cursor-pointer group hover:shadow-md hover:-translate-y-0.5" : "cursor-default"
                        } ${
                          notif.isRead 
                            ? "bg-white border-slate-100 shadow-sm" 
                            : "bg-white border-indigo-200 shadow-lg ring-1 ring-indigo-50 border-l-4 border-l-indigo-500"
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* Icon */}
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                            notif.isRead ? "bg-slate-50 text-slate-400" :
                            notif.type === "BIRTHDAY" ? "bg-rose-50 text-rose-500" :
                            notif.type === "ATTENDANCE_REQUEST" ? "bg-amber-50 text-amber-500" :
                            notif.type === "SUBSCRIPTION" ? "bg-blue-50 text-blue-500" :
                            notif.type === "PROJECT" ? "bg-emerald-50 text-emerald-500" :
                            "bg-indigo-50 text-indigo-500"
                          } shadow-sm border border-transparent`}
                          onClick={() => {
                            if (!isClickable) return;
                            setIsNavigating(true);
                            setShowNotifications(false);
                            router.push("/attendance/requests");
                          }}>
                            {notif.type === "BIRTHDAY" ? <Cake size={18} /> : 
                             notif.type === "ATTENDANCE_REQUEST" ? <Fingerprint size={18} /> :
                             notif.type === "SUBSCRIPTION" ? <ShieldCheck size={18} /> :
                             notif.type === "PROJECT" ? <ClipboardList size={18} /> :
                             <CalendarRange size={18} />}
                          </div>

                          {/* Content */}
                          <div
                            className="space-y-1 min-w-0 flex-1"
                            onClick={() => {
                              if (!isClickable) return;
                              setIsNavigating(true);
                              setShowNotifications(false);
                              router.push("/attendance/requests");
                            }}
                          >
                            <h4 className={`text-sm font-bold transition-colors ${
                              notif.isRead ? "text-slate-600" : "text-slate-900"
                            } ${isClickable ? "group-hover:text-indigo-600" : ""}`}>
                              {t(notif.title)}
                            </h4>
                            <p className={`text-xs leading-relaxed font-semibold line-clamp-2 ${
                              notif.isRead ? "text-slate-500" : "text-slate-700"
                            }`}>
                              {t(notif.message || notif.subtitle, { date: notif.date ? new Date(notif.date).toLocaleDateString() : '...' })}
                            </p>
                            <span className={`text-[10px] font-bold uppercase tracking-widest block pt-1 ${
                              notif.isRead ? "text-slate-400" : "text-indigo-500"
                            }`}>
                              {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : "Recent"}
                            </span>
                          </div>

                          {/* Checkmark button */}
                          <div className="flex flex-col items-center justify-center shrink-0">
                            {!notif.isRead ? (
                              <button
                                title="Mark as read"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await fetch("/api/notifications?admin=true", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ id: notif.id })
                                    });
                                    refresh({ silent: true });
                                  } catch {}
                                }}
                                className="h-9 w-9 rounded-full bg-white border-2 border-indigo-200 hover:bg-indigo-500 hover:border-indigo-500 text-indigo-400 hover:text-white transition-all duration-200 flex items-center justify-center shadow-sm group/check"
                              >
                                <Check className="h-5 w-5" />
                              </button>
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-slate-50 flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400 opacity-60" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <Bell className="h-12 w-12 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">{t("All clear for now")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
