"use client";

import { useState, useEffect } from "react";
import { format, differenceInMinutes, isValid } from "date-fns";
import { 
  Coffee, 
  Clock, 
  RefreshCw,
  CheckCircle2,
  Timer,
  ChevronDown,
  X,
  Calendar,
  Edit2,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";

// Safe date formatter to prevent page crashes on invalid dates
const safeFormat = (dateVal: any, formatStr: string) => {
  if (!dateVal) return "--";
  try {
    const d = new Date(dateVal);
    if (!isValid(d)) return "--";
    return format(d, formatStr);
  } catch (e) {
    return "--";
  }
};

export default function EmployeeBreaksPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [records, setRecords] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { t } = useTranslation();

  // Form State
  const [formData, setFormData] = useState({
    date: safeFormat(new Date(), "yyyy-MM-dd") || "",
    startTime: "",
    endTime: "",
    reason: ""
  });

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    const month = selectedMonth + 1;
    const year = selectedYear;
    
    try {
      const [breaksRes, requestsRes] = await Promise.all([
        fetch(`/api/employee/breaks?month=${month}&year=${year}`),
        fetch(`/api/employee/break-requests`)
      ]);

      const breaksData = await breaksRes.json();
      const requestsData = await requestsRes.json();

      setRecords(Array.isArray(breaksData) ? breaksData : []);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load break data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      if (!isValid(startDateTime) || !isValid(endDateTime)) {
        toast.error("Invalid date or time");
        setSubmitting(false);
        return;
      }

      const payload = {
        date: formData.date,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        reason: formData.reason
      };

      const url = editingId 
        ? `/api/employee/break-requests/${editingId}`
        : "/api/employee/break-requests";
      
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingId ? t("Request updated") : t("Request submitted"));
        handleCloseModal();
        fetchData();
      } else {
        const error = await res.json();
        toast.error(t(error.message) || t("Something went wrong"));
      }
    } catch (err) {
      toast.error(t("Invalid request"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (request: any) => {
    setEditingId(request.id);
    setFormData({
      date: safeFormat(request.date, "yyyy-MM-dd") !== "--" ? safeFormat(request.date, "yyyy-MM-dd") : "",
      startTime: safeFormat(request.startTime, "HH:mm") !== "--" ? safeFormat(request.startTime, "HH:mm") : "",
      endTime: safeFormat(request.endTime, "HH:mm") !== "--" ? safeFormat(request.endTime, "HH:mm") : "",
      reason: request.reason || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("Are you sure you want to cancel this request?"))) return;
    
    try {
      const res = await fetch(`/api/employee/break-requests/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("Request cancelled"));
        fetchData();
      }
    } catch (err) {
      toast.error(t("Failed to delete"));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      date: safeFormat(new Date(), "yyyy-MM-dd") !== "--" ? safeFormat(new Date(), "yyyy-MM-dd") : "",
      startTime: "",
      endTime: "",
      reason: ""
    });
  };

  const allActivity = [
    ...records.map(r => ({ ...r, type: 'RECORD', displayStatus: 'APPROVED' })),
    ...requests.filter(r => r.status !== 'APPROVED').map(r => ({ ...r, type: 'REQUEST', displayStatus: r.status }))
  ].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  });

  const totalMins = records.reduce((acc, curr) => acc + (typeof curr.duration === 'number' ? curr.duration : 0), 0);
  const totalHours = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-700 w-full px-2 sm:px-0">
      {/* Header Section */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">{t("Break Time Report")}</h1>
        <p className="text-[#6B7280] text-xs sm:text-sm">{t("Track your daily break durations based on activity logs.")}</p>
      </div>

      {/* Stats & Filters Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Monthly Total Card */}
        <div className="lg:col-span-4 bg-[#6366F1] p-6 sm:p-8 rounded-2xl text-white shadow-xl shadow-indigo-100 relative group min-h-[160px] sm:min-h-[180px] flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
             <div className="h-9 w-9 sm:h-10 sm:w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Clock size={18} className="sm:size-20" />
             </div>
             <span className="text-[9px] sm:text-[10px] font-bold text-white/70 uppercase tracking-widest">{t("Monthly Total")}</span>
          </div>
          <div className="relative z-10 mt-4 sm:mt-6">
             <h3 className="text-3xl sm:text-[36px] font-bold tracking-tight mb-0.5 leading-none">{totalHours || 0}{t("h")} {remainingMins || 0}{t("m")}</h3>
             <p className="text-white/60 text-[10px] sm:text-[11px] font-medium">{t("Total spent on breaks this month")}</p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Filter Card */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-[#F3F4F6] shadow-sm flex flex-col justify-center">
           <div className="space-y-3 sm:space-y-4">
              <label className="text-[9px] sm:text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.2em] ml-1">{t("Select Period")}</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                 <div className="flex-1 w-full grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="relative group">
                       <select 
                         value={selectedMonth}
                         onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                         className="w-full bg-[#F9FAFB] border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-[#374151] appearance-none focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer"
                       >
                         {months.map((m, i) => <option key={m} value={i}>{t(m)}</option>)}
                       </select>
                       <ChevronDown size={16} className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <div className="relative group">
                       <select 
                         value={selectedYear}
                         onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                         className="w-full bg-[#F9FAFB] border-none rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-[#374151] appearance-none focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer"
                       >
                         {years.map(y => <option key={y} value={y}>{y}</option>)}
                       </select>
                       <ChevronDown size={16} className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none group-hover:text-indigo-500 transition-colors" />
                    </div>
                 </div>
                 <button 
                   onClick={fetchData}
                   className="h-11 sm:h-[52px] px-6 sm:px-8 bg-[#111827] text-white rounded-xl sm:rounded-2xl font-bold text-xs hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                 >
                   <RefreshCw size={16} className="sm:size-18" />
                   {t("Refresh")}
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Activity History Section */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
           <div className="flex items-center gap-3">
              <Timer size={18} className="text-[#6366F1]" />
              <h2 className="text-[10px] sm:text-[11px] font-bold text-[#1F2937] uppercase tracking-[0.2em]">{t("Activity History")}</h2>
           </div>
           <button 
             onClick={() => setShowModal(true)}
             className="w-full sm:w-auto bg-[#6366F1] text-white px-8 py-3.5 rounded-xl sm:rounded-2xl font-bold text-[11px] sm:text-[12px] hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
           >
             <Coffee size={14} className="sm:w-4 sm:h-4" />
             {t("Request New Break")}
           </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-2xl border border-[#F3F4F6] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-[#F9FAFB]/50">
                  <th className="py-4 px-10 font-bold text-[#9CA3AF] text-[10px] uppercase tracking-[0.2em] border-b border-[#F3F4F6]">{t("Date & Day")}</th>
                  <th className="py-4 px-10 font-bold text-[#9CA3AF] text-[10px] uppercase tracking-[0.2em] border-b border-[#F3F4F6]">{t("Break Duration")}</th>
                  <th className="py-4 px-10 font-bold text-[#9CA3AF] text-[10px] uppercase tracking-[0.2em] border-b border-[#F3F4F6] text-center">{t("Time Range")}</th>
                  <th className="py-4 px-10 font-bold text-[#9CA3AF] text-[10px] uppercase tracking-[0.2em] border-b border-[#F3F4F6] text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]/60">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="py-8 px-10"><div className="h-4 bg-slate-50 rounded-lg w-full" /></td>
                    </tr>
                  ))
                ) : allActivity.length > 0 ? (
                  allActivity.map((record: any) => {
                    let duration = record.duration || 0;
                    if (record.type === 'REQUEST' && record.startTime && record.endTime) {
                       const start = new Date(record.startTime);
                       const end = new Date(record.endTime);
                       if (isValid(start) && isValid(end)) {
                         duration = differenceInMinutes(end, start);
                       }
                    }
                    const h = Math.floor((duration || 0) / 60);
                    const m = (duration || 0) % 60;

                    return (
                      <tr key={record.id} className="hover:bg-[#F9FAFB]/50 transition-colors group">
                        <td className="py-5 px-10">
                           <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-[#111827] text-sm">{format(new Date(record.date), "dd")} {t(format(new Date(record.date), "MMM"))}, {format(new Date(record.date), "yyyy")}</span>
                              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.2em]">{t(format(new Date(record.date), "EEEE"))}</span>
                           </div>
                        </td>
                        <td className="py-5 px-10">
                           <div className="flex items-center gap-3">
                              <div className={`h-1.5 w-1.5 rounded-full ${record.displayStatus === 'APPROVED' ? 'bg-[#6366F1]' : 'bg-amber-500'}`} />
                              <span className="font-bold text-[#4B5563] text-sm">{h > 0 ? `${h}${t("h")} ` : ""}{m} {t("mins")}</span>
                           </div>
                        </td>
                        <td className="py-5 px-10 text-center">
                           <div className="inline-flex items-center gap-3 bg-[#F9FAFB] px-3.5 py-1.5 rounded-xl border border-[#F3F4F6]">
                              <span className="text-[11px] font-bold text-[#6B7280]">{safeFormat(record.startTime, "hh:mm a")}</span>
                              <div className="h-px w-2 bg-[#D1D5DB]" />
                              <span className="text-[11px] font-bold text-[#6B7280]">
                                 {record.endTime ? safeFormat(record.endTime, "hh:mm a") : "--:--"}
                              </span>
                           </div>
                        </td>
                        <td className="py-5 px-10 text-right">
                           <div className="flex items-center justify-end gap-3">
                              {record.type === 'REQUEST' && record.displayStatus === 'PENDING' && (
                                <div className="flex items-center gap-1.5 mr-1">
                                  <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title={t("Edit Request")}>
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDelete(record.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title={t("Cancel Request")}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${
                                 record.displayStatus === 'APPROVED' ? 'bg-[#D1FAE5] text-[#059669]' :
                                 record.displayStatus === 'REJECTED' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                                 'bg-[#FEF3C7] text-[#D97706]'
                              }`}>
                                 {record.displayStatus === 'APPROVED' && <CheckCircle2 size={10} />}
                                 {t(record.displayStatus)}
                              </span>
                           </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                       <Coffee size={40} className="mx-auto text-[#E5E7EB] mb-3" />
                       <p className="text-[#9CA3AF] font-bold uppercase tracking-[0.3em] text-[10px]">{t("No activity logs found")}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden space-y-4">
           {loading ? (
             [1, 2, 3].map(i => (
               <div key={i} className="bg-white p-5 rounded-2xl border border-[#F3F4F6] animate-pulse h-32" />
             ))
           ) : allActivity.length > 0 ? (
             allActivity.map((record: any) => {
               let duration = record.duration || 0;
               if (record.type === 'REQUEST' && record.startTime && record.endTime) {
                  const start = new Date(record.startTime);
                  const end = new Date(record.endTime);
                  if (isValid(start) && isValid(end)) {
                    duration = differenceInMinutes(end, start);
                  }
               }
               const h = Math.floor((duration || 0) / 60);
               const m = (duration || 0) % 60;

               return (
                 <div key={record.id} className="bg-white p-5 rounded-2xl border border-[#F3F4F6] shadow-sm space-y-4">
                   <div className="flex items-center justify-between">
                     <div className="flex flex-col">
                       <span className="font-bold text-[#111827] text-sm">{format(new Date(record.date), "dd")} {t(format(new Date(record.date), "MMM"))}, {format(new Date(record.date), "yyyy")}</span>
                       <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">{t(format(new Date(record.date), "EEEE"))}</span>
                     </div>
                     <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                        record.displayStatus === 'APPROVED' ? 'bg-[#D1FAE5] text-[#059669]' :
                        record.displayStatus === 'REJECTED' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                        'bg-[#FEF3C7] text-[#D97706]'
                     }`}>
                        {t(record.displayStatus)}
                     </span>
                   </div>
                   <div className="flex items-center justify-between border-t border-[#F9FAFB] pt-4">
                     <div className="space-y-1">
                       <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest">{t("Duration")}</p>
                       <p className="font-bold text-[#4B5563] text-xs">{h > 0 ? `${h}${t("h")} ` : ""}{m} {t("mins")}</p>
                     </div>
                     <div className="space-y-1 text-right">
                       <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest">{t("Range")}</p>
                       <p className="font-bold text-[#6B7280] text-xs">
                         {safeFormat(record.startTime, "hh:mm a")} - {record.endTime ? safeFormat(record.endTime, "hh:mm a") : "--:--"}
                       </p>
                     </div>
                   </div>
                   {record.type === 'REQUEST' && record.displayStatus === 'PENDING' && (
                     <div className="flex items-center gap-2 pt-2">
                       <button onClick={() => handleEdit(record)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2">
                         <Edit2 size={12} /> {t("Edit")}
                       </button>
                       <button onClick={() => handleDelete(record.id)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2">
                         <Trash2 size={12} /> {t("Cancel")}
                       </button>
                     </div>
                   )}
                 </div>
               );
             })
           ) : (
             <div className="bg-white py-16 rounded-2xl border border-[#F3F4F6] text-center">
                <Coffee size={32} className="mx-auto text-[#E5E7EB] mb-2" />
                <p className="text-[#9CA3AF] font-bold uppercase tracking-widest text-[9px]">{t("No logs found")}</p>
             </div>
           )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={handleCloseModal} />
          <div className="relative bg-white w-full max-w-[480px] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 sm:p-8 border-b border-slate-50 bg-slate-50/30 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{editingId ? t("Edit Break Request") : t("Request Break")}</h3>
                <button 
                  onClick={handleCloseModal} 
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
              <p className="text-[12px] font-medium text-slate-500">
                {editingId ? t("Update your pending break request.") : t("Submit a manual entry for HR review.")}
              </p>
            </div>
            
            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Calendar size={12} className="text-indigo-500" /> {t("Break Date")}
                </label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-[14px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Start Time")}</label>
                  <input 
                    type="time" 
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-[14px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("End Time")}</label>
                  <input 
                    type="time" 
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-[14px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Reason")}</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder={t("Explain your manual entry...")}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-[14px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-inner resize-none"
                />
              </div>
              
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full h-14 bg-[#6366F1] text-white rounded-xl font-bold text-[14px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? t("Processing...") : editingId ? t("Update Request") : t("Submit Request")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
