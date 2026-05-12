"use client";

import { useEffect, useState } from "react";
import { Employee, SalaryStructure } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { calculateSalaryBreakdown } from "@/utils/calculations";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";

export function SalaryForm({
  employees,
  initialData,
  onSubmit,
  onCancel
}: {
  employees: Employee[];
  initialData?: Partial<SalaryStructure>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const fmt = useCurrencyFormatter();
  const [form, setForm] = useState({
    employeeId: "",
    totalSalary: "0"
  });
  const [percentages, setPercentages] = useState<any[]>([
    { id: "basic", label: "Basic Salary", percent: 50 },
    { id: "hra", label: "H.R.A", percent: 25 },
    { id: "medical", label: "M.A", percent: 12.5 },
    { id: "travel", label: "T.A", percent: 5 },
    { id: "others", label: "Others", percent: 7.5 }
  ]);

  useEffect(() => {
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
    fetchSettings();
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        employeeId: initialData.employeeId ?? "",
        totalSalary: String(initialData.totalSalary ?? 0)
      });
    }
  }, [initialData]);

  const breakdown = calculateSalaryBreakdown(Number(form.totalSalary || 0), percentages);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          employeeId: form.employeeId,
          totalSalary: Number(form.totalSalary)
        });
      }}
    >
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Select Employee
        </label>
        <Combobox
          options={employees}
          value={form.employeeId}
          onChange={(val) => setForm({ ...form, employeeId: val })}
          placeholder="Search and select employee..."
        />
      </div>
      <Input type="number" min="0" value={form.totalSalary} onChange={(e) => setForm({ ...form, totalSalary: e.target.value })} />

      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(breakdown.values)
          .map(([key, value]) => (
          <div key={key} className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               {(breakdown.labels as any)[key] || key}
            </p>
            <p className="mt-1 font-semibold text-slate-900">{fmt(value as number)}</p>
          </div>
        ))}
      </div>



      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Salary Structure</Button>
      </div>
    </form>
  );
}
