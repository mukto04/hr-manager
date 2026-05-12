"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ClipboardList, 
  Users, 
  Calendar, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Plus,
  History,
  ChevronDown,
  Code,
  TestTube2,
  Bug,
  Briefcase,
  Layers,
  Trophy,
  CheckCircle,
  Search,
  Edit3,
  LayoutGrid,
  FileCode,
  ArrowUpRight
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/utils/classnames";

const STATUS_OPTIONS = [
  { id: "PLANNED", label: "PLANNED", icon: Calendar, color: "text-slate-400", bg: "bg-slate-50" },
  { id: "RUNNING", label: "RUNNING", icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "ON_HOLD", label: "ON HOLD", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50" },
  { id: "IN_TESTING", label: "IN TESTING", icon: FileCode, color: "text-purple-500", bg: "bg-purple-50" },
  { id: "ISSUE_FIXING", label: "ISSUE FIXING", icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-50" },
  { id: "DONE", label: "DONE", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
];

const WORK_LOG_PHASES = [
  { id: "RUNNING_WORK", label: "RUNNING WORK", icon: Code, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  { id: "IN_TESTING", label: "IN TESTING", icon: TestTube2, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
  { id: "ISSUE_FIXING", label: "ISSUE FIXING", icon: Bug, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
];

export default function EmployeeProjectsPage() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const { t } = useTranslation();

  // Log Submission State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhaseDropdownOpen, setIsPhaseDropdownOpen] = useState(false);
  const phaseRef = useRef<HTMLDivElement>(null);

  // Status Update State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // PM Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [personnelSearch, setPersonnelSearch] = useState("");
  const membersRef = useRef<HTMLDivElement>(null);

  // Work Log History State
  const [isLogHistoryOpen, setIsLogHistoryOpen] = useState(false);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [logForm, setLogForm] = useState({
    phase: "RUNNING_WORK",
    hours: "0",
    minutes: "0",
    date: format(new Date(), "yyyy-MM-dd"),
    note: ""
  });

  const [editForm, setEditForm] = useState({
    startDate: "",
    endDate: "",
    memberIds: [] as string[]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isPhaseDropdownOpen && phaseRef.current && !phaseRef.current.contains(event.target as Node)) {
        setIsPhaseDropdownOpen(false);
      }
      if (activeDropdown === 'members' && membersRef.current && !membersRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPhaseDropdownOpen, activeDropdown]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [meRes, projRes, empRes] = await Promise.all([
        fetch("/api/employee/me"),
        fetch("/api/employee/projects"),
        fetch("/api/employees?all=true")
      ]);

      if (meRes.ok) setMe(await meRes.json());
      if (projRes.ok) setMemberships(await projRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkLogs = async (projectId: string) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/work-logs`);
      if (res.ok) {
        const data = await res.json();
        setWorkLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleOpenLogModal = (project: any) => {
    setSelectedProject(project);
    setLogForm({
      phase: "RUNNING_WORK",
      hours: "0",
      minutes: "0",
      date: format(new Date(), "yyyy-MM-dd"),
      note: ""
    });
    setIsLogModalOpen(true);
  };

  const handleOpenLogHistory = (project: any) => {
    setSelectedProject(project);
    fetchWorkLogs(project.id);
    setIsLogHistoryOpen(true);
  };

  const handleOpenStatusModal = (project: any) => {
    setSelectedProject(project);
    setIsStatusModalOpen(true);
  };

  const handleOpenEditModal = (project: any) => {
    setSelectedProject(project);
    setEditForm({
      startDate: project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      endDate: project.endDate ? format(new Date(project.endDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      memberIds: project.members?.map((m: any) => m.employeeId) || []
    });
    setIsEditModalOpen(true);
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const totalHours = parseFloat(logForm.hours) + (parseFloat(logForm.minutes) / 60);
      const res = await fetch(`/api/projects/${selectedProject.id}/work-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...logForm,
          hours: totalHours,
          employeeId: me.id
        })
      });

      if (res.ok) {
        setIsLogModalOpen(false);
        toast.success(t("Work log submitted successfully!"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedProject,
          status
        })
      });

      if (res.ok) {
        setIsStatusModalOpen(false);
        fetchInitialData();
        toast.success(t("Project status updated!"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selectedProject,
          ...editForm
        })
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchInitialData();
        toast.success(t("Project updated successfully!"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (id: string) => {
    setEditForm(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(id) 
        ? prev.memberIds.filter(m => m !== id)
        : [...prev.memberIds, id]
    }));
  };

  const filteredProjects = memberships.filter(m => {
    const p = m.project;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "ALL" || 
                         (selectedStatus === "ASSIGNED" ? true : p.status === selectedStatus);
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { id: "ALL", label: "ALL PROJECTS", count: memberships.length, icon: LayoutGrid, color: "text-indigo-600", bg: "bg-indigo-50" },
    { id: "ASSIGNED", label: "ASSIGNED", count: memberships.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    ...STATUS_OPTIONS.map(s => ({
       id: s.id,
       label: s.label,
       count: memberships.filter(m => m.project.status === s.id).length,
       icon: s.icon,
       color: s.color,
       bg: s.bg
    }))
  ];

  const getPhaseHours = (phase: string) => {
    return workLogs.filter(log => log.phase === phase).reduce((acc, log) => acc + log.hours, 0);
  };

  if (loading) return (
    <div className="space-y-8 animate-pulse p-8">
       <div className="h-40 bg-slate-100 rounded-3xl" />
       <div className="h-96 bg-slate-50 rounded-3xl" />
    </div>
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700 bg-white min-h-screen p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t("My Projects")}</h1>
          <p className="text-slate-500 font-medium text-xs">{t("Manage and update your assigned software projects.")}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
         {stats.map((stat, i) => (
           <div 
             key={i}
             onClick={() => setSelectedStatus(stat.id)}
             className={cn(
               "w-[140px] shrink-0 bg-white p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-3 group cursor-pointer",
               selectedStatus === stat.id ? "border-indigo-600 ring-2 ring-indigo-50" : "border-slate-100 hover:border-indigo-200"
             )}
           >
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-300",
                stat.bg + " " + stat.color,
                selectedStatus === stat.id ? "scale-110 shadow-sm" : "opacity-80 group-hover:opacity-100"
              )}>
                 <stat.icon size={18} />
              </div>
              <div className="text-center space-y-0.5">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t(stat.label)}</p>
                 <p className="text-xl font-black text-slate-900">{stat.count}</p>
              </div>
           </div>
         ))}
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder={t("Search projects...")}
            className="w-full pl-11 pr-4 py-2 rounded-lg bg-slate-50/50 border-transparent focus:bg-white focus:ring-1 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all text-[13px] font-semibold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-320px)] min-h-[400px]">
         <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse table-fixed">
               <thead className="bg-[#F8FAFC]/90 border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md">
                  <tr>
                     <th className="py-4 px-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[80px]">{t("SL")}</th>
                     <th className="py-4 px-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[250px]">{t("PROJECT DETAILS")}</th>
                     <th className="py-4 px-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[120px]">{t("TYPE")}</th>
                     <th className="py-4 px-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[150px]">{t("DEADLINE")}</th>
                     <th className="py-4 px-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[120px]">{t("STATUS")}</th>
                     <th className="py-4 px-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-right w-[350px]">{t("ACTIONS")}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {filteredProjects.length > 0 ? filteredProjects.map((m, index) => {
                    const p = m.project;
                    const isPM = p.projectManagerId === me?.id;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-all group">
                         <td className="py-5 px-6">
                            <span className="text-[11px] font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                         </td>
                         <td className="py-5 px-6">
                            <div className="block">
                               <p className="font-bold text-slate-900 text-[13px] tracking-tight group-hover:text-indigo-600 transition-colors">{p.name}</p>
                               <p className="text-[10px] font-medium text-slate-400 truncate max-w-[200px]">{p.description || t("No description provided")}</p>
                            </div>
                         </td>
                         <td className="py-5 px-6">
                            <span className="inline-flex px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-widest border border-slate-200">
                               {p.type}
                            </span>
                         </td>
                         <td className="py-5 px-6">
                            <div className="flex items-center gap-1.5 text-slate-400">
                               <Calendar size={12} />
                               <span className="text-[10px] font-bold tracking-tight text-slate-600">
                                  {p.endDate ? format(new Date(p.endDate), "dd MMM, yyyy") : t("TBD")}
                               </span>
                            </div>
                         </td>
                         <td className="py-5 px-6">
                            <div className={cn(
                               "inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                               p.status === "RUNNING" ? "bg-blue-50 text-blue-600 border-blue-100" :
                               p.status === "IN_TESTING" ? "bg-purple-50 text-purple-600 border-purple-100" :
                               p.status === "ISSUE_FIXING" ? "bg-rose-50 text-rose-600 border-rose-100" :
                               p.status === "DONE" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                               p.status === "ON_HOLD" ? "bg-amber-50 text-amber-600 border-amber-100" :
                               "bg-slate-50 text-slate-500 border-slate-100"
                            )}>
                               {t(p.status)}
                            </div>
                         </td>
                         <td className="py-5 px-6 text-right">
                            <div className="flex items-center justify-end gap-3">
                               <button 
                                 onClick={() => handleOpenLogHistory(p)}
                                 className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                 title={t("History")}
                               >
                                  <Clock size={16} />
                               </button>
                               
                               <button 
                                 onClick={() => handleOpenLogModal(p)}
                                 className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                               >
                                  <Clock size={12} />
                                  {t("Log Hours")}
                               </button>

                               <button 
                                 onClick={() => handleOpenStatusModal(p)}
                                 className="h-8 px-4 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all"
                               >
                                  {t("Update Status")}
                               </button>

                               {isPM && (
                                 <button 
                                   onClick={() => handleOpenEditModal(p)}
                                   className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                   title={t("Manage Project")}
                                 >
                                    <Edit3 size={16} />
                                 </button>
                               )}
                            </div>
                         </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                       <td colSpan={6} className="py-20 text-center">
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t("No Projects Found")}</p>
                       </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Log Submission Modal */}
      <Modal
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={t("Submit Work Log")}
        description={t("Log your work hours for: {name}", { name: selectedProject?.name })}
        size="lg"
      >
        <div className="space-y-6">
           <div className="space-y-2" ref={phaseRef}>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("WORK PHASE")}</label>
              <div className="relative">
                 <button
                   type="button"
                   onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsPhaseDropdownOpen(!isPhaseDropdownOpen); }}
                   className={cn(
                     "w-full h-12 rounded-2xl bg-slate-50 border border-slate-200 text-left px-4 text-sm font-semibold flex items-center justify-between group transition-all",
                     isPhaseDropdownOpen ? "bg-white ring-1 ring-indigo-600/20 border-indigo-600" : "hover:bg-slate-100/50"
                   )}
                 >
                   <div className="flex items-center gap-3">
                      {WORK_LOG_PHASES.find(p => p.id === logForm.phase)?.icon && (
                        <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center bg-white", WORK_LOG_PHASES.find(p => p.id === logForm.phase)?.color)}>
                           {/* @ts-ignore */}
                           {(() => { const Icon = WORK_LOG_PHASES.find(p => p.id === logForm.phase)?.icon; return Icon && <Icon size={14} /> })()}
                        </div>
                      )}
                      <span className="text-slate-900">{WORK_LOG_PHASES.find(p => p.id === logForm.phase)?.label}</span>
                   </div>
                   <ChevronDown size={18} className={cn("text-slate-400 transition-transform duration-200", isPhaseDropdownOpen && "rotate-180")} />
                 </button>
                 
                 {isPhaseDropdownOpen && (
                   <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                     {WORK_LOG_PHASES.map(phase => (
                       <button 
                         key={phase.id}
                         type="button"
                         onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLogForm({...logForm, phase: phase.id}); setIsPhaseDropdownOpen(false); }}
                         className={cn(
                           "w-full px-4 py-3 text-xs font-bold cursor-pointer transition-colors flex items-center gap-3 border-none bg-transparent text-left",
                           logForm.phase === phase.id ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                         )}
                       >
                         <phase.icon size={16} />
                         {phase.label}
                       </button>
                     ))}
                   </div>
                 )}
              </div>
           </div>

           <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("HOURS")}</label>
                 <Input 
                   type="number"
                   min="0"
                   className="h-12 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:bg-white transition-all shadow-none"
                   value={logForm.hours}
                   onChange={(e) => setLogForm({...logForm, hours: e.target.value})}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("MINUTES")}</label>
                 <Input 
                   type="number"
                   min="0"
                   max="59"
                   className="h-12 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:bg-white transition-all shadow-none"
                   value={logForm.minutes}
                   onChange={(e) => setLogForm({...logForm, minutes: e.target.value})}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("DATE")}</label>
                 <Input 
                   type="date"
                   className="h-12 rounded-2xl bg-slate-50 border border-slate-200 px-4 font-bold text-slate-900 focus:bg-white shadow-none"
                   value={logForm.date}
                   onChange={(e) => setLogForm({...logForm, date: e.target.value})}
                 />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("NOTES (OPTIONAL)")}</label>
              <textarea 
                className="w-full min-h-[100px] p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold placeholder:text-slate-300 focus:bg-white transition-all resize-none shadow-none outline-none"
                placeholder={t("Briefly describe what you worked on...")}
                value={logForm.note}
                onChange={(e) => setLogForm({...logForm, note: e.target.value})}
              />
           </div>

           <div className="flex gap-4 pt-4 border-t border-slate-50">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsLogModalOpen(false)}
                className="flex-1 h-14 rounded-[20px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100"
              >
                {t("Cancel")}
              </Button>
              <Button 
                type="button"
                onClick={handleLogSubmit}
                disabled={isSubmitting}
                className="flex-[1.5] h-14 rounded-[20px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xl shadow-indigo-100"
              >
                {isSubmitting ? t("Submitting...") : t("Submit Log")}
              </Button>
           </div>
        </div>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        open={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={t("Update Status")}
        description={t("Current status for {name}: {status}", { name: selectedProject?.name, status: selectedProject?.status })}
        size="md"
      >
        <div className="grid grid-cols-3 gap-3">
           {STATUS_OPTIONS.map(s => (
             <button
               key={s.id}
               type="button"
               onClick={(e) => { e.preventDefault(); handleStatusUpdate(s.id); }}
               className={cn(
                 "p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
                 selectedProject?.status === s.id ? "bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.02]" : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md"
               )}
             >
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                  selectedProject?.status === s.id ? "bg-white/20 text-white" : "bg-slate-50 group-hover:bg-indigo-50 " + s.color
                )}>
                   <s.icon size={18} />
                </div>
                <span className="text-[10px] font-black tracking-tight text-center">{t(s.label)}</span>
             </button>
           ))}
        </div>
      </Modal>

      {/* Log History Modal */}
      <Modal
        open={isLogHistoryOpen}
        onClose={() => setIsLogHistoryOpen(false)}
        title={t("Work Log History")}
        description={t("Detailed work history for: {name}", { name: selectedProject?.name })}
        size="2xl"
      >
         <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
               {WORK_LOG_PHASES.map(phase => (
                 <div key={phase.id} className={cn("p-4 rounded-2xl border flex flex-col items-center gap-2", phase.bg, phase.border)}>
                    <phase.icon size={16} className={phase.color} />
                    <div className="text-center">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{t(phase.label)}</p>
                       <p className={cn("text-sm font-black", phase.color)}>{getPhaseHours(phase.id).toFixed(1)}h</p>
                    </div>
                 </div>
               ))}
               <div className="p-4 rounded-2xl border bg-amber-50 border-amber-100 flex flex-col items-center gap-2">
                  <Trophy size={16} className="text-amber-600" />
                  <div className="text-center">
                     <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{t("TOTAL HOURS")}</p>
                     <p className="text-sm font-black text-amber-600">
                        {workLogs.reduce((acc, log) => acc + log.hours, 0).toFixed(1)}h
                     </p>
                  </div>
               </div>
            </div>
           <div className="bg-slate-50/50 rounded-2xl border border-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
              {logsLoading ? (
                 <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
              ) : workLogs.length > 0 ? (
                 <div className="divide-y divide-slate-100">
                    {workLogs.map(log => {
                       const phase = WORK_LOG_PHASES.find(p => p.id === log.phase);
                       return (
                         <div key={log.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-white shadow-sm", phase?.color)}>
                                  {/* @ts-ignore */}
                                  {(() => { const Icon = phase?.icon; return Icon && <Icon size={14} /> })()}
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-slate-900">{log.employee?.name}</p>
                                  <p className="text-[9px] text-slate-400">{format(new Date(log.date), "dd MMM, yyyy")}</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-xs font-black text-slate-900">{log.hours}h</p>
                               <p className="text-[9px] text-slate-400 italic">{log.note || t("No notes")}</p>
                            </div>
                         </div>
                       );
                    })}
                 </div>
              ) : <div className="p-10 text-center text-slate-400 text-xs italic">{t("No history found.")}</div>}
           </div>
        </div>
      </Modal>

      {/* PM Management Modal */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t("Manage Project")}
        description={t("Update timeline and team assignments for: {name}", { name: selectedProject?.name })}
        size="xl"
      >
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("START DATE")}</label>
                 <Input 
                   type="date"
                   className="h-12 rounded-2xl bg-slate-50 border border-slate-200 px-4 font-bold text-slate-900 focus:bg-white shadow-none"
                   value={editForm.startDate}
                   onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("DEADLINE")}</label>
                 <Input 
                   type="date"
                   className="h-12 rounded-2xl bg-slate-50 border border-slate-200 px-4 font-bold text-slate-900 focus:bg-white shadow-none"
                   value={editForm.endDate}
                   onChange={(e) => setEditForm({...editForm, endDate: e.target.value})}
                 />
              </div>
           </div>

           <div className="space-y-2" ref={membersRef}>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("MANAGE TEAM")}</label>
              <div className="relative">
                 <button
                   type="button"
                   onClick={() => { setActiveDropdown(activeDropdown === 'members' ? null : 'members'); setPersonnelSearch(""); }}
                   className={cn(
                     "w-full h-12 rounded-2xl bg-slate-50 border border-slate-200 text-left px-4 text-sm font-semibold flex items-center justify-between group transition-all",
                     activeDropdown === 'members' ? "bg-white ring-1 ring-indigo-600/20 border-indigo-600" : "hover:bg-slate-100/50"
                   )}
                 >
                   <span className="text-slate-900">{editForm.memberIds.length} {t("team members assigned")}</span>
                   <ChevronDown size={18} className={cn("text-slate-400 transition-transform duration-200", activeDropdown === 'members' && "rotate-180")} />
                 </button>
                 
                 {activeDropdown === 'members' && (
                   <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 flex flex-col">
                      <div className="p-3 border-b border-slate-50 bg-slate-50/30">
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              autoFocus
                              type="text"
                              placeholder={t("Search by name...")}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-600/20 focus:border-indigo-600"
                              value={personnelSearch}
                              onChange={(e) => setPersonnelSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                         </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                         {employees.filter(e => e.name.toLowerCase().includes(personnelSearch.toLowerCase())).map(e => (
                           <div 
                             key={e.id}
                             onClick={() => toggleMember(e.id)}
                             className={cn(
                               "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                               editForm.memberIds.includes(e.id) ? "bg-indigo-50" : "hover:bg-slate-50"
                             )}
                           >
                              <div className="h-9 w-9 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
                                 {e.image ? <img src={e.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Users size={14} /></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-bold text-slate-900 truncate">{e.name}</p>
                                 <p className="text-[10px] font-medium text-slate-400 truncate">{e.designation}</p>
                              </div>
                              {editForm.memberIds.includes(e.id) && <CheckCircle size={18} className="text-indigo-600" />}
                           </div>
                         ))}
                      </div>
                   </div>
                 )}
              </div>
           </div>

           <div className="flex gap-4 pt-4 border-t border-slate-50">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 h-14 rounded-[20px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100"
              >
                {t("Cancel")}
              </Button>
              <Button 
                type="button"
                onClick={handleEditSubmit}
                disabled={isSubmitting}
                className="flex-[1.5] h-14 rounded-[20px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xl shadow-indigo-100"
              >
                {isSubmitting ? t("Updating...") : t("Save Changes")}
              </Button>
           </div>
        </div>
      </Modal>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
