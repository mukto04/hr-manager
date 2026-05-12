"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AdvanceSalary, ModalMode } from "@/types";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { useEmployees } from "@/modules/shared/use-employees";
import { sendJson } from "@/lib/http";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { AdvanceSalaryForm } from "./advance-salary-form";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { Select } from "@/components/ui/select";
import { useDialog } from "@/components/ui/dialog-provider";
import { useTranslation } from "@/hooks/use-translation";

const monthMap: Record<number, string> = {
  1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
};

export function AdvanceSalaryClient() {
  const records = useAsyncData<AdvanceSalary[]>("/api/advance-salary", []);
  const employees = useEmployees();
  const [query, setQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("create");
  const [selected, setSelected] = useState<AdvanceSalary | undefined>();
  const dialog = useDialog();
  const fmt = useCurrencyFormatter();
  const { t } = useTranslation();

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
      await sendJson("/api/advance-salary", "POST", payload);
    } else if (selected) {
      await sendJson(`/api/advance-salary/${selected.id}`, "PUT", payload);
    }
    setOpen(false);
    setSelected(undefined);
    await records.refresh();
  }

  async function remove(item: AdvanceSalary) {
    const ok = await dialog.danger(
      t("Delete this advance salary record?"),
      <p className="text-sm text-slate-600">{t("This will permanently remove the advance salary of {name}.", { name: item.employee?.name })}</p>
    );
    if (!ok) return;
    await sendJson(`/api/advance-salary/${item.id}`, "DELETE");
    await records.refresh();
  }

  if (records.loading || employees.loading) return <LoadingState />;
  if (records.error) return <ErrorState message={records.error} />;
  if (employees.error) return <ErrorState message={employees.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Advance Salary")}
        subtitle={t("Manage advance salary allocations and deduction status.")}
        actions={
          <Button
            onClick={() => {
              setMode("create");
              setSelected(undefined);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> {t("Add Advance")}
          </Button>
        }
      />

      <SearchFilterBar
        value={query}
        onChange={setQuery}
        placeholder={t("Search by employee name...")}
        rightSlot={
          <div className="flex gap-3">
            <Select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-[140px]"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>{t(monthMap[m])}</option>
              ))}
            </Select>
            <Select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-[120px]"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
        }
      />

      <DataTable
        data={filtered}
        columns={[
          {
            key: "employee",
            title: t("Employee Name"),
            render: (row) => row.employee?.name || "-",
          },
          {
            key: "amount",
            title: t("Amount"),
            render: (row) => fmt(row.amount),
          },
          {
            key: "period",
            title: t("Month"),
            render: (row) => `${t(monthMap[row.month])} ${row.year}`,
          },
          {
            key: "note",
            title: t("Note"),
            render: (row) => row.note || "-",
          },
          {
            key: "actions",
            title: t("Action"),
            render: (row) => (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="h-9 px-3"
                  onClick={() => {
                    setMode("edit");
                    setSelected(row);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="danger"
                  className="h-9 px-3"
                  onClick={() => remove(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title={mode === "create" ? t("Add Advance Salary") : t("Edit Advance Salary")}
        onClose={() => setOpen(false)}
      >
        <AdvanceSalaryForm
          employees={employees.data}
          advances={records.data}
          initialData={selected}
          onSubmit={submit}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}
