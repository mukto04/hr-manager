"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  History, 
  Trash2, 
  Calendar,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { formatCurrency } from "@/utils/calculations";
import { useDialog } from "@/components/ui/dialog-provider";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  employee: any;
}

export function HistoryModal({ onClose, onSuccess, employee }: Props) {
  const { t } = useTranslation();
  const dialog = useDialog();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Handle body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleDelete = async (incId: string) => {
    const ok = await dialog.confirm(
      t("Revert Increment"), 
      t("Are you sure you want to revert this increment? This will subtract the amount from the current salary structure.")
    );
    if (!ok) return;

    setLoadingId(incId);
    try {
      const res = await fetch(`/api/salary-increment?id=${incId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast.success(t("Increment reverted successfully"));
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.message || t("Failed to revert"));
      }
    } catch (err) {
      toast.error(t("An error occurred"));
    } finally {
      setLoadingId(null);
    }
  };

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return (
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 isolate">
      {/* Dimmed Overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">{t("Pay Evolution")}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{employee.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {employee.increments?.length === 0 ? (
            <div className="text-center py-10 text-slate-300">
               <History className="w-12 h-12 mx-auto opacity-10 mb-2" />
               <p className="text-[10px] font-black uppercase tracking-widest">{t("Empty History")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employee.increments.map((inc: any) => (
                <div key={inc.id} className="p-4 rounded-xl border border-slate-100 bg-white flex items-center justify-between group hover:border-brand-200 hover:shadow-md transition-all">
                   <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-brand-600">+{formatCurrency(inc.amount)}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 font-black uppercase tracking-tight">
                           {inc.type === "FIXED_AMOUNT" ? "Fixed" : "Scale"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-bold">
                        <Calendar className="w-3 h-3 inline mr-1 mb-0.5 opacity-50" />
                        {months[inc.effectiveMonth - 1]} {inc.effectiveYear}
                      </p>
                      {inc.note && (
                        <p className="text-[10px] text-slate-400 italic bg-slate-50 p-2 rounded-lg mt-2">"{inc.note}"</p>
                      )}
                   </div>
                   
                   <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(inc.id)}
                      disabled={loadingId === inc.id}
                      className="h-9 w-9 p-0 rounded-xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                   >
                      <Trash2 className="w-4 h-4" />
                   </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-50 flex bg-white rounded-b-2xl">
          <Button 
            onClick={onClose}
            className="w-full rounded-xl h-10 text-xs font-black text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-900/20 transition-all"
          >
            {t("Done")}
          </Button>
        </div>
      </div>
    </div>
  );
}
