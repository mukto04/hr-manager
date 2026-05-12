"use client";

import { useMemo, useState, useEffect } from "react";
import { Pencil, Cpu, Trash2, Minus, Printer, Eye, History, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { LeaveBalance, ModalMode } from "@/types";
import { Switch } from "@/components/ui/switch";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { useEmployees } from "@/modules/shared/use-employees";
import { sendJson } from "@/lib/http";
import { LeaveForm } from "./leave-form";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { Select } from "@/components/ui/select";
import { useDialog } from "@/components/ui/dialog-provider";
import { useTranslation } from "@/hooks/use-translation";

export function LeavesClient() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const leaves = useAsyncData<LeaveBalance[]>(`/api/leaves?year=${selectedYear}`, []);
  const employees = useEmployees();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("edit");
  const [selected, setSelected] = useState<LeaveBalance | undefined>();
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [genAmount, setGenAmount] = useState(0);
  const [overwrite, setOverwrite] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deductData, setDeductData] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: "",
    amount: 1,
    note: ""
  });
  const dialog = useDialog();
  const settings = useAsyncData<any>("/api/settings/attendance", null);
  const { t } = useTranslation();

  const fetchHistory = async (empId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/leaves/history?employeeId=${empId}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeduct = async () => {
    if (!selected) return;
    try {
      setGenerating(true);
      const res = await fetch("/api/leaves/deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...deductData,
          employeeId: selected.employeeId
        })
      });

      if (res.ok) {
        setShowDeductModal(false);
        leaves.refresh();
        dialog.alert(t("Success"), t("Leave deducted successfully."));
      } else {
        const err = await res.json();
        dialog.alert(t("Error"), err.message);
      }
    } catch (e: any) {
      dialog.alert(t("Error"), e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    const ok = await dialog.danger(t("Refund this leave?"), t("This will delete the record and add the days back to the employee's balance."));
    if (!ok) return;

    try {
      const res = await fetch(`/api/leaves/history?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selected) fetchHistory(selected.employeeId);
        leaves.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };



  const filtered = useMemo(() => {
    return leaves.data.filter((item) =>
      (item.employee?.name || "").toLowerCase().includes(query.toLowerCase())
    );
  }, [leaves.data, query]);

  async function deductOne(item: LeaveBalance) {
    if (item.dueLeave <= 0) {
      const ok = await dialog.danger(t("Are you sure?"), <p className="text-sm text-slate-600">{t("This employee has 0 due leave. Do you still want to deduct 1 day?")}</p>);
      if (!ok) return;
    }
    try {
      await sendJson(`/api/leaves/${item.id}`, "PUT", {
        employeeId: item.employeeId,
        year: item.year,
        totalLeave: item.totalLeave,
        dueLeave: item.dueLeave - 1
      });
      await leaves.refresh();
    } catch (e: any) {
      dialog.alert(t("Error"), e.message || t("Failed to deduct leave."));
    }
  }

  async function handleBulkGenerate() {
    try {
      setGenerating(true);
      const res = await sendJson<{ message: string }>("/api/leaves/bulk", "POST", {
        year: genYear,
        defaultAmount: genAmount,
        overwrite: overwrite
      });
      
      setShowGenerateModal(false);
      dialog.alert(t("Success"), res.message || t("Leave balances generated successfully."));
      await leaves.refresh();
    } catch (e: any) {
      dialog.alert(t("Error"), e.message || t("Failed to generate leave balances."));
    } finally {
      setGenerating(false);
    }
  }

  async function submit(payload: Record<string, unknown>) {
    try {
      if (selected) {
        await sendJson(`/api/leaves/${selected.id}`, "PUT", payload);
      }
      setOpen(false);
      setSelected(undefined);
      await leaves.refresh();
    } catch (e: any) {
      dialog.alert(t("Error"), e.message || t("Failed to save leave balance."));
    }
  }

  async function handleToggleDeduction() {
    try {
      const newVal = !settings.data?.autoLeaveDeduction;
      await sendJson("/api/settings/attendance", "PUT", {
        ...settings.data,
        autoLeaveDeduction: newVal
      });
      await settings.refresh();
      dialog.alert(t("Success"), t("Deduction mode switched to {mode}.", { mode: newVal ? t("Automatic") : t("Manual") }));
    } catch (e: any) {
      dialog.alert(t("Error"), e.message || t("Failed to update settings."));
    }
  }

  useEffect(() => {
    if (settings.data?.autoLeaveDeduction && !leaves.loading) {
      fetch(`/api/leaves/sync-absent?month=${new Date().getMonth() + 1}&year=${selectedYear}`, {
        method: "POST"
      }).then(res => {
        if (res.ok) leaves.refresh();
      }).catch(console.error);
    }
  }, [settings.data?.autoLeaveDeduction, selectedYear]);

  async function remove(item: LeaveBalance) {
    const ok = await dialog.danger(
      t("Delete this leave balance?"),
      <p className="text-sm text-slate-600">{t("This will permanently remove")} <strong>{item.employee?.name}</strong>{t("'s leave record for")} {item.year}.</p>
    );
    if (!ok) return;
    await sendJson(`/api/leaves/${item.id}`, "DELETE");
    await leaves.refresh();
  }

  if (leaves.loading || employees.loading) return <LoadingState />;
  if (leaves.error) return <ErrorState message={leaves.error} />;
  if (employees.error) return <ErrorState message={employees.error} />;

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Leave Balance")}
        subtitle={t("Track leave totals and due leave for each employee.")}
        actions={
          <div className="flex items-center gap-3 print:hidden">
            <div className="flex items-center gap-4 px-5 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm mr-2">
               <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{t("Leave Deduction")}</span>
                  <span className={`text-xs font-black uppercase leading-tight ${settings.data?.autoLeaveDeduction ? 'text-brand-600' : 'text-slate-500'}`}>
                    {settings.data?.autoLeaveDeduction ? t("Automatic") : t("Manual")}
                  </span>
               </div>
               <Switch 
                 checked={settings.data?.autoLeaveDeduction}
                 onCheckedChange={handleToggleDeduction}
               />
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

            <Button variant="secondary" onClick={() => window.print()} className="h-11 px-5">
              <Printer className="mr-2 h-4 w-4" /> 
              {t("Print")}
            </Button>
            <Button onClick={() => setShowGenerateModal(true)} className="h-11 px-5 shadow-lg shadow-brand-900/10">
              <Cpu className="mr-2 h-4 w-4" /> 
              {t("Generate")}
            </Button>
          </div>
        }
      />

      <div className="print:hidden">
        <SearchFilterBar 
          value={query} 
          onChange={setQuery} 
          placeholder={t("Search by employee name...")} 
          rightSlot={
            <div className="w-32">
              <Select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
          }
        />
      </div>

      <DataTable
        data={filtered}
        columns={[
          { key: "employee", title: t("Employee"), render: (row) => row.employee?.name || "-" },
          { key: "year", title: t("Year"), render: (row) => <span className="font-semibold">{row.year}</span> },
          { key: "totalLeave", title: t("Total Leave"), render: (row) => row.totalLeave },
          { 
            key: "dueLeave", 
            title: t("Due Leave"), 
            render: (row) => {
              if (row.dueLeave < 0) {
                return (
                  <span className="text-rose-600 font-medium whitespace-nowrap">
                    {row.dueLeave} <span className="text-xs">({Math.abs(row.dueLeave)} {t("extra")})</span>
                  </span>
                );
              }
              return row.dueLeave;
            } 
          },
          {
            key: "actions",
            title: t("Actions"),
            render: (row) => (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="h-9 px-3 text-rose-700 border-rose-200 hover:bg-rose-100 font-bold" 
                  onClick={() => {
                    setSelected(row);
                    setDeductData({ fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0], amount: 0.5, note: "" });
                    setShowDeductModal(true);
                  }}
                  title={t("Deduct Leave")}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button variant="secondary" className="h-9 px-3" onClick={() => { setSelected(row); fetchHistory(row.employeeId); setShowHistoryModal(true); }} title={t("View History")}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="secondary" className="h-9 px-3" onClick={() => { setMode("edit"); setSelected(row); setOpen(true); }} title={t("Edit")}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="danger" className="h-9 px-3" onClick={() => remove(row)} title={t("Delete")}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          }
        ]}
      />

      <Modal
        open={open}
        title={t("Edit Leave Balance")}
        onClose={() => setOpen(false)}
      >
        <LeaveForm employees={employees.data} initialData={selected} onSubmit={submit} onCancel={() => setOpen(false)} />
      </Modal>

      <Modal
        open={showGenerateModal}
        title={t("Generate Annual Leave Balances")}
        onClose={() => setShowGenerateModal(false)}
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-500">
            {t("This will create leave balance records for all active employees who don't have one for the selected year.")}
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t("Target Year")}</label>
              <Select value={genYear} onChange={(e) => setGenYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t("Default Leave Count")}</label>
              <Input 
                type="number" 
                value={genAmount} 
                onChange={(e) => setGenAmount(Number(e.target.value))}
                placeholder={t("e.g. 10")}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
            <input 
              type="checkbox" 
              id="overwrite"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <label htmlFor="overwrite" className="text-sm font-bold text-red-900 cursor-pointer">
              {t("Overwrite existing balances for")} {genYear}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowGenerateModal(false)}>{t("Cancel")}</Button>
            <Button onClick={handleBulkGenerate} disabled={generating}>
              {generating ? t("Generating...") : t("Generate for All")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave History Modal */}
      <Modal 
        open={showHistoryModal} 
        onClose={() => setShowHistoryModal(false)} 
        title={`${selected?.employee?.name}'s ${t("Leave History")}`}
        size="4xl"
      >
        <div className="space-y-4 pt-4">
          <DataTable
            noCard
            loading={loadingHistory}
            data={history}
            columns={[
              { 
                key: "date", 
                title: t("Date"), 
                render: (row) => (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{new Date(row.date).toLocaleDateString()}</span>
                    {row.toDate && (
                      <span className="text-[10px] text-slate-400">{t("to")} {new Date(row.toDate).toLocaleDateString()}</span>
                    )}
                  </div>
                )
              },
              { 
                key: "amount", 
                title: t("Amount"), 
                render: (row) => (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.type === 'DEDUCTION' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {row.type === 'DEDUCTION' ? '-' : '+'}{row.amount} {t("Day")}
                  </span>
                )
              },
              { key: "note", title: t("Note"), render: (row: any) => <span className="text-xs text-slate-500 italic">{row.note ? t(row.note) : "-"}</span> },
              {
                key: "actions",
                title: t("Actions"),
                render: (row) => (
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteHistory(row.id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )
              }
            ]}
          />
          <div className="flex justify-end pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>{t("Close")}</Button>
          </div>
        </div>
      </Modal>

      {/* Deduct Leave Modal (Range Support) */}
      <Modal
        open={showDeductModal}
        onClose={() => setShowDeductModal(false)}
        title={`${t("Deduct Leave")} ${selected?.employee?.name ? `for ${selected.employee.name}` : ''}`}
      >
        <div className="space-y-6 pt-4">
           <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 flex items-start gap-4">
              <div className="p-2 bg-white rounded-xl shadow-sm text-brand-600">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-brand-900 uppercase tracking-tight">{t("Deducting")} {deductData.amount} {deductData.amount > 1 ? t("Days") : t("Day")}</h4>
                <p className="text-[10px] text-brand-600 font-medium">{t("LEAVE DEDUCTION WILL BE RECORDED FOR")} {selectedYear}</p>
              </div>
           </div>

           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t("From Date")}</label>
                  <Input 
                    type="date" 
                    value={deductData.fromDate} 
                    onChange={(e) => {
                      const newFromDate = e.target.value;
                      let newToDate = deductData.toDate;
                      if (newFromDate && deductData.amount >= 1 && deductData.amount % 1 === 0) {
                        const start = new Date(newFromDate);
                        start.setDate(start.getDate() + (deductData.amount - 1));
                        newToDate = start.toISOString().split('T')[0];
                      } else if (deductData.amount === 0.5) {
                        newToDate = newFromDate;
                      }
                      setDeductData({ ...deductData, fromDate: newFromDate, toDate: newToDate });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t("To Date (Optional)")}</label>
                  <Input 
                    type="date" 
                    value={deductData.toDate} 
                    onChange={(e) => {
                      const newToDate = e.target.value;
                      let newAmount = deductData.amount;
                      if (deductData.fromDate && newToDate) {
                        const start = new Date(deductData.fromDate);
                        const end = new Date(newToDate);
                        const diffTime = end.getTime() - start.getTime();
                        if (diffTime >= 0) {
                          newAmount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        }
                      }
                      setDeductData({ ...deductData, toDate: newToDate, amount: newAmount });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t("Total Days to Deduct")}</label>
                 <Input 
                   type="number"
                   step="0.5"
                   min="0.5"
                   value={deductData.amount}
                   onChange={(e) => {
                     const newAmount = parseFloat(e.target.value) || 0;
                     let newToDate = deductData.toDate;
                     if (deductData.fromDate && newAmount >= 1 && newAmount % 1 === 0) {
                        const start = new Date(deductData.fromDate);
                        start.setDate(start.getDate() + (newAmount - 1));
                        newToDate = start.toISOString().split('T')[0];
                     } else if (newAmount === 0.5) {
                        newToDate = deductData.fromDate;
                     }
                     setDeductData({ ...deductData, amount: newAmount, toDate: newToDate });
                   }}
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t("Note (Optional)")}</label>
                 <textarea 
                   className="w-full h-24 p-3 text-sm bg-slate-50 border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 transition-all outline-none"
                   placeholder={t("Ex: Family emergency, Sick leave...")}
                   value={deductData.note}
                   onChange={(e) => setDeductData({ ...deductData, note: e.target.value })}
                 />
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" onClick={() => setShowDeductModal(false)}>{t("Cancel")}</Button>
              <Button onClick={handleDeduct} disabled={generating} className="bg-brand-600 hover:bg-brand-700">
                {generating ? t("Processing...") : t("Confirm Deduction")}
              </Button>
           </div>
        </div>
      </Modal>


      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: A4; 
            margin: 0; /* Remove browser header/footer (Date, URL) */
          }
          body { 
            background: white !important; 
            font-size: 12pt; 
            padding: 20mm; /* Add back margin internally */
          }
          .print\:hidden { display: none !important; }
          
          /* Hide Sidebar and other UI elements */
          aside, nav, header, .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          
          /* Format Table */
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #e2e8f0 !important; }
          th, td { border: 1px solid #e2e8f0 !important; padding: 8px !important; text-align: left !important; }
          th { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
          
          /* Hide the last column (Actions) */
          th:last-child, td:last-child { display: none !important; }

          /* Title formatting */
          h1 { font-size: 24pt !important; margin-bottom: 5mm !important; }
          p { margin-bottom: 5mm !important; }
        }
      `}} />
    </div>
  );
}
