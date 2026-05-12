"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Holiday, ModalMode } from "@/types";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { sendJson } from "@/lib/http";
import { getDayName } from "@/utils/calculations";
import { HolidayForm } from "./holiday-form";
import { useDialog } from "@/components/ui/dialog-provider";
import { useTranslation } from "@/hooks/use-translation";

export function HolidaysClient() {
  const { data, loading, error, refresh } = useAsyncData<Holiday[]>("/api/holidays", []);
  const currentYear = new Date().getFullYear();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("create");
  const [selected, setSelected] = useState<Holiday | undefined>();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const dialog = useDialog();
  const { t } = useTranslation();

  const isPastHoliday = (dateString: string) => {
    return isBefore(startOfDay(new Date(dateString)), startOfDay(new Date()));
  };

  const years = useMemo(() => {
    const uniqueYears = new Set(data.map((item) => new Date(item.date).getFullYear()));
    uniqueYears.add(currentYear); // Always include current year
    return Array.from(uniqueYears).sort((a, b) => b - a);
  }, [data, currentYear]);

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const matchQuery = item.name.toLowerCase().includes(query.toLowerCase());
      const matchYear = new Date(item.date).getFullYear() === selectedYear;
      return matchQuery && matchYear;
    });
  }, [data, query, selectedYear]);

  const totalHolidaysInYear = useMemo(() => {
    return filtered.reduce((acc, curr) => acc + curr.totalDays, 0);
  }, [filtered]);

  async function submit(payload: Record<string, unknown>) {
    if (mode === "create") {
      await sendJson("/api/holidays", "POST", payload);
    } else if (selected) {
      await sendJson(`/api/holidays/${selected.id}`, "PUT", payload);
    }
    setOpen(false);
    setSelected(undefined);
    await refresh();
  }

  async function remove(item: Holiday) {
    const ok = await dialog.danger(
      `${t("Delete")} "${item.name}"?`,
      <p className="text-sm text-slate-600">{t("This will permanently remove this holiday from the system.")}</p>
    );
    if (!ok) return;
    await sendJson(`/api/holidays/${item.id}`, "DELETE");
    await refresh();
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Holidays")}
        subtitle={t("Manage company holidays with auto day detection.")}
        actions={
          <Button onClick={() => { setMode("create"); setSelected(undefined); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> {t("Add Holiday")}
          </Button>
        }
      />

      <SearchFilterBar
        value={query}
        onChange={setQuery}
        placeholder={t("Search holidays...")}
        rightSlot={
          <div className="flex items-center gap-3">
            <div className="flex h-10 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-700">
              {t("Total")} {totalHolidaysInYear} {t("Days")}
            </div>
            <div className="w-32">
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
      />

      <DataTable
        data={filtered}
        rowClassName={(row) => isPastHoliday(row.date) ? "opacity-50 grayscale bg-slate-50" : ""}
        columns={[
          { key: "name", title: t("Holiday"), render: (row) => row.name },
          { key: "date", title: t("Date"), render: (row) => format(new Date(row.date), "dd MMM yyyy") },
          { key: "day", title: t("Day"), render: (row) => t(getDayName(row.date)) },
          { key: "days", title: t("Total Days"), render: (row) => row.totalDays },
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
        title={mode === "create" ? t("Add Holiday") : t("Edit Holiday")}
        onClose={() => setOpen(false)}
      >
        <HolidayForm initialData={selected} onSubmit={submit} onCancel={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
