"use client";

import { useEffect, useState } from "react";
import { Employee, MonthlySalary } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";

const months = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" }, { value: 4, label: "April" },
  { value: 5, label: "May" }, { value: 6, label: "June" }, { value: 7, label: "July" }, { value: 8, label: "August" },
  { value: 9, label: "September" }, { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" }
];

export function MonthlySalaryForm({
  employees,
  initialData,
  onSubmit,
  onCancel
}: {
  employees: Employee[];
  initialData?: Partial<MonthlySalary>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    employeeId: "",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    totalSalary: "0",
    workingDays: "30",
    workingDaySalary: "0",
    advanceSalaryAmount: "0",
    loanAdjustAmount: "0",
    festivalBonus: "0",
    payableSalary: "0",
    totalSalaryPaid: "0",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        employeeId: initialData.employeeId ?? "",
        month: String(initialData.month ?? new Date().getMonth() + 1),
        year: String(initialData.year ?? new Date().getFullYear()),
        totalSalary: String(initialData.totalSalary ?? 0),
        workingDays: String(initialData.workingDays ?? 30),
        workingDaySalary: String(initialData.workingDaySalary ?? 0),
        advanceSalaryAmount: String(initialData.advanceSalaryAmount ?? 0),
        loanAdjustAmount: String(initialData.loanAdjustAmount ?? 0),
        festivalBonus: String(initialData.festivalBonus ?? 0),
        payableSalary: String(initialData.payableSalary ?? 0),
        totalSalaryPaid: String(initialData.totalSalaryPaid ?? 0),
      });
    }
  }, [initialData]);

  useEffect(() => {
    if (initialData) return;
    async function calculate() {
      if (!form.employeeId || !form.month || !form.year) return;
      try {
        const res = await fetch(`/api/monthly-salary/calculate?employeeId=${form.employeeId}&month=${form.month}&year=${form.year}`);
        if (!res.ok) return;
        const data = await res.json();
        setForm(prev => ({
          ...prev,
          totalSalary: String(data.totalSalary),
          workingDays: String(data.workingDays),
          workingDaySalary: String(data.workingDaySalary),
          advanceSalaryAmount: String(data.advanceSalaryAmount),
          loanAdjustAmount: String(data.loanAdjustAmount),
          festivalBonus: String(data.festivalBonus),
          payableSalary: String(data.payableSalary),
          totalSalaryPaid: String(data.payableSalary)
        }));
      } catch (e) {
        console.error("Calculation failed", e);
      }
    }
    calculate();
  }, [form.employeeId, form.month, form.year, initialData]);

  useEffect(() => {
    const workingDaySalary = Number(form.workingDaySalary) || 0;
    const advance = Number(form.advanceSalaryAmount) || 0;
    const loan = Number(form.loanAdjustAmount) || 0;
    const bonus = Number(form.festivalBonus) || 0;
    
    const payable = Math.max(0, workingDaySalary - advance - loan + bonus);
    setForm(prev => ({ 
      ...prev, 
      payableSalary: String(payable),
      totalSalaryPaid: String(payable)
    }));
  }, [form.workingDaySalary, form.advanceSalaryAmount, form.loanAdjustAmount, form.festivalBonus]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          employeeId: form.employeeId,
          month: Number(form.month),
          year: Number(form.year),
          totalSalary: Number(form.totalSalary),
          workingDays: Number(form.workingDays),
          workingDaySalary: Number(form.workingDaySalary),
          advanceSalaryAmount: Number(form.advanceSalaryAmount),
          loanAdjustAmount: Number(form.loanAdjustAmount),
          festivalBonus: Number(form.festivalBonus),
          payableSalary: Number(form.payableSalary),
          totalSalaryPaid: Number(form.totalSalaryPaid)
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

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Month</label>
          <Select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
            {months.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Year</label>
          <Input type="number" min="2000" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Total Base Salary</label>
          <Input type="number" min="0" value={form.totalSalary} onChange={(e) => setForm({ ...form, totalSalary: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Working Days</label>
          <Input type="number" min="0" value={form.workingDays} onChange={(e) => setForm({ ...form, workingDays: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Working Day Salary</label>
          <Input type="number" min="0" value={form.workingDaySalary} onChange={(e) => setForm({ ...form, workingDaySalary: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Advance Salary Deduct</label>
          <Input type="number" min="0" value={form.advanceSalaryAmount} onChange={(e) => setForm({ ...form, advanceSalaryAmount: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Loan Adjustment</label>
          <Input type="number" min="0" value={form.loanAdjustAmount} onChange={(e) => setForm({ ...form, loanAdjustAmount: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Festival Bonus</label>
          <Input type="number" min="0" value={form.festivalBonus} onChange={(e) => setForm({ ...form, festivalBonus: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Payable Salary</label>
          <Input type="number" min="0" value={form.payableSalary} readOnly className="bg-slate-50 cursor-not-allowed" />
        </div>
      </div>

      <div className="rounded-2xl bg-brand-50 p-4 border border-brand-100 flex items-center justify-between">
         <span className="font-medium text-brand-900">Final Salary Paid:</span>
         <Input className="w-48 bg-white" type="number" min="0" value={form.totalSalaryPaid} onChange={(e) => setForm({ ...form, totalSalaryPaid: e.target.value })} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Monthly Salary</Button>
      </div>
    </form>
  );
}
