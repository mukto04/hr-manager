"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Coins, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Banknote,
  TrendingUp,
  CreditCard,
  Layers,
  Wallet,
  TrendingDown,
  AlertCircle,
  Plus,
  Info,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  ShieldCheck,
  History,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/hooks/use-translation";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";
import { cn } from "@/utils/classnames";
import { FinancialSecurityGuard } from "@/components/shared/financial-security-guard";

const PAYMENT_METHODS = [
  "Bank Transfer",
  "Cash Payment",
  "Cheque",
  "Mobile Banking"
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("due"); // due, complete
  const { t } = useTranslation();

  // Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    totalAmount: "0",
    amount: "0",
    date: format(new Date(), "yyyy-MM-dd"),
    method: "Bank Transfer",
    note: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);

  // Ref for click-outside
  const methodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();

    const handleClickOutside = (event: MouseEvent) => {
      if (isMethodDropdownOpen && methodRef.current && !methodRef.current.contains(event.target as Node)) {
        setIsMethodDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMethodDropdownOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, projectsRes] = await Promise.all([
        fetch("/api/projects/all-payments"),
        fetch("/api/projects")
      ]);
      
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        // The API now returns payments included, so we can calculate directly
        const enriched = projectsData.map((p: any) => {
           const collected = (p.payments || []).reduce((acc: number, pay: any) => acc + pay.amount, 0);
           return { ...p, collected, dueBalance: p.totalAmount - collected };
        });
        
        // Ensure explicit sorting by createdAt descending to match Projects page
        setProjects(enriched.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (project: any) => {
    setSelectedProject(project);
    setPaymentForm({
      totalAmount: project.totalAmount.toString(),
      amount: "0",
      date: format(new Date(), "yyyy-MM-dd"),
      method: "Bank Transfer",
      note: ""
    });
    setIsPaymentModalOpen(true);
    setIsMethodDropdownOpen(false);
  };

  const handleUpdateFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (parseFloat(paymentForm.totalAmount) !== selectedProject.totalAmount) {
         await fetch(`/api/projects/${selectedProject.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...selectedProject, totalAmount: parseFloat(paymentForm.totalAmount) })
         });
      }

      if (parseFloat(paymentForm.amount) !== 0) {
         await fetch(`/api/projects/${selectedProject.id}/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               amount: parseFloat(paymentForm.amount),
               date: paymentForm.date,
               method: paymentForm.method,
               note: paymentForm.note
            })
         });
      }

      setIsPaymentModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.clientSource && p.clientSource.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTab = activeTab === "due" ? p.dueBalance > 0 : p.dueBalance <= 0;
    return matchesSearch && matchesTab;
  });

  const totalReceivables = projects.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalCollected = projects.reduce((acc, p) => acc + (p.collected || 0), 0);
  const totalPending = totalReceivables - totalCollected;

  return (
    <FinancialSecurityGuard>
      <div className="space-y-8 pb-20 animate-in fade-in duration-700 bg-white min-h-screen">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-8 pt-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t("Payment Tracking")}</h1>
            <p className="text-slate-500 font-medium text-sm">{t("Manage project finances and client payments.")}</p>
          </div>
          <div className="relative group max-w-xs w-full">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
             <input 
               type="text" 
               placeholder={t("Search projects...")}
               className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50/50 border-transparent focus:bg-white focus:ring-1 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all text-sm font-semibold shadow-none"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8">
           <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
              <div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                 <Wallet size={24} />
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("TOTAL RECEIVABLES")}</p>
                 <div className="text-2xl font-black text-slate-900 tracking-tight"><CurrencyAmount amount={totalReceivables} showEye={false} /></div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
              <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                 <TrendingUp size={24} />
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("TOTAL COLLECTED")}</p>
                 <div className="text-2xl font-black text-slate-900 tracking-tight"><CurrencyAmount amount={totalCollected} showEye={false} /></div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
              <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                 <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("OUTSTANDING DUE")}</p>
                 <div className="text-2xl font-black text-rose-600 tracking-tight"><CurrencyAmount amount={totalPending} showEye={false} /></div>
              </div>
           </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-8 flex items-center justify-between border-b border-slate-100 pb-4">
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab("due")}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === "due" ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-400 hover:text-slate-600"
                )}
              >
                 <History size={14} />
                 {t("Pending Collections")}
              </button>
              <button 
                onClick={() => setActiveTab("complete")}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === "complete" ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-400 hover:text-slate-600"
                )}
              >
                 <CheckCircle2 size={14} />
                 {t("Complete Payments")}
              </button>
           </div>
        </div>

        <div className="mx-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden max-h-[calc(100vh-320px)] min-h-[400px] flex flex-col">
           <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse table-fixed">
                 <thead className="bg-[#F8FAFC]/90 border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md">
                    <tr>
                       <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[80px]">{t("SL")}</th>
                       <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[250px]">{t("PROJECT NAME")}</th>
                       <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[180px]">{t("CLIENT SOURCE")}</th>
                       <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[150px]">{t("TOTAL AMOUNT")}</th>
                       <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[150px]">{t("COLLECTED")}</th>
                       <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[180px]">{t("DUE BALANCE")}</th>
                       <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[150px]">{t("STATUS")}</th>
                       <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-right w-[180px]">{t("ACTIONS")}</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 relative">
                    {loading ? (
                      [1, 2, 3, 4, 5].map(i => (
                        <tr key={i} className="animate-pulse">
                           <td colSpan={8} className="py-6 px-8"><div className="h-4 bg-slate-50 rounded w-full" /></td>
                        </tr>
                      ))
                    ) : filteredProjects.length > 0 ? (
                      filteredProjects.map((project, index) => (
                        <tr key={project.id} className="hover:bg-slate-50/50 transition-all group">
                           <td className="py-5 px-8">
                              <span className="text-[11px] font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                           </td>
                           <td className="py-5 px-8">
                              <div className="flex flex-col">
                                 <p className="font-bold text-slate-900 text-sm tracking-tight">{project.name}</p>
                                 <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{project.description || t("No details")}</p>
                              </div>
                           </td>
                           <td className="py-5 px-8">
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-tight border border-slate-200">
                                 {project.clientSource || "Internal"}
                              </span>
                           </td>
                           <td className="py-5 px-8">
                              <div className="text-sm font-bold text-slate-600"><CurrencyAmount amount={project.totalAmount} showEye={false} /></div>
                           </td>
                           <td className="py-5 px-8">
                              <div className="text-sm font-bold text-emerald-600"><CurrencyAmount amount={project.collected || 0} showEye={false} /></div>
                           </td>
                           <td className="py-5 px-8">
                              <div className={cn(
                                "text-sm font-black tracking-tight",
                                project.dueBalance > 0 ? "text-rose-600" : "text-slate-400"
                              )}>
                                 <CurrencyAmount amount={project.dueBalance} showEye={false} />
                              </div>
                           </td>
                           <td className="py-5 px-8">
                              <div className={cn(
                                 "inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                 project.dueBalance <= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                              )}>
                                 {project.dueBalance <= 0 ? t("CLEARED") : t("PENDING")}
                              </div>
                           </td>
                           <td className="py-5 px-8 text-right">
                              <button 
                                onClick={() => handleOpenPaymentModal(project)}
                                className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                              >
                                {t("Update Finance")}
                              </button>
                           </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                             <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                <History size={32} />
                             </div>
                             <p className="text-slate-400 font-medium text-sm">{t("No payment records found.")}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Payment Management Modal */}
        <Modal 
          open={isPaymentModalOpen} 
          onClose={() => setIsPaymentModalOpen(false)}
          title={t("Payment Management")}
          description={`${t("Manage financial details for")}: ${selectedProject?.name}`}
          size="lg"
        >
          <div className="space-y-8">
            <form onSubmit={handleUpdateFinancials} className="space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("Total Project Amount")}</label>
                       <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Banknote size={18} /></div>
                          <input 
                            type="number"
                            value={paymentForm.totalAmount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, totalAmount: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600/30 transition-all outline-none text-sm font-semibold"
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("Payment Method")}</label>
                       <div className="relative" ref={methodRef}>
                          <button 
                            type="button"
                            onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
                            className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-transparent text-left text-sm font-semibold flex items-center justify-between group"
                          >
                             {paymentForm.method}
                             <ChevronDown size={18} className={cn("text-slate-400 transition-transform", isMethodDropdownOpen && "rotate-180")} />
                          </button>
                          
                          {isMethodDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                               {PAYMENT_METHODS.map(m => (
                                 <div 
                                   key={m}
                                   onClick={() => { setPaymentForm({ ...paymentForm, method: m }); setIsMethodDropdownOpen(false); }}
                                   className={cn(
                                     "px-5 py-3 text-sm font-semibold cursor-pointer transition-colors",
                                     paymentForm.method === m ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                                   )}
                                 >
                                    {m}
                                 </div>
                               ))}
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">{t("Payment Amount (New)")}</label>
                       <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600"><Coins size={18} /></div>
                          <input 
                            type="number"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-indigo-50/50 border-indigo-200 text-indigo-600 placeholder:text-indigo-300 outline-none text-sm font-bold focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600/40 transition-all"
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("Payment Date")}</label>
                       <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Calendar size={18} /></div>
                          <input 
                            type="date"
                            value={paymentForm.date}
                            onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600/30 transition-all outline-none text-sm font-semibold"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("Financial Notes")}</label>
                    <textarea 
                      rows={4}
                      value={paymentForm.note}
                      onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                      placeholder={t("Any specific details about this payment...")}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600/30 transition-all outline-none text-sm font-semibold resize-none"
                    />
                 </div>

                 <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                    <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                       <Info size={20} />
                    </div>
                    <div className="space-y-1">
                       <p className="text-xs font-black text-amber-900 uppercase tracking-tight">{t("Financial Accuracy")}</p>
                       <p className="text-[10px] text-amber-700/80 leading-relaxed font-medium">
                          {t("Updating the total amount will affect the due balance for this project. New payments will be added to the collection history.")}
                       </p>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 pt-4">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="flex-1 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold"
                    >
                       {t("Cancel")}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20"
                    >
                       {isSubmitting ? <Loader2 className="animate-spin" /> : t("Update Financials")}
                    </Button>
                 </div>
              </form>
           </div>
        </Modal>
      </div>
    </FinancialSecurityGuard>
  );
}

function Loader2({ className }: { className?: string }) {
  return <div className={cn("animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent", className)} />;
}
