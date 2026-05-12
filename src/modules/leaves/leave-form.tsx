"use client";

import { useEffect, useState } from "react";
import { Employee, LeaveBalance } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { useTranslation } from "@/hooks/use-translation";

export function LeaveForm({
  employees,
  initialData,
  onSubmit,
  onCancel
}: {
  employees: Employee[];
  initialData?: Partial<LeaveBalance>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    employeeId: "",
    year: String(new Date().getFullYear()),
    totalLeave: "10",
    dueLeave: "10"
  });
  const { t } = useTranslation();

  useEffect(() => {
    if (initialData) {
      setForm({
        employeeId: initialData.employeeId ?? "",
        year: String(initialData.year ?? new Date().getFullYear()),
        totalLeave: String(initialData.totalLeave ?? 10),
        dueLeave: String(initialData.dueLeave ?? 10)
      });
    }
  }, [initialData]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          employeeId: form.employeeId,
          year: Number(form.year),
          totalLeave: Number(form.totalLeave),
          dueLeave: Number(form.dueLeave)
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Combobox
          options={employees}
          value={form.employeeId}
          onChange={(val) => setForm({ ...form, employeeId: val })}
          disabled={!!initialData}
          placeholder={t("Search employee...")}
        />
        <Input type="number" placeholder={t("Year")} value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">{t("Total Yearly Leave")}</label>
          <Input type="number" min="0" value={form.totalLeave} onChange={(e) => setForm({ ...form, totalLeave: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">{t("Initial Due Leave")}</label>
          <Input type="number" value={form.dueLeave} onChange={(e) => setForm({ ...form, dueLeave: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>{t("Cancel")}</Button>
        <Button type="submit">{t("Save Leave Balance")}</Button>
      </div>
    </form>
  );
}
