"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Wallet, Banknote, ShieldCheck, Clock, Info, Plus, X, Send, 
  CheckCircle2, XCircle, CreditCard, ChevronRight, AlertCircle,
  TrendingDown, DollarSign, Calendar, Filter
} from "lucide-react";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { useTranslation } from "@/hooks/use-translation";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { FinancialSecurityGuard } from "@/components/shared/financial-security-guard";

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

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
    <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${map[status]}`}>
      {icons[status]} {status}
    </span>
  );
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function EmployeeLoansPage() {
  const [data, setData] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"loan" | "advance" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({ 
    requestedAmount: "", 
    installmentAmount: "", 
    startMonth: new Date().getMonth() + 1,
    startYear: new Date().getFullYear(),
    reason: "" 
  });
  const [advanceForm, setAdvanceForm] = useState({ requestedAmount: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(), reason: "" });

  const fetchData = async () => {
    const [loansRes, reqsRes] = await Promise.all([
      fetch("/api/employee/loans"),
      fetch("/api/employee/requests")
    ]);
    
    if (loansRes.ok) setData(await loansRes.json());
    if (reqsRes.ok) {
      const d = await reqsRes.json();
      if (d && d.loans && d.advances) {
        setRequests([...d.loans.map((r:any) => ({...r, type: 'loan'})), ...d.advances.map((r:any) => ({...r, type: 'advance'}))]);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const submitLoan = async () => {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/employee/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "loan", ...loanForm, employeeName: data?.name })
    });
    if (res.ok) {
      setModal(null);
      setLoanForm({ 
        requestedAmount: "", 
        installmentAmount: "", 
        startMonth: new Date().getMonth() + 1,
        startYear: new Date().getFullYear(),
        reason: "" 
      });
      fetchData();
    } else {
      const err = await res.json();
      setError(err.message || "Failed to submit loan request.");
    }
    setSubmitting(false);
  };

  const submitAdvance = async () => {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/employee/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "advance", ...advanceForm, employeeName: data?.name })
    });
    if (res.ok) {
      setModal(null);
      setAdvanceForm({ requestedAmount: "", month: new Date().getMonth() + 1, year: new Date().getFullYear(), reason: "" });
      fetchData();
    } else {
      const err = await res.json();
      setError(err.message || "Failed to submit advance request.");
    }
    setSubmitting(false);
  };

  const openModal = (type: "loan" | "advance") => {
    setError(null);
    setModal(type);
  };

  if (loading) return <div className="p-8 animate-pulse space-y-8"><div className="h-32 bg-slate-100 rounded-3xl" /></div>;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const availableYears = [currentYear, currentYear + 1];
  
  const getAvailableMonths = (year: number) => {
    if (year > currentYear) return MONTHS.map((m, i) => ({ label: m, value: i + 1 }));
    return MONTHS.map((m, i) => ({ label: m, value: i + 1 })).filter(m => m.value >= currentMonth);
  };

  const activeLoans = data?.loans?.filter((l: any) => l.dueAmount > 0) || [];
  const activeAdvances = data?.advances?.filter((a: any) => !a.isDeducted && a.year >= currentYear) || [];

  const filteredHistory = requests.filter(req => {
    const reqYear = new Date(req.createdAt).getFullYear();
    const targetYear = req.type === 'loan' ? reqYear : (req.year || reqYear);
    return targetYear === selectedYear;
  });

  const historyYears = Array.from(new Set(requests.map(r => {
    const reqYear = new Date(r.createdAt).getFullYear();
    return r.type === 'loan' ? reqYear : (r.year || reqYear);
  }))).sort((a,b) => b - a);

  if (historyYears.length === 0) historyYears.push(currentYear);

  return (
    <FinancialSecurityGuard>
      <div className="space-y-8 pb-20 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t("Loan & Salary Advance")}</h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm">{t("Track your active loans and request financial assistance.")}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => openModal("loan")} className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-slate-200">
              <Plus className="w-4 h-4" />{t("New Loan")}
            </button>
            <button onClick={() => openModal("advance")} className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-brand-100">
              <Plus className="w-4 h-4" />{t("New Advance")}
            </button>
          </div>
        </div>

        {/* Overview Grid 50/50 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Loan Overview */}
          <div className="space-y-4">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-500" /> {t("Active Loan Overview")}
            </h2>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-full min-h-[200px]">
              {activeLoans.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Amount")}</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Due")}</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeLoans.map((loan: any) => (
                        <tr key={loan.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all"><DollarSign size={14} /></div>
                              <CurrencyAmount amount={loan.loanAmount} />
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-sm font-black text-brand-600"><CurrencyAmount amount={loan.dueAmount} /></div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                              {t("Running")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 opacity-40">
                  <ShieldCheck className="w-10 h-10 mb-2 stroke-[1]" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{t("No Active Loans")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Salary Advance Overview */}
          <div className="space-y-4">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Banknote className="w-4 h-4 text-indigo-500" /> {t("Salary Advance Overview")}
            </h2>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-full min-h-[200px]">
              {activeAdvances.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Amount")}</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Period")}</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Status")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeAdvances.map((adv: any) => (
                        <tr key={adv.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Banknote size={14} /></div>
                              <CurrencyAmount amount={adv.amount} />
                            </div>
                          </td>
                          <td className="px-6 py-5 text-sm font-bold text-slate-600">
                            {MONTHS_SHORT[adv.month-1]} {adv.year}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                              {t("Pending Deduction")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 opacity-40">
                  <Banknote className="w-10 h-10 mb-2 stroke-[1]" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{t("No Running Advances")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History Table with Filter */}
        <div className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Clock className="w-4 h-4" /> {t("Application History")}
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 bg-white pl-4 pr-1 py-1 rounded-2xl border border-slate-100 shadow-sm focus-within:ring-4 focus-within:ring-brand-500/10 transition-all">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <Select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="h-9 w-28 border-none bg-transparent text-xs font-black text-slate-700 shadow-none focus:ring-0"
                >
                  {historyYears.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Type")}</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Amount")}</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Date / Period")}</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Reason")}</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("Status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((req: any) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                              req.type === 'loan' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                              {req.type === 'loan' ? <CreditCard size={16} /> : <Banknote size={16} />}
                            </div>
                            <span className="text-sm font-black text-slate-700 capitalize">{req.type}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-300">
                          <AlertCircle className="w-10 h-10 stroke-[1.5]" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t("No records found for this year")}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Loan Modal */}
        <Modal 
          open={modal === "loan"} 
          onClose={() => setModal(null)}
          title={t("Apply for Loan")}
          description={t("Submit a loan request to HR. If you have an active loan, it will be topped up.")}
        >
          <div className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="mt-0.5"><Info className="w-4 h-4 text-rose-500" /></div>
                <p className="text-xs font-bold text-rose-700 leading-relaxed">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t("Requested Amount")}</label>
                <input type="number" value={loanForm.requestedAmount} onChange={e => setLoanForm({ ...loanForm, requestedAmount: e.target.value })} placeholder="0.00" className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t("Monthly Installment")}</label>
                <input type="number" value={loanForm.installmentAmount} onChange={e => setLoanForm({ ...loanForm, installmentAmount: e.target.value })} placeholder="0.00" className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("Adjustment Start Date")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t("Year")}</label>
                  <select 
                    value={loanForm.startYear} 
                    onChange={e => {
                      const year = parseInt(e.target.value);
                      setLoanForm({ ...loanForm, startYear: year, startMonth: year > currentYear ? 1 : Math.max(loanForm.startMonth, currentMonth) });
                    }} 
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
                  >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t("Month")}</label>
                  <select 
                    value={loanForm.startMonth} 
                    onChange={e => setLoanForm({ ...loanForm, startMonth: parseInt(e.target.value) })} 
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none"
                  >
                    {getAvailableMonths(loanForm.startYear).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t("Reason / Purpose")}</label>
              <textarea value={loanForm.reason} onChange={e => setLoanForm({ ...loanForm, reason: e.target.value })} placeholder={t("Explain why you need this loan...")} rows={3} className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 h-11 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-2xl transition-all">{t("Cancel")}</button>
              <button 
                onClick={submitLoan} 
                disabled={submitting || !loanForm.requestedAmount || !loanForm.installmentAmount || !loanForm.reason || (parseFloat(loanForm.installmentAmount) > parseFloat(loanForm.requestedAmount))} 
                className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg"
              >
                <Send className="w-4 h-4" />{submitting ? t("Submitting...") : t("Submit Request")}
              </button>
            </div>
          </div>
        </Modal>

        {/* Advance Modal */}
        <Modal
          open={modal === "advance"}
          onClose={() => setModal(null)}
          title={t("Request Advance Salary")}
          description={t("Submit an advance salary request. Multiple requests for the same month will be merged.")}
        >
          <div className="space-y-5">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="mt-0.5"><Info className="w-4 h-4 text-rose-500" /></div>
                <p className="text-xs font-bold text-rose-700 leading-relaxed">{error}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t("Requested Amount")}</label>
              <input type="number" value={advanceForm.requestedAmount} onChange={e => setAdvanceForm({ ...advanceForm, requestedAmount: e.target.value })} placeholder="0.00" className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t("Month")}</label>
                <select value={advanceForm.month} onChange={e => setAdvanceForm({ ...advanceForm, month: parseInt(e.target.value) })} className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t("Year")}</label>
                <input type="number" value={advanceForm.year} onChange={e => setAdvanceForm({ ...advanceForm, year: parseInt(e.target.value) })} className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{t("Reason")}</label>
              <textarea value={advanceForm.reason} onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })} placeholder={t("Explain why you need advance salary...")} rows={3} className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 h-11 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-2xl transition-all">{t("Cancel")}</button>
              <button onClick={submitAdvance} disabled={submitting || !advanceForm.requestedAmount || !advanceForm.reason} className="flex-1 h-11 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg">
                <Send className="w-4 h-4" />{submitting ? t("Submitting...") : t("Submit")}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </FinancialSecurityGuard>
  );
}
