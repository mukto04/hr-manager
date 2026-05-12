"use client";

import React, { useState, useEffect } from "react";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { Coffee, Calendar, History, Plus, Send, Clock, CheckCircle2, XCircle, Target, ArrowUpRight, ArrowDownRight, ChevronDown } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { Modal } from "@/components/ui/modal";

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

interface LeaveRequestItem {
  id: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: RequestStatus;
  hrNote?: string;
  createdAt: string;
}

const StatusBadge = ({ status }: { status: RequestStatus }) => {
  const map: Record<RequestStatus, string> = {
    PENDING: "bg-amber-50 text-amber-600 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-200",
    REJECTED: "bg-rose-50 text-rose-600 border-rose-200",
  };
  const icons: Record<RequestStatus, React.ReactNode> = {
    PENDING: <Clock className="w-3 h-3" />,
    APPROVED: <CheckCircle2 className="w-3 h-3" />,
    REJECTED: <XCircle className="w-3 h-3" />,
  };
  return (
    <span className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${map[status]}`}>
      {icons[status]} {status}
    </span>
  );
};

export default function EmployeeLeavesPage() {
  const [data, setData] = useState<{ leaveBalance: any; leaveRecords: any[] }>({ leaveBalance: null, leaveRecords: [] });
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ fromDate: "", toDate: "", isHalfDay: false, reason: "" });
  const [empInfo, setEmpInfo] = useState<any>(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetch("/api/employee/leaves").then(r => r.json()).then(d => { setData(d); setLoading(false); });
    fetch("/api/employee/requests?type=leave").then(r => r.json()).then(setRequests);
    fetch("/api/employee/me").then(r => r.json()).then(setEmpInfo);
  }, []);

  const calcDays = () => {
    if (!form.fromDate || !form.toDate) return 0;
    if (form.isHalfDay) return 0.5;
    const from = new Date(form.fromDate);
    const to = new Date(form.toDate);
    if (to < from) return 0;
    const days = eachDayOfInterval({ start: from, end: to }).filter(d => !isWeekend(d)).length;
    return days;
  };

  const days = calcDays();

  const handleSubmit = async () => {
    if (!form.reason || days === 0) return;
    setSubmitting(true);
    const res = await fetch("/api/employee/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "leave",
        fromDate: form.fromDate,
        toDate: form.isHalfDay ? form.fromDate : form.toDate,
        days,
        reason: form.reason,
        employeeName: empInfo?.name || "Employee",
      })
    });
    if (res.ok) {
      fetch("/api/employee/requests?type=leave").then(r => r.json()).then(setRequests);
      setShowModal(false);
      setForm({ fromDate: "", toDate: "", isHalfDay: false, reason: "" });
    }
    setSubmitting(false);
  };

  const { leaveBalance } = data;
  const leaveRecords = data.leaveRecords || [];
  const used = leaveBalance ? (leaveBalance.totalLeave - leaveBalance.dueLeave) : 0;
  const remaining = leaveBalance?.dueLeave || 0;
  const total = leaveBalance?.totalLeave || 1;
  const percentage = Math.min((remaining / total) * 100, 100);

  // Circular Progress Constants
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  if (loading) return <div className="space-y-8 animate-pulse w-full"><div className="h-24 bg-slate-100 rounded-2xl" /></div>;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{t("Leave Management")}</h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm">{t("Track and manage your yearly leave allocations")}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <button className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 shadow-sm hover:border-indigo-200 transition-all">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              {t("Year")}: {leaveBalance?.year || new Date().getFullYear()}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {t("Apply for Leave")}
          </button>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="bg-white rounded-[32px] border border-slate-100 p-8 sm:p-10 shadow-sm shadow-slate-200/50 relative overflow-hidden group">
        {/* Watermark */}
        <div className="absolute -right-6 -bottom-6 text-slate-50 opacity-[0.03] rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-0">
          <Coffee size={240} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-20">
          {/* Circular Progress Section */}
          <div className="flex items-center gap-8 shrink-0">
            <div className="relative flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-100"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="text-indigo-600 transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900">{remaining}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("REMAINING")}</span>
              </div>
            </div>

            {/* Middle Stats */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-2">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("TOTAL ASSIGNED")}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-slate-900">{leaveBalance?.totalLeave || 0}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400">{t("Yearly quota")}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("LEAVES USED")}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-slate-900">{used}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400">{t("Days deducted")}</p>
              </div>
            </div>
          </div>

          {/* Right Status Section */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-10 xl:gap-20 lg:ml-auto">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("STATUS")}</p>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${remaining > 2 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-sm font-bold text-slate-900">
                  {remaining > 5 ? t("Healthy Balance") : remaining > 0 ? t("Limited Balance") : t("Balance Exhausted")}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("ACTIVE YEAR")}</p>
              <div className="inline-flex px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                  {t("SESSION")} {leaveBalance?.year || new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        {/* Right Column (History) */}
        <div className="space-y-6">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t("Deduction & Refund History")}</h2>
              <p className="text-slate-500 font-medium text-xs">{t("Comprehensive breakdown of your leave adjustments")}</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
              <Clock size={18} />
            </div>
          </div>

          {/* Applications list (if any pending) */}
          {requests.filter(r => r.status === "PENDING").length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("Pending Approval")}</p>
              {requests.filter(r => r.status === "PENDING").map(req => (
                <div key={req.id} className="bg-amber-50/50 border border-amber-100 rounded-[24px] p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {format(new Date(req.fromDate), "dd MMM")} — {format(new Date(req.toDate), "dd MMM yyyy")}
                        <span className="ml-2 text-[10px] text-amber-600 font-black">({req.days} {t("Days")})</span>
                      </p>
                      <p className="text-xs text-slate-500 font-medium line-clamp-1">{req.reason}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-white border border-amber-200 rounded-full text-[9px] font-black text-amber-600 uppercase tracking-widest">
                    {t("PENDING")}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History Log */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("ACTION DATE")}</th>
                    <th className="py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t("DESCRIPTION")}</th>
                    <th className="py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">{t("ADJUSTMENT")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {leaveRecords.length > 0 ? leaveRecords.map((record: any) => {
                    const isRefund = record.type === "REFUND";
                    return (
                      <tr key={record.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 px-8">
                          <div className="flex items-center gap-4">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                              isRefund ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-rose-50 border-rose-100 text-rose-500'
                            }`}>
                              {isRefund ? <ArrowUpRight size={14} /> : <Target size={14} />}
                            </div>
                            <span className="text-sm font-bold text-slate-900">
                              {format(new Date(record.date), "dd MMM yyyy")}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-slate-800">
                              {isRefund ? t("Balance Refund") : t("Leave Deduction")}
                            </p>
                            <p className="text-xs text-slate-400 font-medium italic">"{record.reason || record.category || t("System adjustment")}"</p>
                          </div>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black ${
                            isRefund ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {isRefund ? "+" : "-"}{record.amount} {t("Days")}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={3} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Coffee className="w-10 h-10 text-slate-100" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{t("NO ADJUSTMENT RECORDS FOUND")}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t("Apply for Leave")}
        description={t("Submit a leave request for HR approval.")}
      >
        <div className="space-y-5">
          {/* Half Day Toggle */}
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer group">
            <input
              type="checkbox"
              checked={form.isHalfDay}
              onChange={e => setForm({ ...form, isHalfDay: e.target.checked })}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm font-bold text-slate-700">{t("Half Day Leave (0.5 day)")}</span>
          </label>

          {/* From Date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{form.isHalfDay ? t("Date") : t("From Date")}</label>
            <input
              type="date"
              value={form.fromDate}
              onChange={e => setForm({ ...form, fromDate: e.target.value })}
              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
            />
          </div>

          {/* To Date (only if not half day) */}
          {!form.isHalfDay && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t("To Date")}</label>
              <input
                type="date"
                value={form.toDate}
                min={form.fromDate}
                onChange={e => setForm({ ...form, toDate: e.target.value })}
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
              />
            </div>
          )}

          {/* Days Preview */}
          {days > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <p className="text-sm font-bold text-indigo-700">{days} {days === 0.5 ? t("Half Day") : days === 1 ? t("Day") : t("Days")} {t("of leave")}</p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t("Reason")}</label>
            <textarea
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder={t("Explain the reason for your leave...")}
              rows={3}
              className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 h-11 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-2xl transition-all">
              {t("Cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.reason || days === 0}
              className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
              {submitting ? t("Submitting...") : t("Submit Request")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
