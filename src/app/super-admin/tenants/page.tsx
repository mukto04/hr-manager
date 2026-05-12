"use client";

import { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  Building2, 
  Database, 
  Plus, 
  Power, 
  PowerOff, 
  Search, 
  Loader2, 
  Trash2,
  RefreshCcw,
  ShieldX,
  History,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  X,
  Clock,
  CalendarDays,
  Coins,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  Zap,
  Layout,
  ExternalLink 
} from "lucide-react";
import { useToastStore } from "@/lib/store/use-toast-store";
import { Save } from "lucide-react";

interface Tenant {
  id: string;
  slug: string;
  companyName: string;
  dbUrl: string;
  status: string;
  planName?: string;
  permissions?: any;
  employeeLimit?: number;
  adminUsername: string;
  adminPassword?: string;
  subscriptionEnd?: string;
  createdAt: string;
}

export default function TenantManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dbTestStatus, setDbTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [dbTestMessage, setDbTestMessage] = useState("");
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const { showToast } = useToastStore();

  const [formData, setFormData] = useState({
    slug: "",
    companyName: "",
    dbUrl: "",
    planName: "Starter",
    adminUsername: "admin",
    adminPassword: "",
    subscriptionDays: "30",
    employeeLimit: 50
  });

  const getDaysLeft = (endDate?: string) => {
    if (!endDate) return 0;
    const diff = new Date(endDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const res = await fetch("/api/super-admin/companies");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTenants(data);
      } else {
        console.error("Received non-array tenants data:", data);
        setTenants([]);
      }
    } catch (e) {
      console.error("Fetch tenants failed");
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(tenant: Tenant, newStatus: string) {
    const actionText = newStatus === "DELETED" ? "move to trash" : newStatus === "ACTIVE" ? "restore" : "change status";
    if (!confirm(`Are you sure you want to ${actionText} ${tenant.companyName}?`)) return;

    try {
      const res = await fetch("/api/super-admin/companies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tenant.id, status: newStatus }),
      });
      if (res.ok) {
        showToast(`${tenant.companyName} status updated to ${newStatus.toLowerCase()}`, "success");
        fetchTenants();
      } else {
        showToast(`Failed to update status for ${tenant.companyName}`, "error");
      }
    } catch (e) {
      showToast("Error connecting to server", "error");
    }
  }

  async function toggleFreeze(tenant: Tenant) {
    const newStatus = tenant.status === "ACTIVE" ? "FROZEN" : "ACTIVE";
    updateStatus(tenant, newStatus);
  }

  async function hardDelete(tenant: Tenant) {
    if (!confirm(`WARNING: This will PERMANENTLY delete ${tenant.companyName}. This action cannot be undone. Proceed?`)) return;

    try {
      const res = await fetch(`/api/super-admin/companies?id=${tenant.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast(`${tenant.companyName} permanently deleted`, "success");
        fetchTenants();
      } else {
        showToast("Permanent delete failed", "error");
      }
    } catch (e) {
      showToast("Error deleting tenant", "error");
    }
  }

  async function testDbConnection() {
    if (!formData.dbUrl) {
      setDbTestMessage("Please enter a connection string first.");
      setDbTestStatus("error");
      return;
    }
    setDbTestStatus("testing");
    setDbTestMessage("");
    try {
      const res = await fetch("/api/super-admin/test-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbUrl: formData.dbUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setDbTestStatus("success");
        setDbTestMessage(data.message || "Connection successful!");
        showToast("Database connection successful!", "success");
      } else {
        setDbTestStatus("error");
        setDbTestMessage(data.message || "Connection failed.");
        showToast(data.message || "Database connection failed", "error");
      }
    } catch (e) {
      setDbTestStatus("error");
      setDbTestMessage("Network error. Could not test connection.");
      showToast("Network error during DB test", "error");
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = "/api/super-admin/companies";
      const method = editingTenant ? "PUT" : "POST";
      const body = editingTenant ? { id: editingTenant.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }

      setShowModal(false);
      setEditingTenant(null);
      setDbTestStatus("idle");
      setDbTestMessage("");
      setFormData({ 
        slug: "", 
        companyName: "", 
        dbUrl: "", 
        planName: "Starter",
        adminUsername: "admin", 
        adminPassword: "",
        subscriptionDays: "30",
        employeeLimit: 50
      });
      showToast(editingTenant ? "Instance updated successfully!" : "New instance deployed successfully!", "success");
      fetchTenants();
    } catch (e: any) {
      showToast(e.message || "Operation failed. Something went wrong.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditModal(tenant: Tenant) {
    setEditingTenant(tenant);
    setFormData({
      slug: tenant.slug,
      companyName: tenant.companyName,
      dbUrl: tenant.dbUrl,
      adminUsername: tenant.adminUsername,
      adminPassword: tenant.adminPassword || "",
      planName: tenant.planName || "Starter",
      subscriptionDays: "0",
      employeeLimit: tenant.employeeLimit || 50
    });
    setShowModal(true);
  }

  const activeTenants = Array.isArray(tenants) ? tenants.filter(t => t.status !== "DELETED") : [];
  const deletedTenants = Array.isArray(tenants) ? tenants.filter(t => t.status === "DELETED") : [];

  const displayTenants = (activeTab === "ACTIVE" ? activeTenants : deletedTenants).filter(t => 
    t.companyName.toLowerCase().includes(search.toLowerCase()) || 
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-20 w-full animate-fade-in">
      {/* Header */}
      <div className="relative group overflow-hidden bg-slate-900 shadow-xl p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <Building2 className="w-24 h-24 text-red-500 -rotate-12 translate-x-4 -translate-y-4" />
        </div>
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-2.5 rounded-2xl shadow-lg ring-4 ring-red-600/10 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Tenant Management</h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                 <Zap className="w-3 h-3 text-yellow-500" />
                 Managing {activeTenants.length} live instances
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search identity..." 
                  className="w-full md:w-64 bg-black/40 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:ring-1 focus:ring-red-600 outline-none transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             <button 
               onClick={() => {
                 setEditingTenant(null);
                 setFormData({ slug: "", companyName: "", dbUrl: "", planName: "Starter", adminUsername: "admin", adminPassword: "", subscriptionDays: "30", employeeLimit: 50 });
                 setShowModal(true);
               }}
               className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center shrink-0"
             >
               <Plus className="w-5 h-5" />
             </button>
          </div>
        </div>

        <div className="mt-6 flex justify-start">
             <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
               <button 
                onClick={() => setActiveTab("ACTIVE")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${activeTab === "ACTIVE" ? "bg-slate-700 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
               >
                 Active
               </button>
               <button 
                onClick={() => setActiveTab("HISTORY")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${activeTab === "HISTORY" ? "bg-slate-700 text-red-500 shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
               >
                 Trash
               </button>
             </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-slate-800/50">
                <th className="px-8 py-5">Instance Identity</th>
                <th className="px-6 py-5">Status Protocol</th>
                <th className="px-6 py-5 text-center">Plan Tier</th>
                <th className="px-6 py-5 text-center">Service Validity</th>
                <th className="px-8 py-5 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                 <tr>
                    <td colSpan={5} className="py-32 text-center">
                       <Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500/20" />
                    </td>
                 </tr>
              ) : displayTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                       <Database className="w-12 h-12" />
                       <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No records found</p>
                    </div>
                  </td>
                </tr>
              ) : displayTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-700/50 font-black text-slate-300 shadow-inner group-hover:border-red-500/30 transition-colors">
                        {tenant.slug.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-red-500 transition-colors">{tenant.companyName}</div>
                        <div className="text-[10px] text-slate-500 font-medium tracking-wide">/{tenant.slug}-hr</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {(() => {
                      const daysLeft = getDaysLeft(tenant.subscriptionEnd);
                      const isExpired = daysLeft <= 0;
                      
                      if (isExpired) return (
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-red-500/5 text-red-500 border border-red-500/10">
                          <span className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> Expired
                        </span>
                      );
                      
                      if (tenant.status === "ACTIVE") return (
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/5 text-emerald-500 border border-emerald-500/10">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span> Active
                        </span>
                      );

                      return (
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/5 text-amber-500 border border-amber-500/10">
                          Frozen
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      tenant.planName === 'Enterprise' ? 'bg-purple-500/5 text-purple-400 border-purple-500/10' :
                      tenant.planName === 'Growth' ? 'bg-blue-500/5 text-blue-400 border-blue-500/10' :
                      'bg-slate-800/30 text-slate-500 border-slate-800'
                    }`}>
                      {tenant.planName || 'Starter'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    {(() => {
                      const daysLeft = getDaysLeft(tenant.subscriptionEnd);
                      return (
                        <div className="space-y-0.5">
                          <div className={`text-xs font-bold ${daysLeft > 7 ? 'text-slate-300' : daysLeft > 0 ? 'text-amber-500' : 'text-red-500/50'}`}>
                            {daysLeft > 0 ? `${daysLeft} Days` : "Terminated"}
                          </div>
                          <div className="text-[9px] text-slate-600 font-medium">
                            {tenant.subscriptionEnd ? new Date(tenant.subscriptionEnd).toLocaleDateString() : "Lifetime"}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                       {activeTab === "ACTIVE" ? (
                         <>
                           <button 
                            onClick={() => {
                               setEditingTenant(tenant);
                               setShowServicesModal(true);
                            }}
                            className="p-2 transition-all bg-slate-800 hover:bg-orange-500/10 text-slate-400 hover:text-orange-500 rounded-xl border border-transparent hover:border-orange-500/20"
                           >
                            <Edit2 className="w-3.5 h-3.5" />
                           </button>
                           <button 
                            onClick={() => openEditModal(tenant)}
                            className="p-2 transition-all bg-slate-800 hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 rounded-xl border border-transparent hover:border-blue-500/20"
                           >
                            <Database className="w-3.5 h-3.5" />
                           </button>
                           <button 
                            onClick={() => toggleFreeze(tenant)}
                            className={`p-2 rounded-xl transition-all border border-transparent ${
                              tenant.status === "ACTIVE" 
                              ? "bg-slate-800 hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 hover:border-amber-500/20" 
                              : "bg-amber-600/20 text-amber-500 border-amber-600/20"
                            }`}
                           >
                            {tenant.status === "ACTIVE" ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                           </button>
                           <button 
                            onClick={() => updateStatus(tenant, "DELETED")}
                            className="p-2 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl border border-transparent hover:border-red-500/20 transition-all"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         </>
                       ) : (
                         <>
                           <button 
                            onClick={() => updateStatus(tenant, "ACTIVE")}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-bold transition-all border border-emerald-500/20"
                           >
                             <RefreshCcw className="w-3 h-3" /> Restore Instance
                           </button>
                           <button 
                            onClick={() => hardDelete(tenant)}
                            className="p-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all border border-red-500/20"
                           >
                             <ShieldX className="w-3.5 h-3.5" />
                           </button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-800/30">
            {loading ? (
               <div className="py-20 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500/20" />
               </div>
            ) : displayTenants.length === 0 ? (
               <div className="py-20 text-center opacity-20">
                  <Database className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-xs font-bold uppercase tracking-widest">No records found</p>
               </div>
            ) : displayTenants.map((tenant) => (
               <div key={tenant.id} className="p-6 space-y-4 bg-black/20">
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 font-black text-slate-300">
                           {tenant.slug.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                           <div className="text-sm font-bold text-white">{tenant.companyName}</div>
                           <div className="text-[10px] text-slate-500">/{tenant.slug}-hr</div>
                        </div>
                     </div>
                     <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                        tenant.planName === 'Enterprise' ? 'bg-purple-500/5 text-purple-400 border-purple-500/10' :
                        tenant.planName === 'Growth' ? 'bg-blue-500/5 text-blue-400 border-blue-500/10' :
                        'bg-slate-800/30 text-slate-500 border-slate-800'
                     }`}>
                        {tenant.planName || 'Starter'}
                     </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-y border-slate-800/30">
                     <div className="space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase">Service Integrity</div>
                        {(() => {
                           const daysLeft = getDaysLeft(tenant.subscriptionEnd);
                           if (daysLeft <= 0) return <div className="text-[10px] font-bold text-red-500">EXPIRED</div>;
                           return <div className="text-[10px] font-bold text-emerald-500">OPERATIONAL</div>;
                        })()}
                     </div>
                     <div className="text-right space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase">Time Remaining</div>
                        <div className="text-[10px] font-bold text-white">{getDaysLeft(tenant.subscriptionEnd)} Days</div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                     <div className="flex gap-2">
                        <button onClick={() => { setEditingTenant(tenant); setShowServicesModal(true); }} className="p-2.5 bg-slate-800 text-slate-400 rounded-xl border border-slate-700"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => openEditModal(tenant)} className="p-2.5 bg-slate-800 text-slate-400 rounded-xl border border-slate-700"><Database className="w-4 h-4" /></button>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => toggleFreeze(tenant)} className="p-2.5 bg-slate-800 text-amber-500 rounded-xl border border-slate-700"><Power className="w-4 h-4" /></button>
                        <button onClick={() => updateStatus(tenant, "DELETED")} className="p-2.5 bg-red-900/20 text-red-500 rounded-xl border border-red-900/20"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  </div>
               </div>
            ))}
         </div>
       </div>

      {/* Manual Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setDbTestStatus("idle"); setDbTestMessage(""); } }}>
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden" style={{maxHeight: 'calc(100vh - 4rem)'}}>
            {/* Header */}
            <div className="bg-slate-800/50 px-8 py-5 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-red-600 rounded-xl">
                   <Building2 className="w-5 h-5 text-white" />
                 </div>
                 <h3 className="text-lg font-bold text-white tracking-tight">
                   {editingTenant ? "Instance Configuration" : "New Tenant Protocol"}
                 </h3>
               </div>
               <button onClick={() => { setShowModal(false); setDbTestStatus("idle"); setDbTestMessage(""); }} className="text-slate-400 hover:text-white transition-colors p-1">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            {/* Body */}
            <div className="overflow-y-auto flex-1 p-8 custom-scrollbar">
              <form id="tenant-form" onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Company Name</label>
                    <input 
                      required 
                      placeholder="e.g. Acme Corporation"
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-red-600 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Portal Address (URL)</label>
                    <div className="flex items-center bg-black/40 border border-slate-800 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-red-600 transition-all">
                      <span className="pl-4 text-slate-700 font-mono text-xs select-none">/</span>
                      <input 
                        required 
                        placeholder="handle"
                        value={formData.slug}
                        onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().trim().replace(/\s+/g, "-")})}
                        className="w-full bg-transparent px-1 py-3 text-sm text-white outline-none font-mono" />
                      <span className="pr-4 py-3 text-red-600/50 font-black font-mono text-xs select-none border-l border-slate-800 bg-slate-900/50 px-2 whitespace-nowrap">
                        -hr
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Database Connection String</label>
                  <div className="flex gap-2">
                    <input 
                      required 
                      placeholder="mongodb+srv://..."
                      value={formData.dbUrl}
                      onChange={(e) => { setFormData({...formData, dbUrl: e.target.value}); setDbTestStatus("idle"); setDbTestMessage(""); }}
                      className="flex-1 bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-red-600 transition-all font-mono text-xs" />
                    <button
                      type="button"
                      onClick={testDbConnection}
                      disabled={dbTestStatus === "testing" || !formData.dbUrl}
                      className="flex-shrink-0 flex items-center gap-2 px-4 rounded-xl bg-slate-800 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white disabled:opacity-50 transition-all"
                    >
                      {dbTestStatus === "testing" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                      Test
                    </button>
                  </div>
                  {dbTestStatus !== "idle" && dbTestMessage && (
                    <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold ${
                      dbTestStatus === "success" ? "bg-emerald-500/5 text-emerald-500 border border-emerald-500/10" : "bg-red-500/5 text-red-500 border border-red-500/10"
                    }`}>
                      {dbTestMessage}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Subscription Plan</label>
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setShowPlanDropdown(!showPlanDropdown)}
                        className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white flex items-center justify-between focus:ring-1 focus:ring-red-600 outline-none transition-all font-bold group"
                      >
                        <span className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${
                              formData.planName === 'Enterprise' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]' :
                              formData.planName === 'Growth' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                              'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.5)]'
                           }`} />
                           {formData.planName}
                        </span>
                        <Zap className={`w-3.5 h-3.5 transition-transform duration-300 ${showPlanDropdown ? 'rotate-180 text-red-500' : 'text-slate-600 group-hover:text-slate-400'}`} />
                      </button>

                      {showPlanDropdown && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowPlanDropdown(false)} />
                          <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2 duration-200 backdrop-blur-xl">
                            {[
                              { name: 'Starter', desc: 'Basic infrastructure', color: 'bg-slate-400' },
                              { name: 'Growth', desc: 'Advanced analytics', color: 'bg-blue-500' },
                              { name: 'Enterprise', desc: 'Dedicated resources', color: 'bg-purple-500' }
                            ].map((plan) => (
                              <button
                                key={plan.name}
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, planName: plan.name});
                                  setShowPlanDropdown(false);
                                }}
                                className="w-full px-4 py-3.5 text-left hover:bg-white/[0.03] flex items-center justify-between transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                   <div className={`w-1.5 h-1.5 rounded-full ${plan.color}`} />
                                   <div>
                                      <div className={`text-xs font-bold ${formData.planName === plan.name ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                         {plan.name}
                                      </div>
                                      <div className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">
                                         {plan.desc}
                                      </div>
                                   </div>
                                </div>
                                {formData.planName === plan.name && (
                                   <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Seat Limit (Employees)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 50"
                      value={formData.employeeLimit}
                      onChange={(e) => setFormData({...formData, employeeLimit: parseInt(e.target.value) || 0})}
                      className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-red-600 outline-none transition-all" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Subscription Validity (Days)</label>
                  <div className="flex items-center bg-black/40 border border-slate-800 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-red-600 transition-all">
                    <input 
                      type="number"
                      required 
                      placeholder="30"
                      value={formData.subscriptionDays}
                      onChange={(e) => setFormData({...formData, subscriptionDays: e.target.value})}
                      className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none" />
                    <span className="pr-4 py-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest border-l border-slate-800 bg-slate-900/50 px-3 whitespace-nowrap">
                      Days
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-800/50">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Admin Username</label>
                    <input 
                      required 
                      value={formData.adminUsername}
                      onChange={(e) => setFormData({...formData, adminUsername: e.target.value})}
                      className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-red-600 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Admin Password</label>
                    <div className="relative">
                      <input 
                        required 
                        type={showPassword ? "text" : "password"}
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                        className="w-full bg-black/40 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-red-600 transition-all font-mono" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-800 flex items-center justify-end gap-4 bg-slate-900/50 flex-shrink-0">
               <button 
                type="button"
                onClick={() => { setShowModal(false); setDbTestStatus("idle"); setDbTestMessage(""); }}
                className="text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Discard</button>
               <button 
                type="submit"
                form="tenant-form"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-red-600/10 flex items-center gap-2">
                 {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingTenant ? "Save Instance" : "Deploy Protocol")}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Services Modal - Redesigned Premium */}
      {showServicesModal && editingTenant && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={(e) => { if (e.target === e.currentTarget) setShowServicesModal(false); }}>
           <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh]">
              {/* Header */}
              <div className="relative p-8 pb-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center border border-orange-600/20 shadow-lg">
                          <ShieldCheck className="w-6 h-6 text-orange-500" />
                       </div>
                       <div>
                          <h3 className="text-xl font-bold text-white tracking-tight">Access Matrix</h3>
                          <p className="text-[10px] uppercase tracking-widest font-black text-slate-600 mt-0.5">{editingTenant.slug}</p>
                       </div>
                    </div>
                    <button onClick={() => setShowServicesModal(false)} className="text-slate-500 hover:text-white transition-colors">
                       <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-8 py-4 space-y-3 custom-scrollbar">
                 {[
                   { id: 'main_menu', label: 'Main Menu', desc: 'Dashboard & Core', icon: Layout },
                   { id: 'attendance', label: 'Attendance Management', desc: 'Sync & Reports', icon: Clock },
                   { id: 'leaves', label: 'Leaves & Holidays', desc: 'Flows & Balance', icon: CalendarDays },
                   { id: 'finance', label: 'Finance & Payroll', desc: 'Structures & Slips', icon: Coins },
                   { id: 'office_admin', label: 'Office Administration', desc: 'Expenses & Sheets', icon: Receipt },
                 ].map((service) => {
                    const isEnabled = editingTenant.permissions?.[service.id] !== false;
                    return (
                      <div key={service.id} className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-all">
                         <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-lg border transition-colors ${isEnabled ? 'bg-orange-600/10 border-orange-600/20 text-orange-500' : 'bg-slate-800 text-slate-600 border-slate-700'}`}>
                               <service.icon className="w-4 h-4" />
                            </div>
                            <div>
                               <div className="text-xs font-bold text-white tracking-wide">{service.label}</div>
                               <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{service.desc}</div>
                            </div>
                         </div>
                         <button 
                           onClick={async () => {
                              const defaultPerms = { main_menu: true, attendance: true, leaves: true, finance: true, office_admin: true };
                              const currentPerms = (editingTenant.permissions && typeof editingTenant.permissions === 'object') ? editingTenant.permissions : defaultPerms;
                              const newPermissions = { ...defaultPerms, ...currentPerms, [service.id]: !isEnabled };
                              try {
                                const res = await fetch("/api/super-admin/companies", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: editingTenant.id, permissions: newPermissions }),
                                });
                                if (res.ok) {
                                  setEditingTenant({ ...editingTenant, permissions: newPermissions });
                                  fetchTenants();
                                }
                              } catch (e) { alert("Update failed"); }
                           }}
                           className={`h-6 w-11 rounded-full transition-all flex items-center px-0.5 ${isEnabled ? 'bg-orange-600' : 'bg-slate-800'}`}
                         >
                            <div className={`h-5 w-5 rounded-full bg-white shadow-md transition-all ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                         </button>
                      </div>
                    );
                 })}
              </div>

              {/* Quota */}
              <div className="p-8 space-y-4">
                  <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Seat Quota</div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Instance Employee Limit</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        id="employee-limit-input"
                        defaultValue={editingTenant.employeeLimit || 50}
                        className="w-12 bg-black/40 border border-slate-800 rounded-xl p-2 text-center text-white font-bold text-xs"
                      />
                      <button
                        onClick={async () => {
                          const input = document.getElementById('employee-limit-input') as HTMLInputElement;
                          const newLimit = parseInt(input.value) || 0;
                          try {
                            const res = await fetch("/api/super-admin/companies", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: editingTenant.id, employeeLimit: newLimit }),
                            });
                            if (res.ok) {
                              setEditingTenant({ ...editingTenant, employeeLimit: newLimit });
                              fetchTenants();
                            }
                          } catch (e) { alert("Failed to update limit"); }
                        }}
                        className="p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-500 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </div>
                 </div>
                 <p className="text-[8px] text-slate-700 text-center font-bold uppercase tracking-widest">
                    Synchronizing live permissions with node instances
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
