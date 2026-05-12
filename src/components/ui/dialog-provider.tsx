"use client";

import { ReactNode, createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle, Info, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** ── Types ── */
type DialogType = "confirm" | "alert" | "prompt" | "danger";

interface DialogState {
  open: boolean;
  type: DialogType;
  title: string;
  body?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  inputLabel?: string;
  inputValue?: string;
  resolve?: (value: boolean | string | null) => void;
}

interface DialogContextValue {
  confirm  : (title: string, body?: ReactNode) => Promise<boolean>;
  alert    : (title: string, body?: ReactNode) => Promise<void>;
  danger   : (title: string, body?: ReactNode) => Promise<boolean>;
  prompt   : (title: string, label?: string)   => Promise<string | null>;
}

/** ── Context ── */
const DialogContext = createContext<DialogContextValue | null>(null);

const INITIAL: DialogState = { open: false, type: "confirm", title: "" };

/** ── Provider (wrap your app root or layout with this) ── */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(INITIAL);

  const close = useCallback((value: boolean | string | null) => {
    state.resolve?.(value);
    setState(INITIAL);
  }, [state]);

  const confirm = useCallback((title: string, body?: ReactNode): Promise<boolean> =>
    new Promise(resolve =>
      setState({ open: true, type: "confirm", title, body, confirmText: "Confirm", cancelText: "Cancel", resolve: resolve as any })
    ), []);

  const danger = useCallback((title: string, body?: ReactNode): Promise<boolean> =>
    new Promise(resolve =>
      setState({ open: true, type: "danger", title, body, confirmText: "Yes, Delete", cancelText: "Cancel", resolve: resolve as any })
    ), []);

  const alert = useCallback((title: string, body?: ReactNode): Promise<void> =>
    new Promise(resolve =>
      setState({ open: true, type: "alert", title, body, confirmText: "OK", resolve: resolve as any })
    ), []);

  const prompt = useCallback((title: string, label = "Enter value"): Promise<string | null> =>
    new Promise(resolve =>
      setState({ open: true, type: "prompt", title, inputLabel: label, inputValue: "", confirmText: "OK", cancelText: "Cancel", resolve: resolve as any })
    ), []);

  return (
    <DialogContext.Provider value={{ confirm, alert, danger, prompt }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-fade-in">
            {/* ── Header ── */}
            <div className={`flex items-center gap-3 px-5 pt-5 pb-4 ${state.type === "danger" ? "border-b border-red-100" : "border-b border-slate-100"}`}>
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full
                ${state.type === "danger"  ? "bg-red-100 text-red-600"
                : state.type === "alert"   ? "bg-blue-100 text-blue-600"
                : "bg-amber-100 text-amber-600"}`}>
                {state.type === "danger"  ? <Trash2 className="h-5 w-5" />
                : state.type === "alert"  ? <CheckCircle className="h-5 w-5" />
                : <AlertTriangle className="h-5 w-5" />}
              </div>
              <h2 className="flex-1 text-base font-bold text-slate-900 leading-snug">{state.title}</h2>
              {state.type !== "alert" && (
                <button onClick={() => close(state.type === "prompt" ? null : false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* ── Body ── */}
            {(state.body || state.type === "prompt") && (
              <div className="px-5 py-4 text-sm text-slate-600 leading-relaxed">
                {state.body}
                {state.type === "prompt" && (
                  <div className="mt-3">
                    {state.inputLabel && <label className="block mb-1.5 font-medium text-slate-700">{state.inputLabel}</label>}
                    <input
                      autoFocus
                      type="text"
                      value={state.inputValue ?? ""}
                      onChange={e => setState(s => ({ ...s, inputValue: e.target.value }))}
                      onKeyDown={e => { if (e.key === "Enter") close(state.inputValue ?? ""); if (e.key === "Escape") close(null); }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Footer ── */}
            <div className="flex justify-end gap-2 px-5 pb-5 pt-2">
              {state.cancelText && (
                <Button variant="secondary" onClick={() => close(state.type === "prompt" ? null : false)}>
                  {state.cancelText}
                </Button>
              )}
              <Button
                variant={state.type === "danger" ? "danger" : "primary"}
                onClick={() => close(state.type === "prompt" ? (state.inputValue ?? "") : true)}
              >
                {state.confirmText ?? "OK"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

/** ── Hook to use inside any client component ── */
export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used inside <DialogProvider>");
  return ctx;
}
