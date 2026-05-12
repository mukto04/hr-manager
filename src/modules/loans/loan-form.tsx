"use client";

import { useEffect, useState } from "react";
import { AdvanceSalary, Employee, Loan } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { calculateDueAmount } from "@/utils/calculations";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useTranslation } from "@/hooks/use-translation";

export function LoanForm({
  employees,
  advances,
  loans,
  initialData,
  onSubmit,
  onCancel
}: {
  employees: Employee[];
  advances?: AdvanceSalary[];
  loans?: Loan[];
  initialData?: Partial<Loan>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const fmt = useCurrencyFormatter();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    employeeId: "",
    loanAmount: "0",
    paidAmount: "0",
    installmentAmount: "0",
    startMonth: String(currentMonth),
    startYear: String(currentYear),
    note: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        employeeId: initialData.employeeId ?? "",
        loanAmount: String(initialData.loanAmount ?? 0),
        paidAmount: String(initialData.paidAmount ?? 0),
        installmentAmount: String(initialData.installmentAmount ?? 0),
        startMonth: initialData.startMonth ? String(initialData.startMonth) : String(currentMonth),
        startYear: initialData.startYear ? String(initialData.startYear) : String(currentYear),
        note: initialData.note ?? ""
      });
    }
  }, [initialData, currentMonth, currentYear]);

  const emp = employees.find((e) => e.id === form.employeeId);
  const totalSalary = emp?.salaryStructure?.totalSalary || 0;

  const empAdvances = advances?.filter((a) => a.employeeId === form.employeeId && a.month === currentMonth && a.year === currentYear && !a.isDeducted) || [];
  const advanceSum = empAdvances.reduce((sum, a) => sum + a.amount, 0);

  const empLoans = loans?.filter(l => {
    if (initialData && (l as any).id === (initialData as any).id) return false; // Ignore current loan in edit
    if (l.employeeId !== form.employeeId || l.dueAmount <= 0) return false;
    if (l.startYear == null) return true;
    if (l.startYear < currentYear) return true;
    if (l.startYear === currentYear && l.startMonth != null && l.startMonth <= currentMonth) return true;
    if (l.startYear === currentYear && l.startMonth == null) return true;
    return false;
  }) || [];
  const loanSum = empLoans.reduce((sum, l) => sum + Math.min(l.installmentAmount, l.dueAmount), 0);

  const payableSalary = totalSalary - advanceSum - loanSum;
  const newInstallment = Number(form.installmentAmount) || 0;
  const isCurrentMonthAffordable = payableSalary >= newInstallment;

  const due = calculateDueAmount(Number(form.loanAmount || 0), Number(form.paidAmount || 0));

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
    { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" }
  ];
  const minYear = initialData?.startYear ? Math.min(initialData.startYear, currentYear) : currentYear;
  const years = Array.from({ length: 5 }, (_, i) => minYear + i); 

  const availableMonths = months.filter(m => {
    const isSavedValue = initialData?.startYear === Number(form.startYear) && initialData?.startMonth === Number(m.value);
    const mValue = Number(m.value);

    // If future year, all months are OK
    if (Number(form.startYear) > currentYear) return true;

    // If current year
    if (Number(form.startYear) === currentYear) {
      // Past months only if it's the saved value
      if (mValue < currentMonth) return isSavedValue;
      // Current month only if affordable (or it was perfectly saved and they are not increasing it? No, forcefully shut down if unpayable)
      if (mValue === currentMonth) return isCurrentMonthAffordable;
      // Future months in current year are OK
      return true;
    }

    // If past year, only OK if it's the strictly saved value
    return isSavedValue;
  });

  useEffect(() => {
    // 1. Shift forward if current month is selected but unaffordable
    if (Number(form.startYear) === currentYear && Number(form.startMonth) === currentMonth && !isCurrentMonthAffordable) {
       let nextM = currentMonth + 1;
       let nextY = currentYear;
       if (nextM > 12) {
         nextM = 1;
         nextY++;
       }
       setForm(f => ({ ...f, startMonth: String(nextM), startYear: String(nextY) }));
    } 
    // 2. Shift to current month if a past month is selected (and it's not the saved historical value)
    else if (Number(form.startYear) === currentYear && Number(form.startMonth) < currentMonth) {
      const isSavedValue = initialData?.startYear === currentYear && initialData?.startMonth === Number(form.startMonth);
      if (!isSavedValue) {
        setForm(f => ({ ...f, startMonth: String(currentMonth) }));
      }
    }
  }, [form.startYear, form.startMonth, currentYear, currentMonth, isCurrentMonthAffordable, initialData]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);

        const newInstallment = Number(form.installmentAmount);
        if (newInstallment > payableSalary) {
          setError(`${t("Monthly installment exceeds the remaining payable salary")} (${t("Available:")} ${fmt(payableSalary)})`);
          return;
        }

        setSubmitting(true);
        try {
          await onSubmit({
            employeeId: form.employeeId,
            loanAmount: Number(form.loanAmount),
            paidAmount: Number(form.paidAmount),
            installmentAmount: Number(form.installmentAmount),
            startMonth: form.startMonth ? Number(form.startMonth) : null,
            startYear: form.startYear ? Number(form.startYear) : null,
            note: form.note
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
          disabled={!!initialData}
          placeholder={t("Search and select employee...")}
        />
      </div>
      <div className={`grid gap-4 ${initialData ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("Loan Amount")}</label>
          <Input type="number" min="0" placeholder="0" value={form.loanAmount} onChange={(e) => setForm({ ...form, loanAmount: e.target.value })} />
        </div>
        {initialData && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("Paid Amount")}</label>
            <Input type="number" min="0" placeholder="0" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
          </div>
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("Monthly Installment Amount")}</label>
        <Input type="number" min="0" placeholder="0" value={form.installmentAmount} onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("Installment Start Month")}</label>
          <Select value={form.startMonth} onChange={(e) => setForm({ ...form, startMonth: e.target.value })}>
            {availableMonths.map(m => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("Installment Start Year")}</label>
          <Select value={form.startYear} onChange={(e) => setForm({ ...form, startYear: e.target.value })}>
            {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </Select>
        </div>
      </div>
      <Textarea placeholder={t("Note")} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        {t("Due amount:")} <span className="font-semibold">{fmt(due)}</span>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>{t("Cancel")}</Button>
        <Button type="submit" disabled={submitting}>{submitting ? t("Saving...") : t("Save Loan")}</Button>
      </div>
    </form>
  );
}
