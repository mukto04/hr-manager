"use client";

import { useEffect, useState } from "react";
import { AdvanceSalary, Employee } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useTranslation } from "@/hooks/use-translation";

const months = [
  { value: 1, label: "January" }, { value: 2, label: "February" },
  { value: 3, label: "March" }, { value: 4, label: "April" },
  { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" },
  { value: 9, label: "September" }, { value: 10, label: "October" },
  { value: 11, label: "November" }, { value: 12, label: "December" },
];

export function AdvanceSalaryForm({
  employees,
  advances = [],
  initialData,
  onSubmit,
  onCancel,
}: {
  employees: any[];
  advances?: AdvanceSalary[];
  initialData?: Partial<AdvanceSalary>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    employeeId: "",
    amount: "0",
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    isDeducted: false,
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fmt = useCurrencyFormatter();
  const { t } = useTranslation();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(form.year) || currentYear;

  // 1. Find selected employee and their salary
  const emp = employees.find(e => e.id === form.employeeId);
  const totalSalary = emp?.salaryStructure?.totalSalary || 0;

  // 2. Calculate existing loan installments for selected month/year
  // (We assume loans are active if start month/year <= selected month/year and dueAmount > 0)
  // Note: For simplicity and based on user request, we check loans attached to the employee object
  const activeLoans = (emp?.loans || []) as any[];
  const loanInstallmentSum = activeLoans.reduce((sum, loan) => {
    // Basic check: if loan started before or in the selected month
    const sYear = loan.startYear || currentYear;
    const sMonth = loan.startMonth || currentMonth;
    if (selectedYear > sYear || (selectedYear === sYear && Number(form.month) >= sMonth)) {
       return sum + Math.min(loan.installmentAmount, loan.dueAmount);
    }
    return sum;
  }, 0);

  // 3. Calculate other advances for the same month (excluding the one we are editing)
  const otherAdvances = advances.filter(a => 
    a.employeeId === form.employeeId && 
    a.month === Number(form.month) && 
    a.year === selectedYear &&
    (!initialData || a.id !== initialData.id)
  );
  const otherAdvancesSum = otherAdvances.reduce((sum, a) => sum + a.amount, 0);

  const availableBalance = Math.max(0, totalSalary - loanInstallmentSum - otherAdvancesSum);

  // Filter months to show only current and future months for the current year
  const availableMonths = months.filter(m => {
    if (selectedYear > currentYear) return true;
    if (selectedYear === currentYear) return m.value >= currentMonth;
    return false;
  });

  // Ensure month is valid when year changes
  useEffect(() => {
    const sYear = parseInt(form.year) || currentYear;
    const sMonth = parseInt(form.month);
    
    if (sYear === currentYear && sMonth < currentMonth) {
      setForm(prev => ({ ...prev, month: String(currentMonth) }));
    } else if (sYear < currentYear) {
       // Reset to current year/month if somehow a past year is entered
       setForm(prev => ({ ...prev, year: String(currentYear), month: String(currentMonth) }));
    }
  }, [form.year, currentYear, currentMonth]);

  useEffect(() => {
    if (initialData) {
      setForm({
        employeeId: initialData.employeeId ?? "",
        amount: String(initialData.amount ?? 0),
        month: String(initialData.month ?? new Date().getMonth() + 1),
        year: String(initialData.year ?? new Date().getFullYear()),
        isDeducted: initialData.isDeducted ?? false,
        note: initialData.note ?? "",
      });
    }
  }, [initialData]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);

        const amount = Number(form.amount);
        if (amount > availableBalance) {
          setError(`${t("Advance amount exceeds the remaining payable salary")} (${t("Available:")} ${fmt(availableBalance)})`);
          return;
        }

        setSubmitting(true);
        try {
          await onSubmit({
            employeeId: form.employeeId,
            amount: Number(form.amount),
            month: Number(form.month),
            year: Number(form.year),
            isDeducted: form.isDeducted,
            note: form.note,
          });
        } catch (err: any) {
          setError(err.message || t("Something went wrong."));
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          {t("Select Employee")}
        </label>
        <Combobox
          options={employees}
          value={form.employeeId}
          onChange={(val) => setForm({ ...form, employeeId: val })}
          placeholder={t("Search and select employee...")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {t("Advance Amount")}
          </label>
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {t("Month")}
          </label>
          <Select
            value={form.month}
            onChange={(e) => setForm({ ...form, month: e.target.value })}
          >
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value}>
                {t(m.label)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {t("Year")}
          </label>
          <Input
            type="number"
            min={String(currentYear)}
            placeholder={String(currentYear)}
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />
        </div>


      </div>

      <Textarea
        placeholder={t("Note (optional)")}
        value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
      />

      <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
        <div className="flex justify-between">
          <span>{t("Total Monthly Salary:")}</span>
          <span className="font-medium">{fmt(totalSalary)}</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span>{t("Monthly Loan Installment:")}</span>
          <span className="font-medium">- {fmt(loanInstallmentSum)}</span>
        </div>
        <div className="flex justify-between text-red-500 border-b border-slate-200 pb-1 mb-1">
          <span>{t("Other Advances (this month):")}</span>
          <span className="font-medium">- {fmt(otherAdvancesSum)}</span>
        </div>
        <div className="flex justify-between text-slate-900 font-bold pt-1">
          <span>{t("Available for Advance:")}</span>
          <span>{fmt(availableBalance)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          {t("Cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t("Saving...") : t("Save Advance Salary")}
        </Button>
      </div>
    </form>
  );
}
