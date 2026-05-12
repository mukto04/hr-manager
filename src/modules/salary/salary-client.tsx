"use client";

import { useMemo, useState, useEffect } from "react";
import { Pencil, Plus, Trash2, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { SalaryStructure } from "@/types";
import { useAsyncData } from "@/modules/shared/use-async-data";
import Link from "next/link";
import { sendJson } from "@/lib/http";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { calculateSalaryBreakdown } from "@/utils/calculations";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useDialog } from "@/components/ui/dialog-provider";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";

export function SalaryClient() {
  const salaries = useAsyncData<SalaryStructure[]>("/api/salary", []);
  const [query, setQuery] = useState("");
  const dialog = useDialog();
  const fmt = useCurrencyFormatter();
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [percentages, setPercentages] = useState<any[]>([
    { id: "basic", label: "Basic Salary", percent: 50 },
    { id: "hra", label: "H.R.A", percent: 25 },
    { id: "medical", label: "M.A", percent: 12.5 },
    { id: "travel", label: "T.A", percent: 5 },
    { id: "others", label: "Others", percent: 7.5 }
  ]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/attendance");
      if (res.ok) {
        const data = await res.json();
        if (data.salaryStructure) {
          const structure = data.salaryStructure;
          // Normalize to array if it's an object
          if (structure && !Array.isArray(structure)) {
            const normalized = Object.entries(structure).map(([key, val]: [string, any]) => ({
              id: key,
              label: typeof val === 'object' ? (val.label || key) : key,
              percent: typeof val === 'object' ? (val.percent || 0) : (val || 0)
            }));
            setPercentages(normalized);
          } else {
            setPercentages(structure);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch salary settings");
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = percentages.reduce((a, b) => a + (b.percent || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      dialog.alert("Error", `Total percentage must be 100%. Current total: ${total}%`);
      return;
    }

    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaryStructure: percentages })
      });
      if (res.ok) {
        dialog.alert("Success", "Salary structure updated successfully.");
        setIsSettingsOpen(false);
        salaries.refresh();
      }
    } catch (error) {
      dialog.alert("Error", "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const addField = () => {
    setPercentages([...percentages, { id: `field_${Date.now()}`, label: "New Field", percent: 0 }]);
  };

  const removeField = (id: string) => {
    setPercentages(percentages.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: any) => {
    setPercentages(percentages.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const b = (row: SalaryStructure) => calculateSalaryBreakdown(row.totalSalary, percentages);

  const filtered = useMemo(() => {
    return salaries.data.filter((item) =>
      (item.employee?.name || "").toLowerCase().includes(query.toLowerCase())
    );
  }, [salaries.data, query]);

  async function remove(item: SalaryStructure) {
    const ok = await dialog.danger(
      t("Delete this salary structure?"),
      <p className="text-sm text-slate-600">{t("This will permanently remove <strong>{name}</strong>'s salary structure.", { name: item.employee?.name })}</p>
    );
    if (!ok) return;
    await sendJson(`/api/salary/${item.id}`, "DELETE");
    await salaries.refresh();
  }

  if (salaries.loading) return <LoadingState />;
  if (salaries.error) return <ErrorState message={salaries.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Salary Structure")}
        subtitle={t("Define salary structure and auto-calculate the requested breakdown.")}
        actions={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="bg-white hover:bg-slate-50 border-slate-200 shadow-soft-xl gap-2 rounded-2xl text-slate-700">
              <Settings2 className="w-4 h-4" /> {t("Threshold Setup")}
            </Button>
            <Link href="/salary/history">
              <Button variant="secondary">{t("History")}</Button>
            </Link>
            <Link href="/salary/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> {t("Add Salary")}
              </Button>
            </Link>
          </div>
        }
      />

      <SearchFilterBar value={query} onChange={setQuery} placeholder={t("Search salary structures...")} />

      <DataTable
        data={filtered}
        columns={[
          { key: "employee", title: t("Name"), render: (row) => row.employee?.name || "-" },
          { key: "totalSalary", title: t("Total Salary"), render: (row) => fmt(row.totalSalary) },
          ...percentages.map(f => ({
             key: f.id,
             title: `${t(f.label)}: ${f.percent}%`,
             render: (row: any) => fmt(b(row).values[f.id] || 0)
          })),
          {
            key: "actions",
            title: t("Actions"),
            render: (row) => (
              <div className="flex gap-2">
                <Link href={`/salary/${row.id}`}>
                  <Button variant="secondary" className="h-9 px-3">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="danger" className="h-9 px-3" onClick={() => remove(row)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          }
        ]}
      />
      <Modal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title={t("Salary Structure Configuration")} size="4xl">
         <form onSubmit={handleSaveSettings} className="space-y-6 pt-4">
            <div className="flex justify-between items-center bg-brand-50 p-4 rounded-2xl border border-brand-100">
               <div className="text-brand-800 text-xs leading-relaxed">
                 <p className="font-bold mb-1 text-sm uppercase tracking-tight">{t("Configuration Guide")}</p>
                 {t("Define the percentage breakdown for each salary component. The total must equal 100%.")}
               </div>
               <Button type="button" onClick={addField} variant="secondary" className="gap-2 shrink-0">
                  <Plus className="w-4 h-4" /> {t("Add Field")}
               </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 max-h-[50vh] overflow-y-auto px-1 pr-4 custom-scrollbar">
               {percentages.map((field, idx) => (
                 <div key={field.id} className="group relative flex gap-3 items-end bg-slate-50/50 p-3 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-white transition-all">
                    <div className="flex-1 space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Component Label")}</label>
                       <Input 
                         placeholder={t("e.g. Basic Salary")}
                         value={field.label} 
                         onChange={(e) => updateField(field.id, { label: e.target.value })} 
                       />
                    </div>
                    <div className="w-24 space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Percent (%)")}</label>
                       <Input 
                         type="number" 
                         step="0.1"
                         value={field.percent} 
                         onChange={(e) => updateField(field.id, { percent: parseFloat(e.target.value) || 0 })} 
                       />
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => removeField(field.id)}
                      className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl shrink-0 mb-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                 </div>
               ))}
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-slate-100">
               <div className="flex items-center gap-3">
                 <div className={`h-3 w-3 rounded-full ${Math.abs(percentages.reduce((a, b) => a + (b.percent || 0), 0) - 100) < 0.01 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-rose-500 animate-pulse"}`}></div>
                 <span className={`text-sm font-black tracking-tight ${Math.abs(percentages.reduce((a, b) => a + (b.percent || 0), 0) - 100) < 0.01 ? "text-emerald-600" : "text-rose-600"}`}>
                   {t("Total Allocation:")} {percentages.reduce((a, b) => a + (b.percent || 0), 0)}%
                 </span>
               </div>
               <div className="flex gap-3">
                 <Button type="button" variant="ghost" onClick={() => setIsSettingsOpen(false)}>{t("Cancel")}</Button>
                 <Button type="submit" disabled={savingSettings} className="px-8">{savingSettings ? t("Updating...") : t("Save Configuration")}</Button>
               </div>
            </div>
         </form>
      </Modal>
    </div>
  );
}
