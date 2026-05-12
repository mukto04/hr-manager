"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar, 
  Users, 
  Coins, 
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  ChevronDown,
  LayoutGrid,
  CheckCircle,
  FileCode,
  ShieldCheck,
  Briefcase,
  HelpCircle,
  X,
  UserCheck,
  Trash2,
  Edit3,
  TestTube2,
  Bug,
  Layers,
  Trophy,
  Code
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useTranslation } from "@/hooks/use-translation";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import Link from "next/link";
import { cn } from "@/utils/classnames";

const STATUS_OPTIONS = [
  { id: "PLANNED", label: "PLANNED", icon: Calendar, color: "text-slate-400", bg: "bg-slate-50" },
  { id: "RUNNING", label: "RUNNING", icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "ON_HOLD", label: "ON HOLD", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50" },
  { id: "IN_TESTING", label: "IN TESTING", icon: FileCode, color: "text-purple-500", bg: "bg-purple-50" },
  { id: "ISSUE_FIXING", label: "ISSUE FIXING", icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-50" },
  { id: "DONE", label: "DONE", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "HANDOVER", label: "HANDOVER", icon: Briefcase, color: "text-indigo-500", bg: "bg-indigo-50" },
];

const PROJECT_TYPES = [
  "Installation",
  "Customization",
  "Maintenance",
  "Migration",
  "Development",
  "Security Audit"
];

const WORK_LOG_PHASES = [
  { id: "RUNNING_WORK", label: "RUNNING WORK", icon: Code, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  { id: "IN_TESTING", label: "IN TESTING", icon: TestTube2, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
  { id: "ISSUE_FIXING", label: "ISSUE FIXING", icon: Bug, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const { t } = useTranslation();

  // Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedProjectForLogs, setSelectedProjectForLogs] = useState<any>(null);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "Installation",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    totalAmount: "0",
    description: "",
    status: "PLANNED",
    clientSource: "",
    projectManagerId: "",
    memberIds: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [personnelSearch, setPersonnelSearch] = useState("");

  // Refs for click-outside
  const typeRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<HTMLDivElement>(null);
  const filterTypeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProjects();
    fetchEmployees();

    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown === 'type' && typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (activeDropdown === 'members' && membersRef.current && !membersRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (activeDropdown === 'manager' && managerRef.current && !managerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (activeDropdown === 'filterType' && filterTypeRef.current && !filterTypeRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      const sortedData = Array.isArray(data) ? data.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ) : [];
      setProjects(sortedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusModal = (project: any) => {
    setSelectedProject(project);
    setIsStatusModalOpen(true);
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
        fetchProjects();
        toast.success(t("Project status updated!"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
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

  const handleOpenLogs = (project: any) => {
    setSelectedProjectForLogs(project);
    fetchWorkLogs(project.id);
    setIsLogModalOpen(true);
  };

  const handleEdit = (project: any) => {
    setIsEditMode(true);
    setEditingProjectId(project.id);
    setForm({
      name: project.name,
      type: project.type || "Installation",
      startDate: project.startDate ? format(new Date(project.startDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      endDate: project.endDate ? format(new Date(project.endDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      totalAmount: project.totalAmount.toString(),
      description: project.description || "",
      status: project.status,
      clientSource: project.clientSource || "",
      projectManagerId: project.projectManagerId || "",
      memberIds: project.members?.map((m: any) => m.employeeId) || []
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (project: any) => {
    if (!confirm(t("Are you sure you want to move this project to history?"))) return;
    
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, status: "ARCHIVED" })
      });
      
      if (res.ok) {
        fetchProjects();
        toast.success(t("Project moved to history!"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Ensure Project Manager is also a member if selected
      const finalMemberIds = [...form.memberIds];
      if (form.projectManagerId && !finalMemberIds.includes(form.projectManagerId)) {
        finalMemberIds.push(form.projectManagerId);
      }

      const payload = {
        ...form,
        memberIds: finalMemberIds,
        projectManagerId: form.projectManagerId || null,
        totalAmount: parseFloat(form.totalAmount) || 0
      };

      const url = isEditMode ? `/api/projects/${editingProjectId}` : "/api/projects";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchProjects();
        toast.success(isEditMode ? t("Project updated successfully!") : t("Project created successfully!"));
      } else {
        const error = await res.json();
        toast.error(t("Failed: ") + (error.message || t("Unknown error")));
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      alert(t("Network error: ") + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      type: "Installation",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      totalAmount: "0",
      description: "",
      status: "PLANNED",
      clientSource: "",
      projectManagerId: "",
      memberIds: []
    });
    setIsEditMode(false);
    setEditingProjectId(null);
    setActiveDropdown(null);
    setPersonnelSearch("");
  };

  const toggleMember = (id: string) => {
    setForm(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(id) 
        ? prev.memberIds.filter(m => m !== id)
        : [...prev.memberIds, id]
    }));
  };

  const filteredProjects = projects.filter(p => {
    // Filter by Archive/History
    if (isHistoryView) {
       if (p.status !== "ARCHIVED") return false;
    } else {
       if (p.status === "ARCHIVED") return false;
    }

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === "All Types" || p.type === selectedType;
    const matchesStatus = selectedStatus === "ALL" || 
                         (selectedStatus === "ASSIGNED" ? (p.members?.length || 0) > 0 : p.status === selectedStatus);
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(personnelSearch.toLowerCase()) || 
    (e.designation && e.designation.toLowerCase().includes(personnelSearch.toLowerCase()))
  );

  const stats = [
    { id: "ALL", label: "ALL PROJECTS", count: projects.filter(p => p.status !== "ARCHIVED").length, icon: LayoutGrid, color: "text-indigo-600", bg: "bg-indigo-50" },
    { id: "ASSIGNED", label: "ASSIGNED", count: projects.filter(p => p.status !== "ARCHIVED" && (p.members?.length || 0) > 0).length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    ...STATUS_OPTIONS.map(s => ({
       id: s.id,
       label: s.label,
       count: projects.filter(p => p.status === s.id).length,
       icon: s.icon,
       color: s.color,
       bg: s.bg
    }))
  ];

  const getPhaseHours = (phase: string) => {
    return workLogs.filter(log => log.phase === phase).reduce((acc, log) => acc + log.hours, 0);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-8 pt-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{isHistoryView ? t("Project History") : t("Project Tracking")}</h1>
          <p className="text-slate-500 font-medium text-xs">{isHistoryView ? t("Viewing archived and deleted projects.") : t("Manage and track software development projects and teams.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsHistoryView(!isHistoryView)}
            className={cn(
              "h-9 px-4 rounded-lg font-bold text-[11px] flex items-center gap-2 transition-all uppercase tracking-widest border",
              isHistoryView ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100"
            )}
          >
            <History size={16} />
            {isHistoryView ? t("BACK TO LIVE") : t("HISTORY")}
          </button>
          {!isHistoryView && (
            <Button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="h-9 px-5 rounded-lg bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold text-[11px] shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95 uppercase tracking-widest"
            >
              <Plus size={18} />
              {t("NEW PROJECT")}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards (Tabs) - Only show in live view */}
      {!isHistoryView && (
        <div className="flex items-center gap-3 overflow-x-auto pb-6 px-8 scrollbar-hide">
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
      )}

      {/* Search & Filter Bar */}
      <div className="mx-8 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder={t("Search by name or description...")}
            className="w-full pl-11 pr-4 py-2 rounded-lg bg-slate-50/50 border-transparent focus:bg-white focus:ring-1 focus:ring-indigo-600/20 focus:border-indigo-600/30 transition-all text-[13px] font-semibold"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2" ref={filterTypeRef}>
           <div className="flex items-center bg-slate-50 p-1 rounded-lg relative">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2">{t("TYPE")}</span>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'filterType' ? null : 'filterType')}
                className="bg-transparent border-none text-[11px] font-bold text-slate-700 focus:ring-0 cursor-pointer pr-7 flex items-center gap-2 relative"
              >
                {selectedType}
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform absolute right-1 top-1/2 -translate-y-1/2", activeDropdown === 'filterType' && "rotate-180")} />
              </button>
              
              {activeDropdown === 'filterType' && (
                <div className="absolute top-full right-0 mt-2 min-w-[160px] bg-white rounded-xl shadow-2xl border border-slate-100 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                  <div 
                    onClick={() => { setSelectedType("All Types"); setActiveDropdown(null); }}
                    className={cn(
                      "px-4 py-2.5 text-[11px] font-bold cursor-pointer transition-colors uppercase tracking-tight",
                      selectedType === "All Types" ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {t("All Types")}
                  </div>
                  {PROJECT_TYPES.map(type => (
                    <div 
                      key={type}
                      onClick={() => { setSelectedType(type); setActiveDropdown(null); }}
                      className={cn(
                        "px-4 py-2.5 text-[11px] font-bold cursor-pointer transition-colors uppercase tracking-tight",
                        selectedType === type ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {type}
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="mx-8 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-320px)] min-h-[400px]">
         <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse table-fixed">
               <thead className="bg-[#F8FAFC]/90 border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md">
                  <tr>
                     <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[80px]">{t("SL")}</th>
                     <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[250px]">{t("PROJECT NAME")}</th>
                     <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[150px]">{t("TYPE")}</th>
                     <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[120px]">{t("MEMBERS")}</th>
                     <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[200px]">{t("TIMELINE")}</th>
                     <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest w-[150px]">{t("STATUS")}</th>
                     <th className="py-4 px-8 font-bold text-slate-400 text-[10px] uppercase tracking-widest text-right w-[180px]">{t("ACTIONS")}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    [1, 2, 3].map(i => (
                      <tr key={i} className="animate-pulse">
                         <td colSpan={7} className="py-5 px-8"><div className="h-4 bg-slate-50 rounded w-full" /></td>
                      </tr>
                    ))
                  ) : filteredProjects.length > 0 ? (
                    filteredProjects.map((project, index) => (
                      <tr key={project.id} className="hover:bg-slate-50/50 transition-all group">
                         <td className="py-5 px-8">
                            <span className="text-[11px] font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                         </td>
                         <td className="py-5 px-8">
                            <div className="block group cursor-default">
                               <p className="font-bold text-slate-900 text-[13px] tracking-tight group-hover:text-indigo-600 transition-colors">{project.name}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">{project.description || t("No description provided")}</p>
                                  {project.clientSource && (
                                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded leading-none">
                                      {t("SOURCE:")} {project.clientSource}
                                    </span>
                                  )}
                               </div>
                            </div>
                         </td>
                         <td className="py-5 px-8">
                            <span className="inline-flex px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[8px] font-black uppercase tracking-widest border border-slate-200">
                               {project.type}
                            </span>
                         </td>
                         <td className="py-5 px-8">
                            <div className="flex -space-x-2.5">
                               {project.members?.slice(0, 3).map((m: any, idx: number) => {
                                 const isPM = m.employeeId === project.projectManagerId;
                                 return (
                                   <div 
                                     key={idx} 
                                     className={cn(
                                       "h-8 w-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm relative",
                                       isPM ? "ring-2 ring-indigo-500 z-10" : "z-0"
                                     )} 
                                     title={m.employee?.name + (isPM ? " (Project Manager)" : "")}
                                   >
                                      {m.employee?.image ? (
                                        <img src={m.employee.image} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                           <Users size={12} />
                                        </div>
                                      )}
                                      {isPM && (
                                        <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                                           <span className="text-[7px] font-black text-indigo-700 bg-white px-0.5 rounded shadow-sm uppercase leading-none">PM</span>
                                        </div>
                                      )}
                                   </div>
                                 );
                               })}
                               {project.members && project.members.length > 3 && (
                                 <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-white text-[9px] font-bold">
                                    +{project.members.length - 3}
                                 </div>
                               )}
                               {(!project.members || project.members.length === 0) && (
                                 <div className="h-8 w-8 rounded-full border-2 border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300">
                                    <Users size={12} />
                                 </div>
                               )}
                            </div>
                         </td>
                         <td className="py-5 px-8">
                            <div className="flex items-center gap-1.5 text-slate-400">
                               <Calendar size={12} />
                               <span className="text-[10px] font-bold tracking-tight text-slate-600">
                                  {project.startDate ? format(new Date(project.startDate), "dd MMM") : "TBD"} - {project.endDate ? format(new Date(project.endDate), "dd MMM, yyyy") : "Open"}
                               </span>
                            </div>
                         </td>
                         <td className="py-5 px-8">
                            <div className={cn(
                               "inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                               project.status === "RUNNING" ? "bg-blue-50 text-blue-600 border-blue-100" :
                               project.status === "IN_TESTING" ? "bg-purple-50 text-purple-600 border-purple-100" :
                               project.status === "ISSUE_FIXING" ? "bg-rose-50 text-rose-600 border-rose-100" :
                               project.status === "DONE" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                               project.status === "ON_HOLD" ? "bg-amber-50 text-amber-600 border-amber-100" :
                               project.status === "HANDOVER" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                               project.status === "ARCHIVED" ? "bg-slate-900 text-white border-slate-800" :
                               "bg-slate-50 text-slate-500 border-slate-100"
                            )}>
                               {t(project.status)}
                            </div>
                         </td>
                         <td className="py-5 px-8 text-right">
                            <div className="flex items-center justify-end gap-2">
                               <button 
                                 onClick={() => handleOpenLogs(project)}
                                 className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                                 title={t("Work Logs")}
                               >
                                 <Clock size={16} />
                               </button>
                               {!isHistoryView && (
                                 <>
                                   <button 
                                     onClick={() => handleOpenStatusModal(project)}
                                     className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" 
                                     title={t("Update Status")}
                                   >
                                     <LayoutGrid size={16} />
                                   </button>
                                   <button 
                                     onClick={() => handleEdit(project)}
                                     className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" 
                                     title={t("Edit Project")}
                                   >
                                     <Edit3 size={16} />
                                   </button>
                                   <button 
                                     onClick={() => handleDelete(project)}
                                     className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" 
                                     title={t("Delete Project")}
                                   >
                                     <Trash2 size={16} />
                                   </button>
                                 </>
                               )}
                            </div>
                         </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                       <td colSpan={7} className="py-20 text-center">
                          <div className="h-16 w-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto text-slate-200 mb-4">
                             <ClipboardList size={32} />
                          </div>
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t("No Projects Found")}</p>
                       </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Status Update Modal */}
      <Modal
        open={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={t("UPDATE STATUS")}
        description={t("Current status for {name}: {status}", { name: selectedProject?.name, status: selectedProject?.status })}
        size="md"
      >
        <div className="grid grid-cols-3 gap-3 p-1">
          {STATUS_OPTIONS.map((option) => {
            const isSelected = selectedProject?.status === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleStatusUpdate(option.id)}
                disabled={isSubmitting}
                className={cn(
                  "p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 group relative overflow-hidden",
                  isSelected 
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-lg scale-[1.02]" 
                    : "border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md text-slate-600"
                )}
              >
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                  isSelected ? "bg-white/20 text-white" : cn("bg-slate-50 group-hover:bg-indigo-50", option.color)
                )}>
                  <option.icon size={20} />
                </div>
                <div className="text-center">
                   <p className="text-[10px] font-black tracking-tight">{t(option.label)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Project Modal (Create/Edit) */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? t("Edit Project") : t("Create New Project")}
        description={isEditMode ? t("Update details for {name}", { name: form.name }) : t("Fill in the details to start tracking a new software project.")}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("PROJECT NAME")}</label>
                 <Input 
                   required
                   placeholder={t("Enter project name...")}
                   className="h-10 rounded-xl bg-slate-50 border border-slate-200 font-semibold placeholder:text-slate-300 focus:bg-white transition-all shadow-none"
                   value={form.name}
                   onChange={(e) => setForm({...form, name: e.target.value})}
                 />
              </div>
              <div className="space-y-2" ref={typeRef}>
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("TYPE")}</label>
                 <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDropdown(activeDropdown === 'type' ? null : 'type')}
                      className={cn(
                        "w-full h-10 rounded-xl bg-slate-50 border border-slate-200 text-left px-4 text-xs font-semibold flex items-center justify-between group transition-all",
                        activeDropdown === 'type' ? "bg-white ring-1 ring-indigo-600/20 border-indigo-600" : "hover:bg-slate-100/50"
                      )}
                    >
                      <span className="text-slate-900">{form.type}</span>
                      <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", activeDropdown === 'type' && "rotate-180")} />
                    </button>
                    {activeDropdown === 'type' && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-100 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                        {PROJECT_TYPES.map(type => (
                          <div 
                            key={type}
                            onClick={() => { setForm({...form, type}); setActiveDropdown(null); }}
                            className={cn(
                              "px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors",
                              form.type === type ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {type}
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2" ref={membersRef}>
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("ASSIGN DEVELOPERS")}</label>
                 <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setActiveDropdown(activeDropdown === 'members' ? null : 'members'); setPersonnelSearch(""); }}
                      className={cn(
                        "w-full h-10 rounded-xl bg-slate-50 border border-slate-200 text-left px-4 text-xs font-semibold flex items-center justify-between group transition-all",
                        activeDropdown === 'members' ? "bg-white ring-1 ring-indigo-600/20 border-indigo-600" : "hover:bg-slate-100/50"
                      )}
                    >
                      <span className={form.memberIds.length > 0 ? "text-slate-900" : "text-slate-300"}>
                        {form.memberIds.length > 0 ? `${form.memberIds.length} ${t("team members selected")}` : t("Select team members...")}
                      </span>
                      <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", activeDropdown === 'members' && "rotate-180")} />
                    </button>
                    
                    {activeDropdown === 'members' && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 flex flex-col">
                         <div className="p-2 border-b border-slate-50 bg-slate-50/30">
                            <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                               <input 
                                 autoFocus
                                 type="text"
                                 placeholder={t("Search by name or designation...")}
                                 className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-[11px] font-semibold outline-none focus:ring-1 focus:ring-indigo-600/20 focus:border-indigo-600"
                                 value={personnelSearch}
                                 onChange={(e) => setPersonnelSearch(e.target.value)}
                                 onClick={(e) => e.stopPropagation()}
                               />
                            </div>
                         </div>
                         <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {filteredEmployees.length > 0 ? filteredEmployees.map(e => (
                              <div 
                                key={e.id}
                                onClick={() => toggleMember(e.id)}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                                  form.memberIds.includes(e.id) ? "bg-indigo-50" : "hover:bg-slate-50"
                                )}
                              >
                                 <div className="h-7 w-7 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
                                    {e.image ? <img src={e.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Users size={10} /></div>}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-900 truncate">{e.name}</p>
                                    <p className="text-[9px] font-medium text-slate-400 truncate">{e.designation}</p>
                                 </div>
                                 {form.memberIds.includes(e.id) && <CheckCircle size={14} className="text-indigo-600" />}
                              </div>
                            )) : (
                               <div className="py-8 text-center text-slate-400 text-[10px] font-bold italic">{t("No employees found.")}</div>
                            )}
                         </div>
                      </div>
                    )}
                 </div>
              </div>
              <div className="space-y-2" ref={managerRef}>
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("PROJECT MANAGER")}</label>
                 <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setActiveDropdown(activeDropdown === 'manager' ? null : 'manager'); setPersonnelSearch(""); }}
                      className={cn(
                        "w-full h-10 rounded-xl bg-slate-50 border border-slate-200 text-left px-4 text-xs font-semibold flex items-center justify-between group transition-all",
                        activeDropdown === 'manager' ? "bg-white ring-1 ring-indigo-600/20 border-indigo-600" : "hover:bg-slate-100/50"
                      )}
                    >
                      <span className={form.projectManagerId ? "text-slate-900" : "text-slate-300"}>
                        {employees.find(e => e.id === form.projectManagerId)?.name || t("Select manager...")}
                      </span>
                      <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", activeDropdown === 'manager' && "rotate-180")} />
                    </button>
                    
                    {activeDropdown === 'manager' && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200 flex flex-col">
                         <div className="p-2 border-b border-slate-50 bg-slate-50/30">
                            <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                               <input 
                                 autoFocus
                                 type="text"
                                 placeholder={t("Search by name...")}
                                 className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-[11px] font-semibold outline-none focus:ring-1 focus:ring-indigo-600/20 focus:border-indigo-600"
                                 value={personnelSearch}
                                 onChange={(e) => setPersonnelSearch(e.target.value)}
                                 onClick={(e) => e.stopPropagation()}
                               />
                            </div>
                         </div>
                         <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {filteredEmployees.length > 0 ? filteredEmployees.map(e => (
                              <div 
                                key={e.id}
                                onClick={() => { setForm({...form, projectManagerId: e.id}); setActiveDropdown(null); }}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                                  form.projectManagerId === e.id ? "bg-indigo-50 text-indigo-600" : "hover:bg-slate-50"
                                )}
                              >
                                 <div className="h-7 w-7 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
                                    {e.image ? <img src={e.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Users size={10} /></div>}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-900 truncate">{e.name}</p>
                                    <p className="text-[9px] font-medium text-slate-400 truncate">{e.designation}</p>
                                 </div>
                                 {form.projectManagerId === e.id && <CheckCircle size={14} className="text-indigo-600" />}
                              </div>
                            )) : (
                               <div className="py-8 text-center text-slate-400 text-[10px] font-bold italic">{t("No employees found.")}</div>
                            )}
                         </div>
                      </div>
                    )}
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("START DATE")}</label>
                 <div className="relative group">
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <Input 
                      type="date"
                      className="h-10 rounded-xl bg-slate-50 border border-slate-200 px-4 font-semibold text-slate-900 focus:bg-white transition-all shadow-none"
                      value={form.startDate}
                      onChange={(e) => setForm({...form, startDate: e.target.value})}
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("DEADLINE")}</label>
                 <div className="relative group">
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    <Input 
                      type="date"
                      className="h-10 rounded-xl bg-slate-50 border border-slate-200 px-4 font-semibold text-slate-900 focus:bg-white transition-all shadow-none"
                      value={form.endDate}
                      onChange={(e) => setForm({...form, endDate: e.target.value})}
                    />
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("PROJECT STATUS")}</label>
              <div className="flex flex-wrap gap-2">
                 {STATUS_OPTIONS.map(status => (
                   <button
                     key={status.id}
                     type="button"
                     onClick={() => setForm({...form, status: status.id})}
                     className={cn(
                       "px-4 py-2 rounded-xl text-[10px] font-bold tracking-tight transition-all flex items-center gap-2",
                       form.status === status.id 
                         ? "bg-white border border-indigo-600 text-indigo-600 shadow-sm" 
                         : "bg-slate-50 border border-transparent text-slate-600 hover:bg-slate-100"
                     )}
                   >
                      {t(status.label)}
                      {form.status === status.id && <CheckCircle size={14} className="ml-1" />}
                   </button>
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("TOTAL AMOUNT")}</label>
                 <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                    <Input 
                      type="number"
                      placeholder="0"
                      className="h-10 pl-10 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:bg-white transition-all shadow-none"
                      value={form.totalAmount}
                      onChange={(e) => setForm({...form, totalAmount: e.target.value})}
                    />
                 </div>
              </div>
              <div className="space-y-3">
                 <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("CLIENT SOURCE")}</label>
                 <Input 
                   placeholder={t("e.g. LinkedIn, Upwork, Referral...")}
                   className="h-10 rounded-xl bg-slate-50 border border-slate-200 font-semibold placeholder:text-slate-300 focus:bg-white transition-all shadow-none"
                   value={form.clientSource}
                   onChange={(e) => setForm({...form, clientSource: e.target.value})}
                 />
              </div>
           </div>

           <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1">{t("PROJECT DESCRIPTION")}</label>
              <textarea 
                className="w-full min-h-[100px] p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold placeholder:text-slate-300 focus:bg-white transition-all resize-none shadow-none outline-none"
                placeholder={t("Brief description of the project goals...")}
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
              />
           </div>

           <div className="flex gap-4 pt-4 border-t border-slate-50">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 h-12 rounded-2xl font-bold text-slate-700 bg-slate-50 hover:bg-slate-100"
              >
                {t("Cancel")}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-[1.5] h-12 rounded-2xl bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold shadow-xl shadow-indigo-100"
              >
                {isSubmitting ? (isEditMode ? t("Updating...") : t("Creating...")) : (isEditMode ? t("Update Project") : t("Create Project"))}
              </Button>
           </div>
        </form>
      </Modal>

      {/* Work History Log Modal */}
      <Modal
        open={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={t("Project Work Logs")}
        description={t("Work hour breakdown for: {name}", { name: selectedProjectForLogs?.name })}
        size="3xl"
      >
        <div className="space-y-8">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("PHASE BREAKDOWN")}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                 {WORK_LOG_PHASES.map((phase) => {
                    const totalHours = getPhaseHours(phase.id);
                    return (
                      <div 
                        key={phase.id}
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex flex-col items-center gap-3",
                          phase.bg, phase.border
                        )}
                      >
                         <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm", phase.color)}>
                            <phase.icon size={20} />
                         </div>
                         <div className="text-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter leading-tight mb-1">{t(phase.label)}</p>
                            <p className={cn("text-sm font-black", phase.color)}>{totalHours.toFixed(1)}h</p>
                         </div>
                      </div>
                    );
                 })}
                 <div className="p-4 rounded-2xl border bg-amber-50 border-amber-100 transition-all flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm text-amber-600">
                       <Trophy size={20} />
                    </div>
                    <div className="text-center">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter leading-tight mb-1">{t("TOTAL HOURS")}</p>
                       <p className="text-sm font-black text-amber-600">
                          {workLogs.reduce((acc, log) => acc + log.hours, 0).toFixed(1)}h
                       </p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("DETAILED LOG HISTORY")}</h3>
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden min-h-[200px] flex flex-col">
                 {logsLoading ? (
                   <div className="flex-1 flex items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                   </div>
                 ) : workLogs.length > 0 ? (
                   <div className="divide-y divide-slate-100">
                      {workLogs.map((log) => {
                        const phase = WORK_LOG_PHASES.find(p => p.id === log.phase);
                        return (
                          <div key={log.id} className="p-4 flex items-center justify-between hover:bg-white transition-colors group">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-white border border-slate-200 overflow-hidden shadow-sm shrink-0">
                                   {log.employee?.image ? <img src={log.employee.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Users size={14} /></div>}
                                </div>
                                <div>
                                   <p className="text-[12px] font-bold text-slate-900">{log.employee?.name}</p>
                                   <div className="flex items-center gap-2 mt-0.5">
                                      <span className={cn("text-[9px] font-black uppercase tracking-widest", phase?.color)}>
                                         {t(phase?.label || log.phase)}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-medium">• {format(new Date(log.date), "dd MMM, yyyy")}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-black text-slate-900">{log.hours}h</p>
                                <p className="text-[10px] font-medium text-slate-400 italic truncate max-w-[200px]">{log.note || t("No notes")}</p>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center py-12 text-center opacity-50 italic">
                      <p className="text-slate-400 text-xs font-medium">{t("No work logs found for this project.")}</p>
                   </div>
                 )}
              </div>
           </div>

           <Button 
             onClick={() => setIsLogModalOpen(false)}
             className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-xl shadow-slate-100"
           >
              {t("Close Logs")}
           </Button>
        </div>
      </Modal>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
