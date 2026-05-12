"use client";

import { useState, useEffect } from "react";
import { 
  BriefcaseBusiness, 
  Cake, 
  CalendarRange, 
  Landmark, 
  WalletCards, 
  CalendarClock, 
  PiggyBank, 
  FileDown, 
  CalendarDays,
  UserCheck,
  UserMinus,
  UserX,
  Plane,
  Plus,
  Bell,
  Image as ImageIcon,
  FileText,
  Trash2,
  Megaphone,
  Edit3
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  XAxis, 
  Tooltip, 
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from "recharts";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { DashboardSummary } from "@/types";
import { format } from "date-fns";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";

const emptySummary: DashboardSummary = {
  totalEmployees: 0,
  birthdaysThisMonth: 0,
  anniversariesThisMonth: 0,
  holidaysThisMonth: 0,
  salaryExpenseSummary: 0,
  pendingLeaves: 0,
  pendingLoans: 0,
  currentMonthOfficeCost: 0,
  birthdayEmployees: [],
  anniversaryEmployees: [],
  expenseChart: [],
  attendanceToday: {
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0
  }
};

export function DashboardClient() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const fmt = useCurrencyFormatter();
  const { t } = useTranslation();
  
  const { data, loading, error } = useAsyncData<DashboardSummary>(`/api/dashboard?month=${selectedMonth}&year=${selectedYear}`, emptySummary);
  
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const handleGenerateReport = () => {
    router.push(`/reports/full-monthly?month=${selectedMonth}&year=${selectedYear}&print=true`);
    setReportModalOpen(false);
  };

  const [notices, setNotices] = useState<any[]>([]);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: "", content: "", image: "", file: "" });
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const fetchNotices = async () => {
    try {
      const res = await fetch("/api/notices");
      const data = await res.json();
      setNotices(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch notices");
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/notices/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setNoticeForm(prev => ({ ...prev, [field]: data.url }));
      }
    } catch (err) {
      console.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingNotice ? `/api/notices/${editingNotice.id}` : "/api/notices";
      const method = editingNotice ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeForm),
      });
      if (res.ok) {
        setNoticeModalOpen(false);
        setNoticeForm({ title: "", content: "", image: "", file: "" });
        setEditingNotice(null);
        fetchNotices();
      }
    } catch (err) {
      console.error("Failed to save notice");
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    try {
      const res = await fetch(`/api/notices/${id}`, { method: "DELETE" });
      if (res.ok) fetchNotices();
    } catch (err) {
      console.error("Failed to delete notice");
    }
  };

  const startEditNotice = (notice: any) => {
    setEditingNotice(notice);
    setNoticeForm({
      title: notice.title,
      content: notice.content,
      image: notice.image || "",
      file: notice.file || ""
    });
    setNoticeModalOpen(true);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-sm font-black">{fmt(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const attendanceData = [
    { name: "On-time", value: data.attendanceToday.present - data.attendanceToday.late, color: "#10b981" },
    { name: "Late", value: data.attendanceToday.late, color: "#f59e0b" },
    { name: "Absent", value: data.attendanceToday.absent, color: "#ef4444" },
    { name: "On Leave", value: data.attendanceToday.onLeave, color: "#6366f1" }
  ].filter(d => d.value > 0);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const attendanceChartData = [
    { name: "On-time", value: data.attendanceToday.present - data.attendanceToday.late, color: "#10b981" },
    { name: "Late", value: data.attendanceToday.late, color: "#f59e0b" },
    { name: "Absent", value: data.attendanceToday.absent, color: "#ef4444" },
    { name: "On Leave", value: data.attendanceToday.onLeave, color: "#6366f1" }
  ].filter(item => item.value > 0);

  const totalPossible = data.totalEmployees || 1;
  const attendanceRate = ((data.attendanceToday.present / totalPossible) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("HR Management Dashboard")}
        subtitle={t("Professional SaaS-style overview for employees, payroll, leave, loans and holidays.")}
        actions={
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2">
               <CustomSelect 
                  options={["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => ({ label: m, value: String(i + 1) }))}
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  className="min-w-[140px]"
               />
               <CustomSelect 
                  options={Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)).map(y => ({ label: y, value: y }))}
                  value={selectedYear}
                  onChange={setSelectedYear}
                  className="min-w-[100px]"
               />
             </div>
             <Button variant="secondary" onClick={() => setReportModalOpen(true)} className="h-11 gap-2 bg-white hover:bg-slate-50 transition-all border-slate-200 shadow-sm rounded-2xl px-5 text-xs font-black uppercase tracking-widest">
               <FileDown className="h-4 w-4" /> <span className="hidden lg:inline">Report</span>
             </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title={t("TOTAL EMPLOYEES")} value={data.totalEmployees} icon={BriefcaseBusiness} helper={t("Active workforce")} color="blue" />
        <StatCard title={t("MONTH SALARY")} value={fmt(data.salaryExpenseSummary)} icon={WalletCards} helper={t("Accrued")} color="amber" />
        <StatCard title={t("OFFICE COST")} value={fmt(data.currentMonthOfficeCost)} icon={Landmark} helper={t("Operational")} color="purple" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Attendance Insight */}
        <Card className="p-8 flex flex-col justify-between">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t("ATTENDANCE INSIGHT")}</h3>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{t("STATUS")}: {format(new Date(), "dd MMM, yyyy")}</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                 <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-black uppercase tracking-widest">{t("ACTIVE SYNC")}</span>
              </div>
           </div>
           
           <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="w-40 h-40 relative flex-shrink-0">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                          data={attendanceData}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={6}
                          dataKey="value"
                          stroke="none"
                       >
                          {attendanceData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                       </Pie>
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-900">{data.attendanceToday.present}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t("PRESENT")}</span>
                 </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                 {attendanceData.map((item) => (
                    <div key={item.name} className="flex flex-col p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-colors hover:bg-white group">
                       <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.name}</span>
                       </div>
                       <span className="text-xl font-black text-slate-900 group-hover:text-black transition-colors">{item.value}</span>
                    </div>
                 ))}
              </div>
           </div>
        </Card>

        {/* Expense Card */}
        <Card className="p-8">
           <div className="flex items-center justify-between mb-8">
              <div>
                 <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t("FINANCIAL FLOW")}</h3>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{t("OPERATIONAL OUTFLOW")}</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-2xl text-white">
                 <PiggyBank className="w-5 h-5" />
              </div>
           </div>
           <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data.expenseChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} 
                       dy={10}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Bar 
                      dataKey="amount" 
                      fill="#0f172a" 
                      radius={[10, 10, 10, 10]} 
                      barSize={40}
                      background={{ fill: '#f8fafc', radius: 10 }}
                    />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">

        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t("UPCOMING BIRTHDAYS")}</h3>
             <Cake className="w-4 h-4 text-rose-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {data.birthdayEmployees.length ? (
              data.birthdayEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:bg-white transition-all">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 font-black text-[10px] uppercase">
                    {employee.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 truncate max-w-[100px]">{employee.name}</p>
                    <p className="text-[9px] font-bold text-rose-500 uppercase">{format(new Date(employee.date), "dd MMM")}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-10 text-center opacity-30">
                 <Cake className="w-6 h-6 mx-auto mb-2" />
                 <p className="text-[10px] font-bold uppercase tracking-widest">{t("NO RECORDS")}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t("ANNIVERSARIES")}</h3>
             <CalendarRange className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {data.anniversaryEmployees.length ? (
              data.anniversaryEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:bg-white transition-all">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 font-black text-[10px] uppercase">
                    {employee.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 truncate max-w-[100px]">{employee.name}</p>
                    <p className="text-[9px] font-bold text-indigo-500 uppercase">{format(new Date(employee.date), "dd MMM")}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-10 text-center opacity-30">
                 <CalendarRange className="w-6 h-6 mx-auto mb-2" />
                 <p className="text-[10px] font-bold uppercase tracking-widest">{t("NO RECORDS")}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Notice Board Section */}
      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <div>
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-500" />
                  Notice Board
               </h3>
               <p className="text-xs text-slate-500 font-bold">Official announcements and updates for the team</p>
            </div>
            <button 
               onClick={() => setNoticeModalOpen(true)}
               className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
            >
               <Plus className="w-4 h-4" />
               Post Notice
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notices.length > 0 ? (
               notices.map((notice) => (
                  <Card key={notice.id} className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-slate-100 flex flex-col">
                     {notice.image && (
                        <div className="h-48 overflow-hidden relative">
                           <img src={notice.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                        </div>
                     )}
                     <div className="p-6 space-y-4 flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                           <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-blue-100">
                              {notice.author}
                           </span>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {format(new Date(notice.createdAt), "dd MMM, yyyy")}
                           </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                           <button 
                              onClick={() => startEditNotice(notice)}
                              className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                           >
                              <Edit3 className="w-3.5 h-3.5" />
                           </button>
                           <button 
                              onClick={() => handleDeleteNotice(notice.id)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                           >
                              <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>

                        <div className="space-y-2 flex-1">
                           <h4 className="text-lg font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{notice.title}</h4>
                           <p className="text-sm text-slate-600 line-clamp-3 font-medium leading-relaxed">{notice.content}</p>
                        </div>
                        {notice.file && (
                           <a 
                              href={notice.file} 
                              target="_blank" 
                              className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white transition-all group/file mt-auto"
                           >
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover/file:bg-blue-600 group-hover/file:text-white transition-all">
                                 <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 overflow-hidden">
                                 <p className="text-[10px] font-black text-slate-900 truncate">Attachment Download</p>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Click to view file</p>
                              </div>
                           </a>
                        )}
                     </div>
                  </Card>
               ))
            ) : (
               <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                     <Megaphone className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                     <p className="text-sm font-black text-slate-900 uppercase tracking-tight">No announcements yet</p>
                     <p className="text-xs text-slate-400 font-bold mt-1">When HR posts a notice, it will appear here for all employees.</p>
                  </div>
               </div>
            )}
         </div>
      </div>

      {/* Notice Modal */}
      <Modal 
         open={noticeModalOpen} 
         onClose={() => {
            setNoticeModalOpen(false);
            setEditingNotice(null);
            setNoticeForm({ title: "", content: "", image: "", file: "" });
         }} 
         title={editingNotice ? 'Edit Announcement' : 'Create New Announcement'}
         description={editingNotice ? 'Update the details of this notice.' : 'This will be visible to all employees immediately.'}
         size="xl"
      >
         <form onSubmit={handleCreateNotice} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notice Title</label>
               <input 
                  required
                  value={noticeForm.title}
                  onChange={e => setNoticeForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-900 outline-none"
                  placeholder="e.g. Office Holiday Announcement"
               />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content / Message</label>
               <textarea 
                  required
                  rows={4}
                  value={noticeForm.content}
                  onChange={e => setNoticeForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-slate-900 outline-none resize-none"
                  placeholder="Write your announcement details here..."
               />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <ImageIcon className="w-3 h-3" />
                     Cover Image
                  </label>
                  <div className="relative group/upload">
                     <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => handleUpload(e, 'image')}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                     />
                     <div className={`p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${noticeForm.image ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-blue-400'}`}>
                        {noticeForm.image ? (
                           <div className="flex flex-col items-center gap-2 text-emerald-600">
                              <Bell className="w-6 h-6 animate-bounce" />
                              <span className="text-[9px] font-black uppercase">Ready to Post</span>
                           </div>
                        ) : (
                           <>
                              <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                                 <Plus className="w-4 h-4" />
                              </div>
                              <span className="text-[9px] font-black text-slate-400 uppercase">Select Image</span>
                           </>
                        )}
                     </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                     <FileText className="w-3 h-3" />
                     Attachment
                  </label>
                  <div className="relative group/upload">
                     <input 
                        type="file" 
                        onChange={e => handleUpload(e, 'file')}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                     />
                     <div className={`p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${noticeForm.file ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-blue-400'}`}>
                        {noticeForm.file ? (
                           <div className="flex flex-col items-center gap-2 text-emerald-600">
                              <FileText className="w-6 h-6" />
                              <span className="text-[9px] font-black uppercase">File Attached</span>
                           </div>
                        ) : (
                           <>
                              <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                                 <Plus className="w-4 h-4" />
                              </div>
                              <span className="text-[9px] font-black text-slate-400 uppercase">Select File</span>
                           </>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-4">
               <button 
                  type="submit"
                  disabled={uploading}
                  className="w-full py-5 bg-slate-900 text-white rounded-[24px] text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
               >
                  {uploading ? 'Processing Files...' : (editingNotice ? 'Update Announcement' : 'Publish Announcement')}
               </button>
            </div>
         </form>
      </Modal>

      {/* Monthly Report Selector Modal */}
      <Modal 
        open={reportModalOpen} 
        onClose={() => setReportModalOpen(false)} 
        title="Full Monthly Report"
        description="Select a month to generate a consolidated PDF report."
        size="md"
      >
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <CustomSelect 
              label="Month"
              options={["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => ({ label: m, value: String(i + 1) }))}
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
            <CustomSelect 
              label="Year"
              options={Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)).map(y => ({ label: y, value: y }))}
              value={selectedYear}
              onChange={setSelectedYear}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button variant="ghost" onClick={() => setReportModalOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateReport} className="gap-2">
               <CalendarDays className="h-4 w-4" /> View & Print Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
