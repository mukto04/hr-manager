"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  TrendingUp, 
  DollarSign, 
  Percent,
  ChevronDown,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  selectedIds: string[];
  employees: any[];
}

export function IncrementModal({ onClose, onSuccess, selectedIds, employees }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "PERCENT_TOTAL", 
    value: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    note: ""
  });

  // Handle body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const selectedEmployees = employees.filter(e => selectedIds.includes(e.id));
  const targetIds = selectedIds.length > 0 ? selectedIds : employees.filter(e => e.status === "ACTIVE").map(e => e.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.value || Number(formData.value) <= 0) {
      toast.error(t("Please enter a valid increment value"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/salary-increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: targetIds,
          ...formData
        })
      });

      if (res.ok) {
        toast.success(t("Salary increment applied successfully"));
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.message || t("Failed to apply increment"));
      }
    } catch (err) {
      toast.error(t("An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = [2024, 2025, 2026, 2027];

  return (
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 isolate">
      {/* Dimmed Overlay - Using fixed with no parent restrictions */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-900/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">{t("Apply Increment")}</h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {selectedIds.length > 0 ? `${selectedIds.length} Employees Selected` : "Bulk Application"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          
          {/* Selected Employees Preview */}
          {selectedEmployees.length > 0 && (
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t("Target List")}</label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-24 overflow-y-auto">
                   {selectedEmployees.map(e => (
                     <div key={e.id} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm">
                        {e.name}
                     </div>
                   ))}
                </div>
             </div>
          )}

          {/* Increment Type */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "FIXED_AMOUNT", label: "Fixed", icon: DollarSign },
              { id: "PERCENT_TOTAL", label: "% Total", icon: Percent },
              { id: "PERCENT_BASIC", label: "% Basic", icon: Percent },
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setFormData({ ...formData, type: type.id })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${
                  formData.type === type.id 
                    ? "border-brand-600 bg-brand-50/50 text-brand-600 font-bold shadow-sm" 
                    : "border-slate-50 bg-white text-slate-400 hover:border-slate-100 hover:text-slate-500"
                }`}
              >
                <type.icon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-black uppercase tracking-tight">{t(type.label)}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
             {/* Value */}
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    {formData.type === "FIXED_AMOUNT" ? t("Amount (৳)") : t("Rate (%)")}
                </label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-600 font-black text-sm">
                      {formData.type === "FIXED_AMOUNT" ? "৳" : "%"}
                   </div>
                   <Input 
                      type="number"
                      placeholder="0.00"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="pl-10 h-12 rounded-xl border-slate-200 text-sm font-black focus:ring-brand-500 bg-white"
                      required
                   />
                </div>
             </div>

             {/* Effective Date */}
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t("Effective From")}</label>
                <div className="grid grid-cols-2 gap-2">
                   <div className="relative">
                      <select 
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                        className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 pr-8 text-xs font-bold focus:ring-brand-500 outline-none appearance-none cursor-pointer"
                      >
                        {months.map((m, i) => (
                          <option key={m} value={i + 1}>{t(m)}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                   </div>
                   <div className="relative">
                      <select 
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                        className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 pr-8 text-xs font-bold focus:ring-brand-500 outline-none appearance-none cursor-pointer"
                      >
                        {years.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t("Reason / Note")}</label>
             <textarea 
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder={t("e.g. Performance Bonus 2026...")}
                className="w-full min-h-[80px] p-4 rounded-xl border border-slate-200 focus:ring-brand-500 outline-none text-xs font-medium resize-none bg-slate-50/30"
             />
          </div>

          <div className="p-4 bg-brand-50 rounded-xl border border-brand-100 flex gap-3">
             <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
             <p className="text-[11px] text-brand-800 leading-relaxed font-bold">
                {t("Note: This will modify the base Salary Structure and affect all future payments.")}
             </p>
          </div>
        </form>

        {/* Action Footer */}
        <div className="px-8 py-6 border-t border-slate-50 flex gap-3 bg-white rounded-b-2xl">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="flex-1 rounded-xl h-12 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200"
          >
            {t("Discard")}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] rounded-xl h-12 bg-brand-600 hover:bg-brand-700 text-xs font-black text-white shadow-xl shadow-brand-900/20"
          >
            {loading ? t("Applying...") : t("Confirm & Update")}
          </Button>
        </div>
      </div>
    </div>
  );
}
