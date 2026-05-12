"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Holiday } from "@/types";
import { format, differenceInDays, addDays } from "date-fns";
import { useTranslation } from "@/hooks/use-translation";

export function HolidayForm({
  initialData,
  onSubmit,
  onCancel
}: {
  initialData?: Partial<Holiday>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    fromDate: format(new Date(), "yyyy-MM-dd"),
    toDate: format(new Date(), "yyyy-MM-dd"),
    totalDays: "1"
  });
  const { t } = useTranslation();

  useEffect(() => {
    if (initialData) {
      // Assuming initialData.date is the fromDate
      const from = initialData.date ? initialData.date.slice(0, 10) : format(new Date(), "yyyy-MM-dd");
      const total = initialData.totalDays ?? 1;
      const to = format(addDays(new Date(from), total - 1), "yyyy-MM-dd");
      
      setForm({
        name: initialData.name ?? "",
        fromDate: from,
        toDate: to,
        totalDays: String(total)
      });
    }
  }, [initialData]);

  // Auto-calculate total days
  useEffect(() => {
    if (form.fromDate && form.toDate) {
      const start = new Date(form.fromDate);
      const end = new Date(form.toDate);
      
      if (end >= start) {
        const days = differenceInDays(end, start) + 1;
        setForm(prev => ({ ...prev, totalDays: String(days) }));
      } else {
        setForm(prev => ({ ...prev, totalDays: "0" }));
      }
    }
  }, [form.fromDate, form.toDate]);

  return (
    <form
      className="space-y-6 pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({
          name: form.name,
          date: new Date(form.fromDate).toISOString(),
          totalDays: Number(form.totalDays)
        });
      }}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">{t("Holiday Name")}</label>
          <Input 
            placeholder={t("e.g. Eid-ul-Fitr, New Year")} 
            value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value })} 
            required
            className="h-11 rounded-xl border-slate-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">{t("From Date")}</label>
            <Input 
              type="date" 
              value={form.fromDate} 
              onChange={(e) => setForm({ ...form, fromDate: e.target.value })} 
              required
              className="h-11 rounded-xl border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">{t("To Date")}</label>
            <Input 
              type="date" 
              value={form.toDate} 
              onChange={(e) => setForm({ ...form, toDate: e.target.value })} 
              required
              className="h-11 rounded-xl border-slate-200"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("Calculated Duration")}</p>
            <p className="text-lg font-black text-slate-900">{form.totalDays} {Number(form.totalDays) > 1 ? t("Days") : t("Day")}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-xl">{t("Cancel")}</Button>
        <Button type="submit" className="px-8 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-200">
          {t("Save Holiday")}
        </Button>
      </div>
    </form>
  );
}
