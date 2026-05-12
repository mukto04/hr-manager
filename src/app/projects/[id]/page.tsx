"use client";

import { useState, useEffect, use } from "react";
import { 
  ArrowLeft, 
  Users, 
  Coins, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  UserPlus, 
  CheckCircle2,
  Settings,
  MoreVertical,
  Banknote,
  FileText,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useTranslation } from "@/hooks/use-translation";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { t } = useTranslation();
  const router = useRouter();

  // Modals
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Forms
  const [memberForm, setMemberForm] = useState({ employeeId: "", role: "Member" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: format(new Date(), "yyyy-MM-dd"), method: "Bank", reference: "", note: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchEmployees();
  }, []);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else {
        router.push("/projects");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees?all=true");
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberForm)
      });
      if (res.ok) {
        setIsMemberModalOpen(false);
        setMemberForm({ employeeId: "", role: "Member" });
        fetchProject();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    if (!confirm(t("Are you sure you want to remove this member?"))) return;
    try {
      const res = await fetch(`/api/projects/${id}/members?employeeId=${employeeId}`, {
        method: "DELETE"
      });
      if (res.ok) fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm)
      });
      if (res.ok) {
        setIsPaymentModalOpen(false);
        setPaymentForm({ amount: "", date: format(new Date(), "yyyy-MM-dd"), method: "Bank", reference: "", note: "" });
        fetchProject();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, status })
      });
      if (res.ok) fetchProject();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-10 animate-pulse space-y-10">
    <div className="h-20 bg-slate-100 rounded-2xl" />
    <div className="grid grid-cols-3 gap-6">
       <div className="col-span-2 h-96 bg-slate-50 rounded-2xl" />
       <div className="h-96 bg-slate-50 rounded-2xl" />
    </div>
  </div>;

  if (!project) return null;

  const totalPaid = project.payments.reduce((acc: number, p: any) => acc + p.amount, 0);
  const remaining = project.totalAmount - totalPaid;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <Link href="/projects" className="h-12 w-12 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm shrink-0">
              <ArrowLeft size={20} />
           </Link>
           <div className="space-y-1">
              <div className="flex items-center gap-3">
                 <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{project.name}</h1>
                 <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                   project.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                   project.status === 'ON_HOLD' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                   'bg-indigo-50 text-indigo-600 border-indigo-100'
                 }`}>
                   {t(project.status)}
                 </div>
              </div>
              <p className="text-slate-500 font-medium text-sm">{project.type || t("General Project")} • {t("Established on")} {format(new Date(project.createdAt), "dd MMM, yyyy")}</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <select 
              value={project.status} 
              onChange={(e) => updateStatus(e.target.value)}
              className="h-12 rounded-2xl border-slate-200 bg-white text-xs font-bold uppercase tracking-widest px-4 focus:ring-1 focus:ring-indigo-600 transition-all cursor-pointer"
           >
              <option value="IN_PROGRESS">{t("In Progress")}</option>
              <option value="ON_HOLD">{t("On Hold")}</option>
              <option value="COMPLETED">{t("Completed")}</option>
           </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
               <Coins size={24} strokeWidth={1.5} />
            </div>
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{t("Total Budget")}</p>
               <p className="text-xl font-black text-slate-900 leading-none"><CurrencyAmount amount={project.totalAmount} /></p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
               <Banknote size={24} strokeWidth={1.5} />
            </div>
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{t("Total Received")}</p>
               <p className="text-xl font-black text-emerald-600 leading-none"><CurrencyAmount amount={totalPaid} /></p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
               <AlertCircle size={24} strokeWidth={1.5} />
            </div>
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{t("Remaining Balance")}</p>
               <p className="text-xl font-black text-rose-600 leading-none"><CurrencyAmount amount={remaining} /></p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="h-14 w-14 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center shrink-0">
               <Users size={24} strokeWidth={1.5} />
            </div>
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">{t("Team Personnel")}</p>
               <p className="text-xl font-black text-slate-900 leading-none">{project.members.length} {t("Active")}</p>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
         {[
           { id: "overview", label: "Project Overview", icon: FileText },
           { id: "team", label: "Team Members", icon: Users },
           { id: "payments", label: "Payment Ledger", icon: Coins }
         ].map((tab) => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all relative ${
               activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
             }`}
           >
             <tab.icon size={16} />
             {t(tab.label)}
             {activeTab === tab.id && (
               <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
             )}
           </button>
         ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
         {activeTab === "overview" && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                 <div className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-lg font-bold text-slate-900">{t("Scope of Work")}</h3>
                    <p className="text-slate-600 text-[15px] font-medium leading-relaxed whitespace-pre-wrap">
                       {project.description || t("No detailed description provided for this project infrastructure.")}
                    </p>
                 </div>
              </div>
              <div className="space-y-8">
                 <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl rounded-full" />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-8 flex items-center gap-2">
                       <Clock size={14} /> {t("Project Timeline")}
                    </h3>
                    <div className="space-y-6 relative z-10">
                       <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                             <Calendar size={18} />
                          </div>
                          <div>
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("Initiated")}</p>
                             <p className="font-bold text-white tracking-tight">{project.startDate ? format(new Date(project.startDate), "MMMM dd, yyyy") : t("TBD")}</p>
                          </div>
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20 text-rose-400">
                             <Calendar size={18} />
                          </div>
                          <div>
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("Estimated Completion")}</p>
                             <p className="font-bold text-white tracking-tight">{project.endDate ? format(new Date(project.endDate), "MMMM dd, yyyy") : t("Open Ended")}</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
         )}

         {activeTab === "team" && (
           <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">{t("Active Team Assignment")}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{project.members.length} {t("Personnel Assigned")}</p>
                 </div>
                 <Button 
                    onClick={() => setIsMemberModalOpen(true)}
                    className="h-11 rounded-xl bg-indigo-600 text-white font-bold px-5 flex items-center gap-2"
                 >
                    <UserPlus size={18} />
                    {t("Assign Member")}
                 </Button>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50">
                       <tr>
                          <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Personnel")}</th>
                          <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Official Designation")}</th>
                          <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Project Role")}</th>
                          <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Assigned Date")}</th>
                          <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-center">{t("Actions")}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {project.members.map((member: any) => (
                         <tr key={member.id} className="hover:bg-slate-50/30 transition-all">
                            <td className="py-5 px-8">
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                     {member.employee.image ? (
                                       <img src={member.employee.image} alt="" className="w-full h-full object-cover" />
                                     ) : (
                                       <div className="w-full h-full flex items-center justify-center text-slate-300">
                                          <Users size={16} />
                                       </div>
                                     )}
                                  </div>
                                  <div className="min-w-0">
                                     <p className="font-bold text-slate-900 text-[13px] tracking-tight">{member.employee.name}</p>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{member.employee.employeeCode}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="py-5 px-8">
                               <p className="text-xs font-semibold text-slate-600">{member.employee.designation}</p>
                            </td>
                            <td className="py-5 px-8">
                               <span className="inline-flex px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                  {member.role}
                               </span>
                            </td>
                            <td className="py-5 px-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                               {format(new Date(member.assignedAt), "MMM dd, yyyy")}
                            </td>
                            <td className="py-5 px-8 text-center">
                               <button 
                                 onClick={() => handleRemoveMember(member.employeeId)}
                                 className="h-9 w-9 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center mx-auto"
                               >
                                  <Trash2 size={16} />
                               </button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
         )}

         {activeTab === "payments" && (
           <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">{t("Transaction Ledger")}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{project.payments.length} {t("Verified Transactions")}</p>
                 </div>
                 <Button 
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="h-11 rounded-xl bg-emerald-600 text-white font-bold px-5 flex items-center gap-2"
                 >
                    <Plus size={18} />
                    {t("Record Payment")}
                 </Button>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50">
                       <tr>
                          <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Date")}</th>
                          <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Method")}</th>
                          <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Reference")}</th>
                          <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{t("Note")}</th>
                          <th className="py-5 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-right">{t("Amount")}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {project.payments.map((payment: any) => (
                         <tr key={payment.id} className="hover:bg-slate-50/30 transition-all">
                            <td className="py-5 px-8 text-xs font-bold text-slate-700">
                               {format(new Date(payment.date), "MMM dd, yyyy")}
                            </td>
                            <td className="py-5 px-8">
                               <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest">
                                  {payment.method}
                               </span>
                            </td>
                            <td className="py-5 px-8 text-xs font-bold text-slate-500">
                               {payment.reference || "-"}
                            </td>
                            <td className="py-5 px-8 text-xs font-medium text-slate-400 italic">
                               {payment.note || "-"}
                            </td>
                            <td className="py-5 px-8 text-right font-black text-slate-900">
                               <CurrencyAmount amount={payment.amount} />
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
         )}
      </div>

      {/* Modals */}
      <Modal
        open={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title={t("Assign Project Personnel")}
        description={t("Select an employee and define their role within the project scope.")}
      >
        <form onSubmit={handleAddMember} className="space-y-6 pt-4">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Select Employee")}</label>
              <select 
                required
                className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-bold focus:bg-white transition-all outline-none"
                value={memberForm.employeeId}
                onChange={(e) => setMemberForm({...memberForm, employeeId: e.target.value})}
              >
                <option value="">{t("Choose Personnel...")}</option>
                {employees.filter(e => !project.members.some((m:any) => m.employeeId === e.id)).map(e => (
                   <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
                ))}
              </select>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Project Role")}</label>
              <Input 
                 placeholder="e.g. Project Lead"
                 value={memberForm.role}
                 onChange={(e) => setMemberForm({...memberForm, role: e.target.value})}
                 className="h-12 rounded-xl bg-slate-50 font-bold"
              />
           </div>
           <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-xl bg-indigo-600 text-white font-bold">
                 {isSubmitting ? t("Assigning...") : t("Finalize Assignment")}
              </Button>
           </div>
        </form>
      </Modal>

      <Modal
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={t("Record Financial Inflow")}
        description={t("Log a new payment received from the client for this project.")}
      >
        <form onSubmit={handleAddPayment} className="space-y-6 pt-4">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Amount Received")}</label>
                <Input 
                   type="number"
                   required
                   value={paymentForm.amount}
                   onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                   className="h-12 rounded-xl bg-slate-50 font-black text-indigo-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Transaction Date")}</label>
                <Input 
                   type="date"
                   required
                   value={paymentForm.date}
                   onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                   className="h-12 rounded-xl bg-slate-50 font-bold"
                />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Payment Method")}</label>
                <select 
                   className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 text-sm font-bold focus:bg-white transition-all outline-none"
                   value={paymentForm.method}
                   onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                >
                   <option value="Bank">{t("Bank Transfer")}</option>
                   <option value="Cash">{t("Cash Payment")}</option>
                   <option value="Cheque">{t("Cheque")}</option>
                   <option value="Mobile">{t("Mobile Banking")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Reference ID")}</label>
                <Input 
                   placeholder={t("e.g. TXN9988")}
                   value={paymentForm.reference}
                   onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                   className="h-12 rounded-xl bg-slate-50 font-bold"
                />
              </div>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Optional Note")}</label>
              <textarea 
                 className="w-full min-h-[80px] p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all resize-none"
                 value={paymentForm.note}
                 onChange={(e) => setPaymentForm({...paymentForm, note: e.target.value})}
              />
           </div>
           <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-bold">
                 {isSubmitting ? t("Recording...") : t("Post to Ledger")}
              </Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
