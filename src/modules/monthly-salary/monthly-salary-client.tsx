"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MonthlySalary, ModalMode } from "@/types";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { useEmployees } from "@/modules/shared/use-employees";
import { sendJson } from "@/lib/http";
import { MonthlySalaryForm } from "./monthly-salary-form";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { Select } from "@/components/ui/select";
import { useDialog } from "@/components/ui/dialog-provider";
import { useTranslation } from "@/hooks/use-translation";

const monthMap: Record<number, string> = {
  1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
};

export function MonthlySalaryClient() {
  const records = useAsyncData<MonthlySalary[]>("/api/monthly-salary", []);
  const employees = useEmployees();
  const [query, setQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("create");
  const [selected, setSelected] = useState<MonthlySalary | undefined>();
  const [percentages, setPercentages] = useState<any[]>([]);
  const fmt = useCurrencyFormatter();
  const dialog = useDialog();
  const { t } = useTranslation();

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/attendance");
      if (res.ok) {
        const data = await res.json();
        if (data.salaryStructure) {
          const structure = data.salaryStructure;
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

  useMemo(() => {
    fetchSettings();
  }, []);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const range = [];
    for (let i = current - 2; i <= current + 1; i++) range.push(i);
    return range;
  }, []);

  const filtered = useMemo(() => {
    return records.data.filter((item) => {
      const matchesQuery = `${item.employee?.name || ""}`.toLowerCase().includes(query.toLowerCase());
      const matchesMonth = item.month === selectedMonth;
      const matchesYear = item.year === selectedYear;
      return matchesQuery && matchesMonth && matchesYear;
    });
  }, [records.data, query, selectedMonth, selectedYear]);

  async function submit(payload: Record<string, unknown>) {
    if (mode === "create") {
      await sendJson("/api/monthly-salary", "POST", payload);
    } else if (selected) {
      await sendJson(`/api/monthly-salary/${selected.id}`, "PUT", payload);
    }
    setOpen(false);
    setSelected(undefined);
    await records.refresh();
  }

  async function remove(item: MonthlySalary) {
    const ok = await dialog.danger(
      t("Delete monthly salary record?"),
      <p className="text-slate-600 text-sm">{t("This will permanently delete <strong>{name}</strong>'s record for {month} {year}. This cannot be undone.", { name: item.employee?.name, month: t(monthMap[item.month]), year: item.year })}</p>
    );
    if (!ok) return;
    await sendJson(`/api/monthly-salary/${item.id}`, "DELETE");
    await records.refresh();
  }

  async function toggleStatus(item: MonthlySalary, field: "isPaid" | "isHeld", value: boolean) {
    const oldData = [...records.data];
    const newData = records.data.map((r) => {
      if (r.id === item.id) {
        const updated = { ...r, [field]: value };
        if (field === "isPaid" && value) updated.isHeld = false;
        if (field === "isHeld" && value) updated.isPaid = false;
        return updated;
      }
      return r;
    });

    records.setData(newData);

    try {
      const payload: any = { [field]: value };
      if (field === "isPaid" && value) payload.isHeld = false;
      if (field === "isHeld" && value) payload.isPaid = false;
      await sendJson(`/api/monthly-salary/${item.id}/status`, "PATCH", payload);
      await records.refresh({ silent: true });
    } catch (err) {
      records.setData(oldData);
      await dialog.alert("Error", <p className="text-red-600 text-sm">{err instanceof Error ? err.message : "Failed to update status"}</p>);
    }
  }

  async function applyBulkBonus() {
    const percentage = await dialog.prompt(
      `Festival Bonus — ${monthMap[selectedMonth]} ${selectedYear}`,
      "Enter bonus percentage (e.g. 20 or 30)"
    );
    if (!percentage || isNaN(Number(percentage))) return;

    const ok = await dialog.confirm(
      `Apply ${percentage}% festival bonus?`,
      <p className="text-slate-600 text-sm">This will apply a <strong>{percentage}%</strong> festival bonus to all unpaid employees for <strong>{monthMap[selectedMonth]} {selectedYear}</strong>.</p>
    );
    if (!ok) return;

    await sendJson("/api/monthly-salary/bulk-bonus", "POST", {
      month: selectedMonth,
      year: selectedYear,
      percentage: Number(percentage)
    });
    await records.refresh();
    await dialog.alert("Success", <p className="text-slate-600 text-sm">Festival bonus applied successfully to all eligible employees.</p>);
  }

  async function closeMonth() {
    const uncheckedItems = filtered.filter(item => !item.isPaid && !item.isHeld);
    if (uncheckedItems.length > 0) {
      await dialog.alert(
        "Cannot Close Month",
        <p className="text-slate-600 text-sm">Please mark all salaries as <strong>Paid</strong> or put them on <strong>Hold</strong> first before closing the month.</p>
      );
      return;
    }

    const monthName = monthMap[selectedMonth];
    const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    const nextMonthName = monthMap[nextMonth];

    const confirmed = await dialog.confirm(
      `Close ${monthName} ${selectedYear}?`,
      <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
        <li>Mark all (not held) salaries as <strong>Paid</strong></li>
        <li>Deduct loan installments from loan balances</li>
        <li>Clear advance salary entries as deducted</li>
        <li>Reset negative leave balances to 0</li>
        <li>Generate <strong>{nextMonthName} {nextYear}</strong> salary records</li>
        <li className="text-red-600 font-semibold">This action cannot be undone.</li>
      </ul>
    );
    if (!confirmed) return;

    try {
      const result = await sendJson("/api/monthly-salary/close-month", "POST", {
        month: selectedMonth,
        year: selectedYear,
      });
      await records.refresh();
      setSelectedMonth(nextMonth);
      setSelectedYear(nextYear);
      await dialog.alert("Month Closed", <p className="text-slate-600 text-sm">{(result as { message: string }).message}</p>);
    } catch (e) {
      await dialog.alert("Error", <p className="text-red-600 text-sm">{e instanceof Error ? e.message : "Unknown error"}</p>);
    }
  }

  const totals = useMemo(() => {
    return filtered.reduce((acc, curr) => {
      acc.total += curr.payableSalary || 0;
      if (curr.isPaid) acc.paid += curr.payableSalary || 0;
      if (curr.isHeld) acc.held += curr.payableSalary || 0;
      return acc;
    }, { total: 0, paid: 0, held: 0 });
  }, [filtered]);

  if (records.loading || employees.loading) return <LoadingState />;
  if (records.error) return <ErrorState message={records.error} />;
  if (employees.error) return <ErrorState message={employees.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Monthly Salary")}
        subtitle={t("Monthly payout records with breakdown and total paid.")}
        actions={
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-8 px-6 py-2 border-r border-slate-200">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Total Payable")}</p>
                <p className="text-xl font-black text-slate-900">{fmt(totals.total)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t("Paid Amount")}</p>
                <p className="text-xl font-black text-emerald-600">{fmt(totals.paid)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{t("Hold Amount")}</p>
                <p className="text-xl font-black text-orange-600">{fmt(totals.held)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={applyBulkBonus}>
                {t("Festival Bonus %")}
              </Button>
              <Button
                variant="secondary"
                onClick={closeMonth}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <Lock className="mr-2 h-4 w-4" /> {t("Close Month")}
              </Button>
            </div>
          </div>
        }
      />

      <SearchFilterBar 
        value={query} 
        onChange={setQuery} 
        placeholder={t("Search employee name...")}
        rightSlot={
          <div className="flex gap-3">
            <div className="w-36">
              <Select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>{t(monthMap[m])}</option>
                ))}
              </Select>
            </div>
            <div className="w-32">
              <Select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
          </div>
        }
      />

      <DataTable
        data={filtered}
        rowClassName={(row) => {
          if (row.isPaid) return "bg-emerald-50 !text-emerald-900";
          if (row.isHeld) return "bg-orange-50 !text-orange-900";
          if (row.payableSalary < 0) return "bg-red-50 !text-red-900";
          return "";
        }}
        columns={[
          { key: "employee", title: t("Employee"), render: (row) => row.employee?.name || "-" },
          { key: "period", title: t("Period"), render: (row) => `${t(monthMap[row.month])} ${row.year}` },
          { key: "totalSalary", title: t("Total Salary"), render: (row) => fmt(row.totalSalary) },
          { key: "workingDays", title: t("Working Day"), render: (row) => row.workingDays ?? 30 },
          { key: "workingDaySalary", title: t("Working Day Salary"), render: (row) => fmt(row.workingDaySalary) },
          { key: "advanceSalaryAmount", title: t("Salary Advance"), render: (row) => fmt(row.advanceSalaryAmount) },
          { key: "loanAdjustAmount", title: t("Loan Adjust"), render: (row) => fmt(row.loanAdjustAmount) },
          { key: "festivalBonus", title: t("Festival Bonus"), render: (row) => fmt(row.festivalBonus || 0) },
          { key: "payableSalary", title: t("Payable Salary"), render: (row) => <span className={`font-semibold ${row.payableSalary < 0 ? 'text-red-600' : 'text-brand-700'}`}>{fmt(row.payableSalary)}</span> },
          {
            key: "isPaid",
            title: t("Track Box"),
            render: (row) => (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={row.isPaid}
                    onChange={(e) => toggleStatus(row, "isPaid", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                  />
                  {t("Paid")}
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-orange-600">
                  <input
                    type="checkbox"
                    checked={row.isHeld}
                    onChange={(e) => toggleStatus(row, "isHeld", e.target.checked)}
                    className="h-4 w-4 rounded border-orange-300 accent-orange-600"
                  />
                  {t("Hold")}
                </label>
              </div>
            )
          },
          {
            key: "actions",
            title: t("Actions"),
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="secondary" className="h-9 px-3" onClick={() => { setMode("edit"); setSelected(row); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="danger" className="h-9 px-3" onClick={() => remove(row)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          }
        ]}
      />

      <Modal
        open={open}
        title={mode === "create" ? t("Add Monthly Salary") : t("Edit Monthly Salary")}
        onClose={() => setOpen(false)}
      >
        <MonthlySalaryForm employees={employees.data} initialData={selected} onSubmit={submit} onCancel={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
