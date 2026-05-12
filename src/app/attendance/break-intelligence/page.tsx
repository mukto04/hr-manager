"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  History, 
  Search, 
  FileDown, 
  Clock, 
  MoreVertical, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Plus,
  Loader2,
  Calendar,
  AlertCircle,
  MessageSquare,
  Download,
  Filter,
  Edit2,
  CheckCircle
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getJson, sendJson } from "@/lib/http";
import { toast } from "sonner";
import { useDialog } from "@/components/ui/dialog-provider";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { ServiceGuard } from "@/components/shared/service-guard";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";

export default function BreakIntelligencePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [employeeId, setEmployeeId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Pending Requests State
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [hrNote, setHrNote] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const dialog = useDialog();

  const [formData, setFormData] = useState({
    employeeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "",
    endTime: "",
    note: ""
  });

  const months = [
    { label: t("January"), value: "1" },
    { label: t("February"), value: "2" },
    { label: t("March"), value: "3" },
    { label: t("April"), value: "4" },
    { label: t("May"), value: "5" },
    { label: t("June"), value: "6" },
    { label: t("July"), value: "7" },
    { label: t("August"), value: "8" },
    { label: t("September"), value: "9" },
    { label: t("October"), value: "10" },
    { label: t("November"), value: "11" },
    { label: t("December"), value: "12" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => ({
    label: String(new Date().getFullYear() - i),
    value: String(new Date().getFullYear() - i),
  }));

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance/break-intelligence?month=${month}&year=${year}&employeeId=${employeeId}`);
      if (!res.ok) {
        console.warn("API Error fetchRecords:", res.status);
        setRecords([]);
        return;
      }
      if (res.headers.get("content-type")?.includes("text/html")) {
        console.warn("API Error fetchRecords: Received HTML instead of JSON");
        setRecords([]);
        return;
      }
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch break records:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [month, year, employeeId]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) {
        console.warn("API Error fetchEmployees:", res.status);
        setEmployees([]);
        return;
      }
      if (res.headers.get("content-type")?.includes("text/html")) {
        console.warn("API Error fetchEmployees: Received HTML instead of JSON");
        setEmployees([]);
        return;
      }
      const data = await res.json();
      setEmployees(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      setEmployees([]);
    }
  };

  const fetchPendingRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/break-requests?status=PENDING`);
      if (res.ok && !res.headers.get("content-type")?.includes("text/html")) {
        const data = await res.json();
        setPendingRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch pending requests:", error);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchPendingRequests();
  }, [fetchRecords, fetchPendingRequests]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleApprove = async (request: any) => {
    const confirmed = await dialog.confirm(
      t("Approve Break Request?"),
      t("Are you sure you want to approve the break request for {name} on {date}?", { name: request.employee.name, date: format(new Date(request.date), "dd MMM, yyyy") })
    );
    if (!confirmed) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/attendance/break-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (res.ok) {
        fetchPendingRequests();
        fetchRecords(); // Refresh main report to show the approved break
      } else {
        const err = await res.json();
        dialog.alert("Error", err.message || "Failed to approve request");
      }
    } catch (error) {
      console.error(error);
      dialog.alert("Error", "An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const openRejectModal = (request: any) => {
    setSelectedRequest(request);
    setHrNote("");
    setIsRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!hrNote.trim()) {
      dialog.alert(t("Error"), t("Please provide a reason for rejection."));
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/attendance/break-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", hrNote }),
      });

      if (res.ok) {
        setIsRejectModalOpen(false);
        fetchPendingRequests();
      } else {
        const err = await res.json();
        dialog.alert("Error", err.message || "Failed to reject request");
      }
    } catch (error) {
      console.error(error);
      dialog.alert("Error", "An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await dialog.danger(t("Delete Record?"), t("Are you sure you want to delete this break record?"));
    if (!confirmed) return;

    try {
      await fetch(`/api/attendance/break-intelligence/${id}`, { method: "DELETE" });
      fetchRecords();
    } catch (error) {
      console.error(error);
    }
  };

  const openNewModal = () => {
    setSelectedRecord(null);
    setFormData({
      employeeId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "",
      endTime: "",
      note: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: any) => {
    setSelectedRecord(record);
    setFormData({
      employeeId: record.employeeId,
      date: format(new Date(record.date), "yyyy-MM-dd"),
      startTime: format(new Date(record.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: record.endTime ? format(new Date(record.endTime), "yyyy-MM-dd'T'HH:mm") : "",
      note: record.note || ""
    });
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const headers = [t("Employee"), t("Code"), t("Date"), t("Start"), t("End"), t("Duration")];
    const rows = records.map(r => [
      r.employee?.name,
      r.employee?.employeeCode,
      format(new Date(r.date), "yyyy-MM-dd"),
      format(new Date(r.startTime), "hh:mm a"),
      r.endTime ? format(new Date(r.endTime), "hh:mm a") : "-",
      r.duration
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `break_report_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId) {
      dialog.alert(t("Validation Error"), t("Please select an employee first."));
      return;
    }

    setSaving(true);
    try {
      const url = selectedRecord ? `/api/attendance/break-intelligence/${selectedRecord.id}` : `/api/attendance/break-intelligence`;
      const method = selectedRecord ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchRecords();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };



  const filteredRecords = records.filter(r => 
    r.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.employee?.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ServiceGuard id="attendance">
      <div className="space-y-6">
        <PageHeader
          title={t("Break Time Intelligence")}
          subtitle={t("Analyze employee break patterns and total durations.")}
          actions={
            <div className="flex gap-3">
               <Button onClick={openNewModal} className="bg-brand-600 hover:bg-brand-700 shadow-soft-xl gap-2 rounded-2xl">
                 <Plus className="w-4 h-4" /> {t("Add Manually")}
               </Button>
               <Button onClick={handleExport} variant="outline" className="bg-white hover:bg-slate-50 border-slate-200 shadow-soft-xl gap-2 rounded-2xl text-slate-700">
                 <Download className="w-4 h-4" /> {t("Export CSV")}
               </Button>
            </div>
          }
        />

        <Card className="p-6 border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Employee")}</label>
              <Combobox 
                options={[{ id: "all", name: t("All Employees") }, ...employees.map(e => ({ id: e.id, name: `${e.name} (${e.employeeCode})` }))]}
                value={employeeId}
                onChange={setEmployeeId}
                placeholder={t("Select Employee...")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Month")}</label>
              <Select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-xl border-slate-200">
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Year")}</label>
              <Select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-xl border-slate-200">
                {years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
              </Select>
            </div>
            <Button onClick={() => fetchRecords()} className="bg-brand-600 hover:bg-brand-700 shadow-soft-xl gap-2">
              <Filter className="w-4 h-4" /> {t("Generate Report")}
            </Button>
          </div>
        </Card>

        {pendingRequests.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              {t("Pending Break Requests")}
            </h3>
            <Card className="p-0 overflow-hidden border-amber-100 shadow-sm border">
              <DataTable
                loading={false}
                data={pendingRequests}
                columns={[
                  {
                    key: "employee",
                    title: t("Employee"),
                    render: (row) => (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden">
                           {row.employee?.image ? <img src={row.employee.image} alt="" className="w-full h-full object-cover" /> : row.employee?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight text-sm">{row.employee.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{row.employee.employeeCode}</p>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "date",
                    title: t("Date"),
                    render: (row) => (
                      <div className="text-sm font-bold text-slate-700">
                        {format(new Date(row.date), "dd MMM, yyyy")}
                      </div>
                    ),
                  },
                  {
                    key: "times",
                    title: t("Requested Time"),
                    render: (row) => (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <span>{format(new Date(row.startTime), "hh:mm a")}</span>
                        <span className="text-slate-300">→</span>
                        <span>{format(new Date(row.endTime), "hh:mm a")}</span>
                      </div>
                    ),
                  },
                  {
                    key: "reason",
                    title: t("Reason"),
                    render: (row) => (
                      <div className="max-w-[200px] text-xs text-slate-500 italic truncate" title={row.reason}>
                        "{row.reason}"
                      </div>
                    ),
                  },
                  {
                    key: "actions",
                    title: t("Actions"),
                    render: (row) => (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(row)}
                          disabled={processing}
                          className="h-8 px-3 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all font-bold text-xs flex items-center gap-1.5 border border-emerald-100"
                        >
                          <CheckCircle size={14} /> {t("Approve")}
                        </button>
                        <button
                          onClick={() => openRejectModal(row)}
                          disabled={processing}
                          className="h-8 px-3 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all font-bold text-xs flex items-center gap-1.5 border border-rose-100"
                        >
                          <XCircle size={14} /> {t("Reject")}
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        )}

        <Card className="p-0 overflow-hidden border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder={t("Search by employee name or code...")} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl border-slate-200"
              />
            </div>
          </div>

          <DataTable
            loading={loading}
            data={filteredRecords}
            columns={[
              {
                key: "employee",
                title: t("Employee"),
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden">
                       {row.employee?.image ? <img src={row.employee.image} alt="" className="w-full h-full object-cover" /> : row.employee?.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm leading-none">{row.employee?.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{row.employee?.employeeCode}</p>
                    </div>
                  </div>
                )
              },
              {
                key: "date",
                title: t("Date"),
                render: (row) => format(new Date(row.date), "dd MMM. yyyy")
              },
              {
                key: "times",
                title: t("Break Time"),
                render: (row) => (
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <span className="text-xs">{format(new Date(row.startTime), "hh:mm a")}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-xs">{row.endTime ? format(new Date(row.endTime), "hh:mm a") : "--:--"}</span>
                  </div>
                )
              },
              {
                key: "duration",
                title: t("Duration"),
                render: (row) => {
                  const h = Math.floor(row.duration / 60);
                  const m = row.duration % 60;
                  return (
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-emerald-600 text-sm">
                        {h > 0 ? `${h}h ` : ""}{m}m
                      </span>
                    </div>
                  );
                }
              },
              {
                key: "actions",
                title: t("Actions"),
                render: (row) => (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(row)} className="p-2 text-slate-400 hover:text-brand-600 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              }
            ]}
          />
        </Card>

        <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedRecord ? t("Edit Break Record") : t("Add Break Record")}>
           <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t("Select Employee")}</label>
                <Combobox
                  options={employees.map(e => ({ id: e.id, name: `${e.name} (${e.employeeCode})` }))}
                  value={formData.employeeId}
                  onChange={(val) => setFormData({ ...formData, employeeId: val })}
                  disabled={!!selectedRecord}
                  placeholder={t("Select Employee...")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">{t("Start Time")}</label>
                    <Input 
                      type="datetime-local" 
                      value={formData.startTime} 
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      required 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium">{t("End Time")}</label>
                    <Input 
                      type="datetime-local" 
                      value={formData.endTime} 
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium">{t("Note")}</label>
                 <Input 
                  placeholder={t("Optional note...")} 
                  value={formData.note} 
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                 <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t("Cancel")}</Button>
                 <Button type="submit" disabled={saving}>{saving ? t("Saving...") : t("Save Record")}</Button>
              </div>
           </form>
        </Modal>


        {/* Reject Request Modal */}
        <Modal
          open={isRejectModalOpen}
          title={t("Reject Break Request")}
          onClose={() => setIsRejectModalOpen(false)}
        >
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <p className="text-sm font-medium text-rose-900">
                {t("You are rejecting the break request for <strong>{name}</strong> on {date}.", { name: selectedRequest?.employee?.name, date: selectedRequest && format(new Date(selectedRequest.date), "dd MMM, yyyy") })}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t("Rejection Reason (HR Note)")}</label>
              <Textarea
                placeholder={t("Provide a reason for rejection...")}
                value={hrNote}
                onChange={(e) => setHrNote(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)} disabled={processing}>
                {t("Cancel")}
              </Button>
              <Button variant="danger" className="shadow-lg shadow-rose-200" onClick={handleReject} disabled={processing}>
                {processing ? t("Processing...") : t("Confirm Rejection")}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ServiceGuard>
  );
}
