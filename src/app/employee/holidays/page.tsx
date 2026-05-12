"use client";

import { useState, useEffect } from "react";
import { format, isPast, isToday } from "date-fns";
import { CalendarRange, ShieldCheck, MapPin, ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function EmployeeHolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    fetch("/api/employee/holidays")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch holidays");
        return res.json();
      })
      .then(data => {
        setHolidays(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Holidays fetch error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse p-2">
        <div className="h-40 bg-slate-100 rounded-2xl" />
        <div className="space-y-6">
           {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-50 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t("Holiday Calendar")}</h1>
          <p className="text-slate-500 font-medium text-sm">{t("Official list of public and company holidays for {year}.", { year: new Date().getFullYear() })}</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
           <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <CalendarRange size={16} />
           </div>
           <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">{new Date().getFullYear()} {t("Schedule")}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 blur-3xl rounded-full -translate-y-20 translate-x-20" />
        
        {holidays.length > 0 ? (
          <div className="relative border-l-2 border-indigo-100 ml-4 sm:ml-8 space-y-12 py-4">
            {holidays.map((holiday) => {
              const dateObj = new Date(holiday.date);
              const isPassed = isPast(dateObj) && !isToday(dateObj);
              const isCurrent = isToday(dateObj);
              
              return (
                <div key={holiday.id} className="relative pl-10 sm:pl-12 group">
                  {/* Timeline dot */}
                  <div className={`absolute -left-[11px] top-4 h-5 w-5 rounded-full border-4 border-white shadow-md transition-all duration-500 ${
                    isCurrent ? 'bg-indigo-600 scale-125 ring-4 ring-indigo-100' :
                    isPassed ? 'bg-slate-300' : 'bg-emerald-500 group-hover:scale-110'
                  }`} />
                  
                  <div className={`rounded-2xl p-6 sm:p-8 border transition-all duration-500 ${
                    isCurrent ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20' :
                    isPassed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className={`h-20 w-20 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-colors duration-500 ${
                          isCurrent ? 'bg-white/20 border-white/20 text-white' :
                          isPassed ? 'bg-slate-200 border-slate-200 text-slate-500' : 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600'
                        }`}>
                          <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{t(format(dateObj, "MMM"))}</span>
                          <span className="text-3xl font-black leading-none">{format(dateObj, "dd")}</span>
                        </div>
                        <div className="space-y-1">
                          <h3 className={`text-xl font-extrabold tracking-tight ${isCurrent ? 'text-white' : isPassed ? 'text-slate-600' : 'text-slate-900'}`}>
                            {holiday.name}
                          </h3>
                          <div className={`flex items-center gap-3 text-xs font-bold uppercase tracking-widest ${isCurrent ? 'text-white/70' : 'text-slate-400'}`}>
                            <span>{t(format(dateObj, "EEEE"))}</span>
                            <div className={`h-1 w-1 rounded-full ${isCurrent ? 'bg-white/30' : 'bg-slate-300'}`} />
                            <span>{holiday.totalDays} {holiday.totalDays > 1 ? t("Days") : t("Day")}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="shrink-0">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border transition-colors duration-500 ${
                          isCurrent ? "bg-white/20 text-white border-white/30" :
                          isPassed ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600"
                        }`}>
                          {isCurrent ? t("Active Today") : isPassed ? t("Past Holiday") : t("Upcoming")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 space-y-4">
             <div className="h-20 w-20 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-200">
                <CalendarRange size={40} />
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[11px]">{t("No official holidays scheduled for this year yet.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
