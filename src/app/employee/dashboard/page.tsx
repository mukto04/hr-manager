"use client";

import { useState, useEffect } from "react";
import { 
  Activity, 
  Coffee, 
  Wallet, 
  Banknote, 
  CalendarDays, 
  CalendarRange, 
  ArrowRight,
  Bell,
  Clock,
  ExternalLink,
  Maximize2,
  X
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { useGlobalSettings } from "@/components/providers/global-settings-provider";
import { useTranslation } from "@/hooks/use-translation";

export default function EmployeeDashboard() {
  const [data, setData] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { currencySymbol } = useGlobalSettings();
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([
      fetch("/api/employee/dashboard").then(res => {
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        return res.json();
      }),
      fetch("/api/employee/notices").then(res => {
        if (!res.ok) throw new Error("Failed to fetch notices");
        return res.json();
      })
    ]).then(([dashboardData, noticesData]) => {
      setData(dashboardData);
      setNotices(Array.isArray(noticesData) ? noticesData : []);
      setLoading(false);
    }).catch(err => {
      console.error("Dashboard fetch error:", err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse p-2">
        <div className="h-32 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Refined Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("Welcome back")}, <span className="text-indigo-600">{data?.employee?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            {t("Everything you need to manage your work and performance is right here.")}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
           <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
              <CalendarDays size={16} />
           </div>
           <p className="text-xs font-bold text-slate-700">{t(format(new Date(), "EEEE"))}, {t(format(new Date(), "MMM"))} {format(new Date(), "dd")}</p>
        </div>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Attendance */}
        <div className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-500">
           <div className="flex items-center justify-between mb-6">
              <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                 <Activity size={24} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Attendance")}</span>
           </div>
           <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-900">{data?.attendance?.presentCount || 0} <span className="text-xs text-slate-400 font-medium lowercase">{t("days")}</span></h3>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t("Active Status")}</p>
           </div>
           <Link href="/employee/attendance" className="mt-6 flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:gap-3 transition-all group/link">
             {t("View Logs")} <ArrowRight size={14} />
           </Link>
        </div>

        {/* Leaves */}
        <div className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-500">
           <div className="flex items-center justify-between mb-6">
              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                 <Coffee size={24} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Leaves")}</span>
           </div>
           <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-900">{data?.leaves?.available || 0} <span className="text-xs text-slate-400 font-medium lowercase">{t("remaining")}</span></h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Annual Balance")}</p>
           </div>
           <Link href="/employee/leaves" className="mt-6 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:gap-3 transition-all">
             {t("Apply Now")} <ArrowRight size={14} />
           </Link>
        </div>

        {/* Financials */}
        <div className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-amber-100 transition-all duration-500">
           <div className="flex items-center justify-between mb-6">
              <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-500">
                 <Wallet size={24} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Financials")}</span>
           </div>
           <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-900">{currencySymbol}{data?.loans?.activeCount || 0} <span className="text-xs text-slate-400 font-medium lowercase">{t("active")}</span></h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Loans & Advances")}</p>
           </div>
           <Link href="/employee/loans" className="mt-6 flex items-center gap-2 text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:gap-3 transition-all">
             {t("History")} <ArrowRight size={14} />
           </Link>
        </div>

        {/* Payslips */}
        <div className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-rose-100 transition-all duration-500">
           <div className="flex items-center justify-between mb-6">
              <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all duration-500">
                 <Banknote size={24} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Payroll")}</span>
           </div>
           <div className="space-y-1">
              <h3 className="text-2xl font-bold text-slate-900">{currencySymbol}**** <span className="text-xs text-slate-400 font-medium lowercase">{t("slips")}</span></h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Monthly Payslip")}</p>
           </div>
           <Link href="/employee/salary" className="mt-6 flex items-center gap-2 text-[10px] font-bold text-rose-600 uppercase tracking-widest hover:gap-3 transition-all">
             {t("Download")} <ArrowRight size={14} />
           </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notice Board Section */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between px-2">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                 <Bell size={18} className="text-indigo-600" />
                 {t("Official Notice Board")}
              </h2>
           </div>

           <div className="space-y-4">
              {notices.length > 0 ? (
                notices.map((notice) => (
                  <div key={notice.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                     <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                           <div className="flex items-center gap-3">
                              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest border border-indigo-100">{t("Official")}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(notice.createdAt), "dd MMM, yyyy")}</span>
                           </div>
                           <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">{notice.title}</h3>
                           <p className="text-slate-500 text-sm font-medium line-clamp-2 leading-relaxed">
                              {notice.content}
                           </p>
                           <div className="flex items-center gap-4 pt-2">
                              <button 
                                 onClick={() => setSelectedNotice(notice)}
                                 className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 hover:gap-2 transition-all"
                              >
                                 {t("Read Full Notice")} <ArrowRight size={14} />
                              </button>
                              {notice.file && (
                                <a href={notice.file} target="_blank" className="text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-1.5 transition-all">
                                   {t("Attachment")} <ExternalLink size={14} />
                                </a>
                              )}
                           </div>
                        </div>
                        {notice.image && (
                          <div 
                             onClick={() => setSelectedNotice(notice)}
                             className="h-20 w-20 rounded-2xl overflow-hidden shrink-0 border border-slate-100 cursor-pointer hover:ring-4 hover:ring-indigo-50 transition-all"
                          >
                             <img src={notice.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          </div>
                        )}
                     </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-4">
                   <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                      <Bell size={32} />
                   </div>
                   <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">{t("No official notices posted yet.")}</p>
                </div>
              )}
           </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
           {/* Holiday Widget */}
           <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900 px-2 flex items-center gap-2">
                 <CalendarRange size={18} className="text-indigo-600" />
                 {t("Upcoming Holidays")}
              </h2>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {data?.holidays?.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {data.holidays.map((h: any) => (
                      <div key={h.id} className="p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="h-12 w-12 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 shrink-0">
                           <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-1">{t(format(new Date(h.date), "MMM"))}</span>
                           <span className="text-lg font-black text-slate-900 leading-none">{format(new Date(h.date), "dd")}</span>
                        </div>
                        <div className="min-w-0">
                           <h4 className="font-bold text-slate-800 text-sm truncate">{h.name}</h4>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t(format(new Date(h.date), "EEEE"))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-slate-300">
                     <CalendarRange size={24} className="mx-auto mb-2 opacity-50" />
                     <p className="text-[10px] font-bold uppercase tracking-widest">{t("No holidays")}</p>
                  </div>
                )}
              </div>
           </div>

           {/* Support Card */}
           <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden group shadow-xl shadow-slate-900/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/30 blur-3xl rounded-full translate-x-10 -translate-y-10" />
              <div className="relative z-10 space-y-8">
                 <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md border border-white/10">
                    <Clock size={24} strokeWidth={1.5} />
                 </div>
                 <div className="space-y-3">
                    <h3 className="text-xl font-bold tracking-tight">{t("Need Support?")}</h3>
                    <p className="text-slate-400 text-[13px] font-medium leading-relaxed">
                       {t("Facing issues with your portal? Our HR team is just a message away.")}
                    </p>
                 </div>
                 <button className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-50 transition-all active:scale-95 text-[11px] uppercase tracking-widest">
                    {t("Contact HR Desk")}
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Notice Detail Modal */}
      <Modal
        open={!!selectedNotice}
        onClose={() => setSelectedNotice(null)}
        title={t("Notice Details")}
        description={t("Official announcement from HR")}
        size="xl"
      >
        {selectedNotice && (
          <div className="space-y-6">
            {selectedNotice.image && (
              <div 
                onClick={() => setPreviewImage(selectedNotice.image)}
                className="w-full h-64 rounded-3xl overflow-hidden border border-slate-100 shadow-sm cursor-zoom-in group relative"
              >
                <img src={selectedNotice.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                  <Maximize2 className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 drop-shadow-lg" />
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">{t("Official Release")}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(selectedNotice.createdAt), "dd MMMM, yyyy")}</span>
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedNotice.title}</h2>
              
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-slate-600 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                  {selectedNotice.content}
                </p>
              </div>

              {selectedNotice.file && (
                <div className="pt-4">
                  <a 
                    href={selectedNotice.file} 
                    target="_blank" 
                    className="flex items-center gap-3 p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <ExternalLink size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">{t("Download Attachment")}</p>
                      <p className="text-[10px] font-medium text-indigo-100">{t("Click to view official document")}</p>
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Image Preview Overlay */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[10000] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
          >
            <X size={24} />
          </button>
          
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
