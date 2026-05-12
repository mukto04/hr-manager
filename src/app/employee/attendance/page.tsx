"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  UserX, 
  Clock as ClockIcon, 
  CalendarDays,
  Edit2,
  AlertCircle
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export default function EmployeeAttendance() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const { t } = useTranslation();

  // Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [requestForm, setRequestForm] = useState({
    checkIn: "",
    checkOut: "",
    reason: "",
    attachment: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendance();
    fetchRequests();
  }, [currentDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    
    try {
      const res = await fetch(`/api/employee/attendance?month=${month}&year=${year}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      const data = await res.json();
      setRecords(data.records || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/employee/attendance/requests");
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      setRequests(data || []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    }
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const openRequestModal = (record: any) => {
    setSelectedRecord(record);
    setRequestForm({
      checkIn: record.checkIn ? format(new Date(record.checkIn), "HH:mm") : "",
      checkOut: record.checkOut ? format(new Date(record.checkOut), "HH:mm") : "",
      reason: "",
      attachment: ""
    });
    setFormError(null);
    setIsRequestModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFormError(t("File size must be less than 2MB"));
        return;
      }
      setFormError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRequestForm(prev => ({ ...prev, attachment: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    
    setIsSubmitting(true);
    try {
      // Create proper datetime strings based on the record's date and the time inputs
      const recordDate = format(new Date(selectedRecord.date), "yyyy-MM-dd");
      
      let checkInDate = null;
      if (requestForm.checkIn) {
        checkInDate = new Date(`${recordDate}T${requestForm.checkIn}:00`);
      }
      
      let checkOutDate = null;
      if (requestForm.checkOut) {
        checkOutDate = new Date(`${recordDate}T${requestForm.checkOut}:00`);
      }

      if (!checkInDate && !checkOutDate) {
        setFormError(t("Please provide at least one time (Check-In or Check-Out)."));
        setIsSubmitting(false);
        return;
      }

      if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
        setFormError(t("Check-out time must be after check-in time."));
        setIsSubmitting(false);
        return;
      }

      const res = await fetch("/api/employee/attendance/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedRecord.date,
          checkIn: checkInDate?.toISOString() || null,
          checkOut: checkOutDate?.toISOString() || null,
          reason: requestForm.reason,
          attachment: requestForm.attachment || null
        })
      });

      if (res.ok) {
        setIsRequestModalOpen(false);
        fetchRequests(); // Refresh requests
      } else {
        const err = await res.json();
        setFormError(t(err.message || "Failed to submit request"));
      }
    } catch (err) {
      console.error(err);
      setFormError(t("An error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t("Attendance Logs")}</h1>
          <p className="text-slate-500 font-medium text-sm">{t("Review your daily records and synchronization status.")}</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <button 
            onClick={handlePrevMonth} 
            className="h-9 w-9 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all group"
          >
            <ChevronLeft size={18} className="text-slate-400 group-hover:text-indigo-600" />
          </button>
          <span className="font-bold text-slate-700 px-4 text-[13px] uppercase tracking-widest min-w-[140px] text-center">
            {t(format(currentDate, "MMMM"))} {format(currentDate, "yyyy")}
          </span>
          <button 
            onClick={handleNextMonth} 
            className="h-9 w-9 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all group"
          >
            <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-600" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <Activity size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t("Present")}</p>
              <p className="text-xl font-bold text-slate-900 leading-none">{summary.presentCount} <span className="text-[10px] text-slate-400 font-medium lowercase">{t("days")}</span></p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <UserX size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t("Absent")}</p>
              <p className="text-xl font-bold text-slate-900 leading-none">{summary.absentCount} <span className="text-[10px] text-slate-400 font-medium lowercase">{t("days")}</span></p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <ClockIcon size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t("Avg. Hours")}</p>
              <p className="text-xl font-bold text-slate-900 leading-none">{summary.avgWorkingHours} <span className="text-[10px] text-slate-400 font-medium lowercase">{t("hrs")}</span></p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="h-12 w-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center shrink-0">
              <Activity size={24} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t("Target")}</p>
              <p className="text-xl font-bold text-slate-900 leading-none">{summary.reqWorkingTime || "09:00"} <span className="text-[10px] text-slate-400 font-medium lowercase">{t("hrs")}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
           <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-indigo-600" strokeWidth={2} /> 
              {t("Monthly Performance Ledger")}
           </h2>
        </div>
        
        {loading ? (
          <div className="animate-pulse p-10 space-y-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-14 bg-slate-50 rounded-2xl" />)}
          </div>
        ) : records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Date & Day")}</th>
                  <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Verification Status")}</th>
                  <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Check In")}</th>
                  <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Check Out")}</th>
                  <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("System Notes")}</th>
                  <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-center">{t("Requests")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record: any) => {
                  const isUpcoming = record.status === "UPCOMING";

                  
                  const hasPendingRequest = requests.some(req => 
                    format(new Date(req.date), "yyyy-MM-dd") === format(new Date(record.date), "yyyy-MM-dd") &&
                    req.status === "PENDING"
                  );

                  const canRequest = !isUpcoming && !hasPendingRequest;

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="py-5 px-8">
                        <div className="flex flex-col">
                           <span className="font-bold text-slate-800 text-sm tracking-tight">{format(new Date(record.date), "dd")} {t(format(new Date(record.date), "MMM"))}, {format(new Date(record.date), "yyyy")}</span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t(format(new Date(record.date), "EEEE"))}</span>
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                          record.status === "PRESENT" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          record.status === "ABSENT" ? "bg-rose-50 text-rose-600 border-rose-100" :
                          record.status === "LATE" ? "bg-amber-50 text-amber-600 border-amber-100" :
                          record.status === "WEEKEND" ? "bg-slate-900 text-white border-slate-900" :
                          record.status === "HOLIDAY" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                          "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {t(record.status)}
                        </span>
                      </td>
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-2">
                           <div className={`h-1.5 w-1.5 rounded-full ${record.checkIn ? "bg-emerald-500" : "bg-slate-200"}`} />
                           <span className={`text-sm font-semibold ${record.checkIn ? "text-slate-700" : "text-slate-300 font-normal"}`}>
                             {record.checkIn ? format(new Date(record.checkIn), "hh:mm a") : "--:--"}
                           </span>
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-2">
                           <div className={`h-1.5 w-1.5 rounded-full ${record.checkOut ? "bg-rose-500" : "bg-slate-200"}`} />
                           <span className={`text-sm font-semibold ${record.checkOut ? "text-slate-700" : "text-slate-300 font-normal"}`}>
                             {record.checkOut ? format(new Date(record.checkOut), "hh:mm a") : "--:--"}
                           </span>
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <p className="text-xs font-medium text-slate-500 truncate max-w-[150px] italic">
                          {record.note ? t(record.note) : t("Auto Log")}
                        </p>
                      </td>
                      <td className="py-5 px-8 text-center">
                        {canRequest && (
                          <button 
                            onClick={() => openRequestModal(record)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-200"
                            title={t("Request Edit")}
                          >
                            <Edit2 size={14} strokeWidth={2} />
                          </button>
                        )}
                        {hasPendingRequest && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200" title={t("Request Pending")}>
                             <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t("Processing")}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center space-y-4">
             <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                <CalendarDays size={32} />
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">{t("No attendance ledger entries found.")}</p>
          </div>
        )}
      </div>

      <Modal
        open={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title={t("Request Attendance Correction")}
        description={selectedRecord ? t("Submit a correction request for {date}.", { date: format(new Date(selectedRecord.date), "dd") + " " + t(format(new Date(selectedRecord.date), "MMMM")) + ", " + format(new Date(selectedRecord.date), "yyyy") }) : ""}
      >
        <form onSubmit={handleSubmitRequest} className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("Requested Check In")}</label>
              <Input
                type="time"
                value={requestForm.checkIn}
                onChange={(e) => setRequestForm({ ...requestForm, checkIn: e.target.value })}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-semibold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("Requested Check Out")}</label>
              <Input
                type="time"
                value={requestForm.checkOut}
                onChange={(e) => setRequestForm({ ...requestForm, checkOut: e.target.value })}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 font-semibold"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("Screenshot Proof (Optional)")}</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full text-sm text-slate-500 font-medium file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              {requestForm.attachment && (
                <div className="mt-3 h-32 w-full sm:w-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={requestForm.attachment} alt="Proof preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("Reason for Correction")}</label>
            <textarea
              required
              value={requestForm.reason}
              onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
              className="w-full min-h-[100px] p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              placeholder={t("Explain why you are requesting this correction...")}
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2.5 p-3 bg-rose-50 border border-rose-100 rounded-xl animate-in slide-in-from-top-1 duration-200">
               <AlertCircle size={14} className="text-rose-500 shrink-0" />
               <p className="text-[11px] font-bold text-rose-600">{formError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl font-bold shadow-sm"
            >
              {isSubmitting ? t("Submitting Request...") : t("Submit Request")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRequestModalOpen(false)}
              className="px-6 h-12 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
            >
              {t("Cancel")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
