"use client";

import { useState } from "react";
import { 
  TrendingUp, 
  Search, 
  History, 
  UserPlus, 
  ChevronRight, 
  CheckCircle2, 
  XCircle,
  Plus,
  Filter
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { useTranslation } from "@/hooks/use-translation";
import { formatCurrency } from "@/utils/calculations";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDialog } from "@/components/ui/dialog-provider";
import { IncrementModal } from "./components/increment-modal";
import { HistoryModal } from "./components/history-modal";
import { FinancialSecurityGuard } from "@/components/shared/financial-security-guard";

export default function SalaryIncrementPage() {
  const { t } = useTranslation();
  const dialog = useDialog();
  const [tab, setTab] = useState<"ACTIVE" | "DEACTIVE">("ACTIVE");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<any>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const { data: employees, loading, refresh } = useAsyncData<any[]>(
    `/api/salary-increment?status=${tab}`,
    []
  );

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  const handleDeactivate = async (id: string) => {
    const ok = await dialog.confirm(t("Deactivate Employee"), t("Are you sure you want to move this employee to history? They will be marked as DEACTIVE."));
    if (!ok) return;

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success(t("Employee moved to history"));
        refresh();
      }
    } catch (err) {
      toast.error(t("Failed to deactivate"));
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "ACTIVE" })
      });
      if (res.ok) {
        toast.success(t("Employee restored to active list"));
        refresh();
      }
    } catch (err) {
      toast.error(t("Failed to activate"));
    }
  };

  return (
    <FinancialSecurityGuard>
      <div className="p-4 lg:p-6 space-y-6 w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              {t("Salary Increment Management")}
            </h1>
            <p className="text-slate-500 text-xs">{t("Track and manage employee salary evolution and increments")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => {
                setSelectedEmployees([]);
                setIsModalOpen(true);
              }}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 h-9 px-4 text-xs font-bold shadow-md shadow-brand-900/10"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              {t("Bulk Increment")}
            </Button>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setTab("ACTIVE")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition ${tab === "ACTIVE" ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t("Active Employees")}
            </button>
            <button
              onClick={() => setTab("DEACTIVE")}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${tab === "DEACTIVE" ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <History className="w-3.5 h-3.5" />
              {t("History (Deactive)")}
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input 
              placeholder={t("Search by name or ID...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 h-9 text-xs focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <Card className="p-4 rounded-2xl border-none bg-brand-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-900/10">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-brand-600/60">{t("Total Active")}</p>
                <h3 className="text-xl font-black text-brand-900">{employees.filter(e => e.status === "ACTIVE").length}</h3>
              </div>
           </Card>
        </div>

        {/* Main Table */}
        <Card className="rounded-2xl border-none shadow-lg shadow-slate-200/50 overflow-hidden bg-white">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      checked={selectedEmployees.length > 0 && selectedEmployees.length === filteredEmployees.length}
                      onChange={selectAll}
                    />
                  </th>
                  <th className="p-4 font-bold text-slate-500 uppercase tracking-widest text-[9px]">{t("Employee Details")}</th>
                  <th className="p-4 font-bold text-slate-500 uppercase tracking-widest text-[9px]">{t("Starting Salary")}</th>
                  <th className="p-4 font-bold text-slate-500 uppercase tracking-widest text-[9px]">{t("Increments")}</th>
                  <th className="p-4 font-bold text-slate-500 uppercase tracking-widest text-[9px]">{t("Current Salary")}</th>
                  <th className="p-4 font-bold text-slate-500 uppercase tracking-widest text-[9px] text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="p-4"><div className="h-10 bg-slate-100 rounded-xl w-full"></div></td>
                    </tr>
                  ))
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <TrendingUp className="w-10 h-10 text-slate-100" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">{t("No employees found.")}</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.map((emp) => {
                  const startSalary = emp.increments?.length > 0 
                    ? emp.increments[emp.increments.length - 1].oldSalary 
                    : emp.salaryStructure?.totalSalary || 0;
                  
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={() => toggleSelection(emp.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{emp.name}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{formatCurrency(startSalary)}</p>
                        <p className="text-[9px] text-slate-400 uppercase">{t("Joined")} {format(new Date(emp.joiningDate), "MMM yyyy")}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {emp.increments?.length === 0 ? (
                            <span className="text-[9px] text-slate-400 italic">{t("No increments yet")}</span>
                          ) : (
                            emp.increments.slice(0, 3).map((inc: any, idx: number) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-bold border border-emerald-100">
                                +{formatCurrency(inc.amount)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-black text-brand-600">{formatCurrency(emp.salaryStructure?.totalSalary || 0)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryEmployee(emp)}
                            className="rounded-lg h-7 px-2 hover:bg-slate-100 hover:text-slate-600 font-bold text-[9px] uppercase"
                          >
                            <History className="w-2.5 h-2.5 mr-1" />
                            {t("History")}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmployees([emp.id]);
                              setIsModalOpen(true);
                            }}
                            className="rounded-lg h-7 px-2 hover:bg-brand-50 hover:text-brand-600 font-bold text-[9px] uppercase"
                          >
                            <TrendingUp className="w-2.5 h-2.5 mr-1" />
                            {t("Increment")}
                          </Button>
                          
                          {tab === "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(emp.id)}
                              className="rounded-lg h-7 px-2 hover:bg-red-50 hover:text-red-600 font-bold text-[9px] uppercase"
                            >
                              <XCircle className="w-2.5 h-2.5 mr-1" />
                              {t("Deactivate")}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActivate(emp.id)}
                              className="rounded-lg h-7 px-2 hover:bg-emerald-50 hover:text-emerald-600 font-bold text-[9px] uppercase"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                              {t("Activate")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Sticky Selection Bar */}
        {selectedEmployees.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4 border border-white/10">
            <div className="flex items-center gap-2.5 border-r border-white/10 pr-6">
              <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center font-black text-sm">
                {selectedEmployees.length}
              </div>
              <p className="text-[11px] font-bold tracking-tight text-slate-300">{t("Selected")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="rounded-xl bg-brand-600 hover:bg-brand-700 font-black h-9 px-6 text-xs"
              >
                {t("Apply Bulk")}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setSelectedEmployees([])}
                className="rounded-xl hover:bg-white/10 text-white font-bold h-9 text-xs px-4"
              >
                {t("Cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* Modals */}
        {isModalOpen && (
          <IncrementModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              setSelectedEmployees([]);
              refresh();
            }}
            selectedIds={selectedEmployees}
            employees={employees}
          />
        )}

        {historyEmployee && (
          <HistoryModal 
            employee={historyEmployee}
            onClose={() => setHistoryEmployee(null)}
            onSuccess={() => {
              setHistoryEmployee(null);
              refresh();
            }}
          />
        )}
      </div>
    </FinancialSecurityGuard>
  );
}
