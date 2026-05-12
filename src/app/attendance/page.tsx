"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDialog } from "@/components/ui/dialog-provider";
import { Plus, Edit2, Trash2, RefreshCw, Search, Settings2, X, Copy, Cpu } from "lucide-react";
import { ServiceGuard } from "@/components/shared/service-guard";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const dialog = useDialog();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    employeeId: "",
    checkIn: "",
    checkOut: "",
    status: "PRESENT",
    note: "",
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState({
    defaultInTime: "09:00",
    defaultOutTime: "18:00",
    lateThresholdTime: "09:15",
    avgRequestTime: "09:00",
    halfDayThreshold: 420,
    weeklySchedule: [
      { day: "Saturday", enabled: true, inTime: "09:00", outTime: "18:00" },
      { day: "Sunday", enabled: true, inTime: "09:00", outTime: "18:00" },
      { day: "Monday", enabled: true, inTime: "09:00", outTime: "18:00" },
      { day: "Tuesday", enabled: true, inTime: "09:00", outTime: "18:00" },
      { day: "Wednesday", enabled: true, inTime: "09:00", outTime: "18:00" },
      { day: "Thursday", enabled: true, inTime: "09:00", outTime: "18:00" },
      { day: "Friday", enabled: false, inTime: "09:00", outTime: "18:00" },
    ] as any[],
    autoLeaveDeduction: true
  });


  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/attendance");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const to24h = (timeStr: string) => {
            if (!timeStr) return "09:00";
            if (!timeStr.includes(" ")) return timeStr;
            const [time, modifier] = timeStr.split(" ");
            let [hours, minutes] = time.split(":").map(Number);
            if (modifier === "PM" && hours < 12) hours += 12;
            if (modifier === "AM" && hours === 12) hours = 0;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          };

          const fetchedInTime = to24h(data.defaultInTime);
          const fetchedLateTime = to24h(data.lateThresholdTime || "09:15 AM");

          const inMins = parseInt(fetchedInTime.split(":")[0]) * 60 + parseInt(fetchedInTime.split(":")[1]);
          const lateMins = parseInt(fetchedLateTime.split(":")[0]) * 60 + parseInt(fetchedLateTime.split(":")[1]);
          
          let finalLateTime = fetchedLateTime;
          if (lateMins < inMins) {
            const totalMins = inMins + 15;
            const h = Math.floor(totalMins / 60) % 24;
            const m = totalMins % 60;
            finalLateTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          }

          const defaultSchedule = [
            { day: "Saturday", enabled: true, inTime: "09:00", outTime: "18:00" },
            { day: "Sunday", enabled: true, inTime: "09:00", outTime: "18:00" },
            { day: "Monday", enabled: true, inTime: "09:00", outTime: "18:00" },
            { day: "Tuesday", enabled: true, inTime: "09:00", outTime: "18:00" },
            { day: "Wednesday", enabled: true, inTime: "09:00", outTime: "18:00" },
            { day: "Thursday", enabled: true, inTime: "09:00", outTime: "18:00" },
            { day: "Friday", enabled: false, inTime: "09:00", outTime: "18:00" },
          ];

          const fetchedSchedule = (data.weeklySchedule && Array.isArray(data.weeklySchedule) && data.weeklySchedule.length > 0)
            ? data.weeklySchedule.map((s: any) => ({
                ...s,
                inTime: to24h(s.inTime),
                outTime: to24h(s.outTime),
                intervals: Array.isArray(s.intervals) ? s.intervals.map((int: any) => ({
                  inTime: to24h(int.inTime),
                  outTime: to24h(int.outTime)
                })) : [{ inTime: to24h(s.inTime), outTime: to24h(s.outTime) }]
              }))
            : defaultSchedule;

          setSettings({
            defaultInTime: fetchedInTime,
            defaultOutTime: to24h(data.defaultOutTime),
            lateThresholdTime: finalLateTime,
            avgRequestTime: data.avgRequestTime || "09:00",
            halfDayThreshold: data.halfDayThreshold || 420,
            weeklySchedule: fetchedSchedule,
            autoLeaveDeduction: data.autoLeaveDeduction ?? true
          });
        }
      }
    } catch (e: any) {
      console.error("Fetch Settings Error:", e.message);
    }
  };

  const fetchAttendance = useCallback(async (selectedDate: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      const data = await res.json();
      setAttendances(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };


  useEffect(() => {
    fetchAttendance(date);
  }, [date, fetchAttendance]);

  const syncAttendance = async () => {
    setSyncing(true);
    try {
      // 1. Check for ADMS devices
      const devicesRes = await fetch("/api/attendance/devices");
      const devices = await devicesRes.json();
      const hasADMS = Array.isArray(devices) && devices.some(d => d.serialNumber);

      if (hasADMS) {
        dialog.alert(t("Automatic Sync"), t("Your biometric devices are in ADMS (Cloud) mode. They push attendance data automatically. If you don't see your data, please wait a few seconds and refresh."));
        fetchAttendance(date);
      } else {
        // Legacy Sync Agent Logic
        const res = await fetch("/api/attendance/sync-device", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          dialog.alert(t("Success"), t("Synced {count} records successfully.", { count: data.summary?.synced || 0 }));
          fetchAttendance(date);
        } else {
          dialog.alert(t("Error"), t("Failed to sync attendance from device. Check your local sync agent."));
        }
      }
    } catch (e: any) {
      dialog.alert(t("Error"), e.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchSettings();
  }, []);

  const getDayDefaultTimes = () => {
    const parts = date.split("-");
    const yearNum = parseInt(parts[0]);
    const monthNum = parseInt(parts[1]) - 1;
    const dayNum = parseInt(parts[2]);
    const d = new Date(yearNum, monthNum, dayNum);
    const dayName = format(d, "EEEE");

    const dayConfig = settings.weeklySchedule.find(s => s.day === dayName);
    
    let inTime = settings.defaultInTime;
    let outTime = settings.defaultOutTime;

    if (dayConfig && dayConfig.enabled) {
      inTime = dayConfig.inTime;
      outTime = dayConfig.outTime;
    }

    const [inH, inM] = inTime.split(":").map(Number);
    const [outH, outM] = outTime.split(":").map(Number);

    const defaultIn = format(new Date(yearNum, monthNum, dayNum, inH || 9, inM || 0, 0), "yyyy-MM-dd'T'HH:mm");
    const defaultOut = format(new Date(yearNum, monthNum, dayNum, outH || 18, outM || 0, 0), "yyyy-MM-dd'T'HH:mm");

    return { defaultIn, defaultOut };
  };

  const openNewModal = () => {
    const { defaultIn, defaultOut } = getDayDefaultTimes();
    setSelectedRecord(null);
    setFormData({ 
      employeeId: "", 
      checkIn: defaultIn, 
      checkOut: defaultOut, 
      status: "PRESENT", 
      note: "" 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: any) => {
    setSelectedRecord(record);
    const { defaultIn, defaultOut } = getDayDefaultTimes();

    const checkInTime = record.checkIn ? format(new Date(record.checkIn), "yyyy-MM-dd'T'HH:mm") : defaultIn;
    const checkOutTime = record.checkOut ? format(new Date(record.checkOut), "yyyy-MM-dd'T'HH:mm") : defaultOut;
    
    setFormData({
      employeeId: record.employeeId,
      checkIn: checkInTime,
      checkOut: checkOutTime,
      status: record.status,
      note: record.note || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      dialog.alert("Error", "Please select an employee.");
      return;
    }
    setSaving(true);
    try {
      const requestData = { ...formData, isManual: true };
      if (formData.checkIn) requestData.checkIn = new Date(formData.checkIn).toISOString();
      if (formData.checkOut) requestData.checkOut = new Date(formData.checkOut).toISOString();

      let res;
      if (selectedRecord && selectedRecord.id) {
        res = await fetch(`/api/attendance/${selectedRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        });
      } else {
        res = await fetch(`/api/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestData, date }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save record");
      }

      setIsModalOpen(false);
      fetchAttendance(date);
    } catch (error: any) {
       console.error(error);
       dialog.alert("Error", error.message || "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await dialog.danger("Delete Record?", "Are you sure you want to delete this attendance record?");
    if (!confirmed) return;
    
    try {
      await fetch(`/api/attendance/${id}`, { method: "DELETE" });
      fetchAttendance(date);
    } catch (error) {
      console.error(error);
    }
  };

  const markPresent = async (record: any) => {
    try {
      setLoading(true);
      const { defaultIn, defaultOut } = getDayDefaultTimes();
      const checkInDate = new Date(defaultIn);
      const checkOutDate = new Date(defaultOut);

      await fetch(`/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          employeeId: record.employeeId, 
          date, 
          checkIn: checkInDate.toISOString(),
          checkOut: checkOutDate.toISOString(),
          status: "PRESENT", 
          isManual: true 
        }),
      });
      fetchAttendance(date);
    } catch (error) {
       console.error(error);
       dialog.alert("Error", "Failed to mark attendance.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    const inMins = parseInt(settings.defaultInTime.split(":")[0]) * 60 + parseInt(settings.defaultInTime.split(":")[1]);
    const lateMins = parseInt(settings.lateThresholdTime.split(":")[0]) * 60 + parseInt(settings.lateThresholdTime.split(":")[1]);

    if (lateMins < inMins) {
      dialog.alert("Validation Error", "Late threshold must be after office entry time.");
      return;
    }

    setSavingSettings(true);
    try {
      const formatToAMPM = (time24: string) => {
        let [hours, minutes] = time24.split(":").map(Number);
        const modifier = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${modifier}`;
      };

      const payload = {
        ...settings,
        defaultInTime: formatToAMPM(settings.defaultInTime),
        defaultOutTime: formatToAMPM(settings.defaultOutTime),
        lateThresholdTime: formatToAMPM(settings.lateThresholdTime),
        weeklySchedule: settings.weeklySchedule.map(s => ({
          ...s,
          inTime: formatToAMPM(s.inTime),
          outTime: formatToAMPM(s.outTime)
        }))
      };

      const res = await fetch("/api/settings/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        dialog.alert("Success", "Attendance settings updated.");
        setIsSettingsOpen(false);
        fetchAttendance(date); 
      } else {
        const errorData = await res.json();
        dialog.alert("Error", `${errorData.message}: ${errorData.error || "Unknown error"}`);
      }
    } catch (error: any) {
      dialog.alert("Error", `Network error: ${error.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const statusColors: any = {
    PRESENT: "bg-emerald-100 text-emerald-800",
    ABSENT: "bg-red-100 text-red-800",
    LATE: "bg-amber-100 text-amber-800",
    HALF_DAY: "bg-orange-100 text-orange-800",
  };

  const summary = {
    total: attendances.length,
    present: attendances.filter(a => a.status === "PRESENT").length,
    late: attendances.filter(a => a.status === "LATE").length,
    absent: attendances.filter(a => a.status === "ABSENT").length,
  };

  return (
    <ServiceGuard id="attendance">
      <div className="space-y-6">
        <PageHeader
          title={t("Attendance Tracking")}
          subtitle={t("View and manage daily attendance records")}
          actions={
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={syncAttendance} disabled={syncing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> 
                {syncing ? t("Syncing...") : t("Sync Now")}
              </Button>
              <Link href={typeof window !== "undefined" ? `/${window.location.pathname.split('/')[1]}/attendance/setup` : "/attendance/setup"}>
                <Button variant="secondary">
                  <Cpu className="mr-2 h-4 w-4" /> {t("Attendance Device Setup")}
                </Button>
              </Link>
              <Button variant="secondary" onClick={() => setIsSettingsOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" /> {t("Attendance Settings")}
              </Button>
              <Button onClick={openNewModal}>
                <Plus className="mr-2 h-4 w-4" /> {t("Manual Entry")}
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-slate-50/50">
            <p className="text-sm font-medium text-slate-500">{t("Total Employees")}</p>
            <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
          </Card>
          <Card className="p-4 bg-emerald-50/50">
            <p className="text-sm font-medium text-emerald-600">{t("Present Today")}</p>
            <p className="text-2xl font-bold text-emerald-700">{summary.present}</p>
          </Card>
          <Card className="p-4 bg-amber-50/50">
            <p className="text-sm font-medium text-amber-600">{t("Late Today")}</p>
            <p className="text-2xl font-bold text-amber-700">{summary.late}</p>
          </Card>
          <Card className="p-4 bg-red-50/50">
            <p className="text-sm font-medium text-red-600">{t("Absent Today")}</p>
            <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
          </Card>
        </div>

        <Card className="p-0 overflow-visible">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">{t("Attendance Date:")}</span>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-40 h-9"
              />
            </div>

            <div className="flex-1 max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder={t("Search by name or ID...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 rounded-xl border-slate-200"
              />
            </div>

            <div className="flex gap-2 text-sm font-bold uppercase tracking-widest text-[9px]">
              <button 
                onClick={() => setStatusFilter("ALL")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border ${statusFilter === "ALL" ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'text-slate-400 border-slate-100 hover:border-slate-300'}`}
              >
                {t("All")} ({summary.total})
              </button>
              <button 
                onClick={() => setStatusFilter("PRESENT")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border ${statusFilter === "PRESENT" ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'text-slate-400 border-slate-100 hover:border-emerald-200 hover:text-emerald-600'}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusFilter === "PRESENT" ? 'bg-white' : 'bg-emerald-500'}`}></span> {t("Present")} ({summary.present})
              </button>
              <button 
                onClick={() => setStatusFilter("LATE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border ${statusFilter === "LATE" ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'text-slate-400 border-slate-100 hover:border-amber-200 hover:text-amber-600'}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusFilter === "LATE" ? 'bg-white' : 'bg-amber-500'}`}></span> {t("Late")} ({summary.late})
              </button>
              <button 
                onClick={() => setStatusFilter("ABSENT")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border ${statusFilter === "ABSENT" ? 'bg-red-600 text-white border-red-600 shadow-md' : 'text-slate-400 border-slate-100 hover:border-red-200 hover:text-red-600'}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusFilter === "ABSENT" ? 'bg-white' : 'bg-red-500'}`}></span> {t("Absent")} ({summary.absent})
              </button>
            </div>
          </div>

          <DataTable
            data={attendances.filter(a => {
              const matchesSearch = a.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                   a.employee?.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
              const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
              return matchesSearch && matchesStatus;
            })}
            loading={loading}
            columns={[
               { 
                 key: "employeeCode", 
                 title: t("ID"),
                 render: (row: any) => row.employee?.employeeCode || "-"
               },
               { 
                 key: "name", 
                 title: t("Employee Name"),
                 render: (row: any) => (
                   <div>
                      <p className="font-medium">{row.employee?.name || "-"}</p>
                      <p className="text-xs text-slate-500">{row.employee?.designation}</p>
                   </div>
                 )
               },
               { 
                 key: "checkIn", 
                 title: t("Check In"), 
                 render: (row: any) => row.checkIn ? format(new Date(row.checkIn), "hh:mm a") : "-" 
               },
               { 
                 key: "checkOut", 
                 title: t("Check Out"), 
                 render: (row: any) => row.checkOut ? format(new Date(row.checkOut), "hh:mm a") : "-" 
               },
               {
                 key: "status",
                 title: t("Status"),
                 render: (row: any) => (
                   <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[row.status] || statusColors.PRESENT}`}>
                        {t(row.status)}
                      </span>
                      {row.status === "ABSENT" && (
                        <button 
                          className="h-7 px-3 py-0 text-[10px] uppercase tracking-wider rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          onClick={() => markPresent(row)}
                        >
                          {t("Present")}
                        </button>
                      )}
                   </div>
                 )
               },
               {
                 key: "actions",
                 title: t("Actions"),
                 render: (row: any) => (
                   <div className="flex items-center gap-1">
                     <button 
                       onClick={() => openEditModal(row)} 
                       className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-50 transition-all"
                       title={t("Edit")}
                     >
                       <Edit2 size={18} />
                     </button>
                     {row.id && (
                       <button 
                         onClick={() => handleDelete(row.id)} 
                         className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-50 transition-all"
                         title={t("Delete")}
                       >
                         <Trash2 size={18} />
                       </button>
                     )}
                   </div>
                 )
               }
            ]}
          />
        </Card>

        <Modal open={isModalOpen} onClose={() => !saving && setIsModalOpen(false)} title={selectedRecord ? t("Edit Attendance") : t("Manual Attendance")}>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t("Employee")}</label>
              <Select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                disabled={!!selectedRecord}
                required
              >
                <option value="">{t("Select Employee")}</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.employeeCode} - {emp.name}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t("Check In Time")}</label>
                <Input
                  type="datetime-local"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t("Check Out Time")}</label>
                <Input
                  type="datetime-local"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t("Status")}</label>
              <Select
                 value={formData.status}
                 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                 required
              >
                 <option value="PRESENT">{t("PRESENT")}</option>
                 <option value="ABSENT">{t("ABSENT")}</option>
                 <option value="LATE">{t("LATE")}</option>
                 <option value="HALF_DAY">{t("HALF_DAY")}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t("Note (Optional)")}</label>
              <Input
                placeholder={t("Reason for manual entry or status")}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>{t("Cancel")}</Button>
              <Button type="submit" disabled={saving}>{saving ? t("Saving...") : t("Save Record")}</Button>
            </div>
          </form>
        </Modal>

        <Modal 
          open={isSettingsOpen} 
          onClose={() => !savingSettings && setIsSettingsOpen(false)} 
          title={t("Attendance Configuration")}
          size="xl"
        >
          <div className="pt-2 pb-6 space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between px-2">
              <div className="space-y-1">
                <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em]">{t("Weekly Office Schedule")}</h3>
                <p className="text-[10px] text-slate-400 font-bold">{t("Configure daily shifts and operational hours.")}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t("Avg. Daily Hours")}</p>
                <p className="text-sm font-black text-slate-900 leading-none">
                  {(() => {
                    const enabledDays = (settings.weeklySchedule || []).filter(s => s.enabled);
                    if (enabledDays.length === 0) return "0h 0m";
                    let totalMins = 0;
                    enabledDays.forEach(s => {
                      const intervals = Array.isArray(s.intervals) ? s.intervals : [{ inTime: s.inTime, outTime: s.outTime }];
                      intervals.forEach((int: any) => {
                        const inM = parseInt(int.inTime.split(":")[0]) * 60 + parseInt(int.inTime.split(":")[1]);
                        const outM = parseInt(int.outTime.split(":")[0]) * 60 + parseInt(int.outTime.split(":")[1]);
                        totalMins += (outM - inM);
                      });
                    });
                    const avgMins = totalMins / enabledDays.length;
                    return `${Math.floor(avgMins / 60)}h ${Math.round(avgMins % 60)}m`;
                  })()}
                </p>
              </div>
            </div>

            {/* Days List - Multi Interval Builder */}
            <div className="space-y-4 px-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {(settings.weeklySchedule || []).map((dayData, dIdx) => {
                const intervals = Array.isArray(dayData.intervals) ? dayData.intervals : [{ inTime: dayData.inTime, outTime: dayData.outTime }];
                
                return (
                  <div key={dayData.day} className="space-y-2">
                    <div className="flex items-start gap-4">
                      {/* Day Circle */}
                      <button 
                        type="button"
                        onClick={() => {
                          const newSchedule = [...settings.weeklySchedule];
                          newSchedule[dIdx].enabled = !newSchedule[dIdx].enabled;
                          setSettings({ ...settings, weeklySchedule: newSchedule });
                        }}
                        className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-full font-black text-sm transition-all ${dayData.enabled ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}
                      >
                        {t(dayData.day).charAt(0)}
                      </button>

                      {/* Intervals List */}
                      <div className="flex-1 space-y-2">
                        {dayData.enabled ? (
                          <>
                            {intervals.map((int: any, iIdx: number) => (
                              <div key={iIdx} className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-200">
                                <div className="flex-1 flex items-center gap-3 bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
                                  <div className="flex-1 flex items-center gap-2 px-2 py-1.5 bg-slate-50/50 rounded-xl">
                                    <input 
                                      type="time" value={int.inTime} 
                                      onChange={(e) => {
                                        const newSchedule = [...settings.weeklySchedule];
                                        const newIntervals = [...intervals];
                                        newIntervals[iIdx].inTime = e.target.value;
                                        newSchedule[dIdx].intervals = newIntervals;
                                        setSettings({ ...settings, weeklySchedule: newSchedule });
                                      }}
                                      className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none w-full"
                                    />
                                  </div>
                                  <span className="text-slate-300 font-bold text-xs">-</span>
                                  <div className="flex-1 flex items-center gap-2 px-2 py-1.5 bg-slate-50/50 rounded-xl">
                                    <input 
                                      type="time" value={int.outTime} 
                                      onChange={(e) => {
                                        const newSchedule = [...settings.weeklySchedule];
                                        const newIntervals = [...intervals];
                                        newIntervals[iIdx].outTime = e.target.value;
                                        newSchedule[dIdx].intervals = newIntervals;
                                        setSettings({ ...settings, weeklySchedule: newSchedule });
                                      }}
                                      className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none w-full"
                                    />
                                  </div>
                                </div>

                                {/* Row Actions */}
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => {
                                      const newSchedule = [...settings.weeklySchedule];
                                      newSchedule[dIdx].enabled = false;
                                      setSettings({ ...settings, weeklySchedule: newSchedule });
                                    }}
                                    className="h-8 w-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title={t("Delete/Mark as Holiday")}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="flex items-center gap-3">
                            <p className="text-[11px] font-bold text-slate-400 italic ml-2">{t("Unavailable (Weekend/Holiday)")}</p>
                            <button 
                              onClick={() => {
                                const newSchedule = [...settings.weeklySchedule];
                                newSchedule[dIdx].enabled = true;
                                if (!newSchedule[dIdx].intervals || newSchedule[dIdx].intervals.length === 0) {
                                  newSchedule[dIdx].intervals = [{ inTime: "09:00", outTime: "18:00" }];
                                }
                                setSettings({ ...settings, weeklySchedule: newSchedule });
                              }}
                              className="h-8 w-8 flex items-center justify-center text-indigo-400 hover:bg-indigo-50 rounded-xl transition-all"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rules Section - Compact */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{t("Late & Half-Day Rules")}</h4>
                <div className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-100">{t("AI Logic")}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t("Late Threshold")}</label>
                  <Input
                    type="time"
                    value={settings.lateThresholdTime}
                    onChange={(e) => setSettings({ ...settings, lateThresholdTime: e.target.value })}
                    className="h-10 rounded-xl border-slate-100 bg-slate-50 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t("Half-Day Threshold (Hours)")}</label>
                  <Input 
                    type="number"
                    step="0.5"
                    value={settings.halfDayThreshold / 60}
                    onChange={(e) => setSettings({ ...settings, halfDayThreshold: Math.round(parseFloat(e.target.value) * 60) || 0 })}
                    className="h-10 rounded-xl border-slate-100 bg-slate-50 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 flex gap-3">
              <Button 
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 font-black shadow-lg shadow-indigo-100"
              >
                {savingSettings ? t("Updating System...") : t("Apply Configuration")}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setIsSettingsOpen(false)} 
                className="px-6 text-slate-400 hover:text-slate-600 rounded-2xl h-12 font-bold"
              >
                {t("Cancel")}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ServiceGuard>
  );
}
