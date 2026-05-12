"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { 
  CreditCard, Banknote, Calendar, Check, X, Clock, 
  ChevronDown, User, FileText, AlertCircle, RefreshCw,
  Wallet, TrendingUp, Filter, Search, MoreHorizontal,
  CheckCircle2, XCircle
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { useTranslation } from "@/hooks/use-translation";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";
import { CustomSelect } from "@/components/ui/custom-select";
import { Card } from "@/components/ui/card";

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
type TabType = "loan" | "advance" | "leave";

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
    <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${map[status]}`}>
      {icons[status]} {status}
    </span>
  );
};

export default function RequestsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("loan");
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("PENDING");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  
  const [requests, setRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState({ loanCount: 0, advanceCount: 0, leaveCount: 0 });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; type: TabType } | null>(null);
  const [hrNote, setHrNote] = useState("");

  const fetchCounts = useCallback(async () => {
    const res = await fetch("/api/requests");
    if (res.ok) setCounts(await res.json());
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let url = `/api/requests?type=${activeTab}&status=${statusFilter}`;
    if (filterYear !== "all") url += `&year=${filterYear}`;
    if (filterMonth !== "all") url += `&month=${filterMonth}`;
    
    const res = await fetch(url);
    if (res.ok) {
      setRequests(await res.json());
    }
    setLoading(false);
  }, [activeTab, statusFilter, filterYear, filterMonth]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async (id: string, type: TabType, action: "APPROVED" | "REJECTED", note = "") => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/requests?type=${type}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, hrNote: note })
      });
      if (res.ok) {
        fetchRequests();
        fetchCounts();
        setRejectModal(null);
        setHrNote("");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const tabs: { id: TabType; label: string; icon: any; count: number }[] = [
    { id: "loan", label: t("Loans"), icon: CreditCard, count: counts.loanCount },
    { id: "advance", label: t("Advance Salary"), icon: Banknote, count: counts.advanceCount },
    { id: "leave", label: t("Leave"), icon: Calendar, count: counts.leaveCount },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { label: "All Years", value: "all" },
    ...Array.from({ length: 5 }, (_, i) => ({ label: String(currentYear - i), value: String(currentYear - i) }))
  ];

  const monthOptions = [
    { label: "All Months", value: "all" },
    ...MONTHS_FULL.map((m, i) => ({ label: m, value: String(i + 1) }))
  ];

  const statusOptions = [
    { label: "Pending", value: "PENDING" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "All Status", value: "all" },
  ];

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <PageHeader
        title={t("Request Applications")}
        subtitle={t("Review and manage employee requests for loans, advances, and leaves.")}
      />

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-white text-brand-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === tab.id ? "bg-brand-100 text-brand-600" : "bg-slate-200 text-slate-500"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <Card className="p-4 border-slate-200 bg-white shadow-soft-xl rounded-[2rem]">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t("Search employee...")}
              className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <CustomSelect 
              label={t("Year")}
              options={yearOptions}
              value={filterYear}
              onChange={setFilterYear}
              className="min-w-[100px]"
            />

            <CustomSelect 
              label={t("Month")}
              options={monthOptions}
              value={filterMonth}
              onChange={setFilterMonth}
              className="min-w-[160px]"
            />

            <CustomSelect 
              label={t("Status")}
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              className="min-w-[140px]"
            />

            <div className="pt-5">
              <button onClick={fetchRequests} className="h-11 w-11 flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Applications History Table */}
      <Card className="border-slate-100 shadow-soft-xl rounded-[2.5rem] overflow-hidden bg-white">
        <DataTable
          loading={loading}
          data={requests}
          columns={[
            {
              key: "employee",
              title: t("Employee"),
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0 overflow-hidden">
                    {row.employee.image ? <img src={row.employee.image} alt={row.employee.name} className="h-full w-full object-cover" /> : row.employee.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 leading-tight">{row.employee.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{row.employee.employeeCode}</p>
                  </div>
                </div>
              )
            },
            {
              key: "details",
              title: t("Request Details"),
              render: (row) => (
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-black text-slate-900">
                    {activeTab === "leave" ? `${row.days} Days` : <CurrencyAmount amount={row.requestedAmount} />}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {activeTab === "loan" && row.installmentAmount > 0 ? `${t("EMI")}: ${row.installmentAmount}/mo` : 
                     activeTab === "advance" ? `${MONTHS_FULL[row.month-1]} ${row.year}` :
                     activeTab === "leave" ? `${format(new Date(row.fromDate), "dd MMM")} - ${format(new Date(row.toDate), "dd MMM")}` : ""}
                  </div>
                </div>
              )
            },
            {
              key: "date",
              title: t("Submission Date"),
              render: (row) => (
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-bold text-slate-700">{format(new Date(row.createdAt), "dd MMM, yyyy")}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}</p>
                </div>
              )
            },
            {
              key: "reason",
              title: t("Reason / Purpose"),
              render: (row) => (
                <div className="max-w-[200px]">
                  <p className="text-xs text-slate-500 font-medium line-clamp-2" title={row.reason}>"{row.reason}"</p>
                </div>
              )
            },
            {
              key: "status",
              title: t("Status"),
              render: (row) => <StatusBadge status={row.status} />
            },
            {
              key: "actions",
              title: t("Actions"),
              render: (row) => (
                <div className="flex items-center justify-end gap-2">
                  {row.status === "PENDING" ? (
                    <>
                      <button
                        onClick={() => handleAction(row.id, activeTab, "APPROVED")}
                        disabled={processingId === row.id}
                        className="h-8 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-emerald-100 flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3" /> {t("Approve")}
                      </button>
                      <button
                        onClick={() => { setRejectModal({ id: row.id, type: activeTab }); setHrNote(""); }}
                        disabled={processingId === row.id}
                        className="h-8 px-4 bg-rose-50 text-rose-600 hover:bg-rose-100 text-[10px] font-black uppercase tracking-widest rounded-lg border border-rose-100 transition-all flex items-center gap-1.5"
                      >
                        <X className="w-3 h-3" /> {t("Reject")}
                      </button>
                    </>
                  ) : (
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Reject Modal */}
      <Modal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title={t("Reject Application")}
        description={t("Please provide a reason for rejecting this request.")}
      >
        <div className="space-y-5 pt-4">
          <textarea
            value={hrNote}
            onChange={e => setHrNote(e.target.value)}
            placeholder={t("E.g., Budget constraints, invalid reason...")}
            rows={4}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all resize-none text-slate-900"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setRejectModal(null)}
              className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-black rounded-2xl transition-all"
            >
              {t("Cancel")}
            </button>
            <button
              onClick={() => handleAction(rejectModal!.id, rejectModal!.type, "REJECTED", hrNote)}
              disabled={!!processingId}
              className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white text-sm font-black rounded-2xl transition-all shadow-xl shadow-rose-200"
            >
              {t("Confirm Rejection")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
