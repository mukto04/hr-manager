"use client";

import { useState, useEffect } from "react";
import { Lock, ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, KeyRound, ArrowRight, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/utils/classnames";

interface FinancialSecurityGuardProps {
  children: React.ReactNode;
}

export function FinancialSecurityGuard({ children }: FinancialSecurityGuardProps) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [mode, setMode] = useState<"VERIFY" | "SETUP" | "RESET">("VERIFY");
  
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const { t } = useTranslation();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setError("");
    try {
      const res = await fetch("/api/auth/security-pin");
      if (res.ok) {
        const data = await res.json();
        setAuthorized(data.authorized);
        setHasPin(data.hasPin);
        // If no PIN exists, force SETUP mode
        if (!data.hasPin) {
          setMode("SETUP");
        } else {
          setMode("VERIFY");
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(t(data.message || "Authentication failed. Please reload."));
      }
    } catch (err) {
      console.error("Security status check failed:", err);
      setError(t("Connection error. Please check your internet."));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/security-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode.toLowerCase(),
          password,
          pin,
          newPin
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAuthorized(true);
        setHasPin(true);
        setError("");
        // Reset fields
        setPin("");
        setPassword("");
        setNewPin("");
      } else {
        setError(t(data.message || "Invalid credentials"));
      }
    } catch (err) {
      setError(t("Failed to connect to server"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">{t("Securing workspace...")}</p>
      </div>
    );
  }

  if (authorized) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4 sm:p-6">
      <div className="w-full max-w-[440px] bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-8 sm:p-12 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-rose-50 rounded-full blur-3xl opacity-50" />

        <div className="relative space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl mb-2 transition-colors duration-500",
              mode === "SETUP" ? "bg-amber-500 text-white shadow-amber-500/20" : 
              mode === "RESET" ? "bg-rose-500 text-white shadow-rose-500/20" :
              "bg-indigo-600 text-white shadow-indigo-600/20"
            )}>
              {mode === "SETUP" ? <KeyRound size={36} /> : mode === "RESET" ? <RefreshCcw size={36} /> : <ShieldCheck size={36} />}
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {mode === "SETUP" ? t("Security Setup") : mode === "RESET" ? t("Reset Access PIN") : t("Financial Security")}
              </h2>
              <p className="text-slate-500 text-sm font-medium px-4">
                {mode === "SETUP" 
                  ? t("Create a secondary PIN to protect your financial data.") 
                  : mode === "RESET" 
                  ? t("Enter your portal password to verify identity and set a new PIN.")
                  : t("Please enter your access PIN to continue.")}
              </p>
            </div>
          </div>

          <form onSubmit={handleAction} className="space-y-6">
            {(mode === "SETUP" || mode === "RESET") && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t("Your Portal Password")}</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t("Enter password")}
                    className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600/30 transition-all outline-none text-sm font-semibold"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                {mode === "RESET" ? t("New Security PIN") : mode === "SETUP" ? t("Set Security PIN") : t("Security PIN")}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyRound size={18} />
                </div>
                <input 
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  maxLength={6}
                  value={mode === "RESET" ? newPin : pin}
                  onChange={e => mode === "RESET" ? setNewPin(e.target.value) : setPin(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600/30 transition-all outline-none text-2xl font-black tracking-[0.5em] placeholder:tracking-normal placeholder:text-slate-300"
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-2.5 animate-in shake duration-300">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Button 
                type="submit" 
                disabled={submitting}
                className={cn(
                  "w-full h-14 rounded-2xl text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98]",
                  mode === "SETUP" ? "bg-amber-600 hover:bg-amber-700" : "bg-slate-900 hover:bg-black"
                )}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    {mode === "SETUP" ? t("Set Protection") : mode === "RESET" ? t("Update PIN") : t("Unlock Access")}
                    <ArrowRight size={18} />
                  </div>
                )}
              </Button>

              {/* Recovery / Navigation Options */}
              <div className="flex flex-col items-center gap-3 pt-2">
                {hasPin ? (
                  <button 
                    type="button"
                    onClick={() => {
                       setMode(mode === "VERIFY" ? "RESET" : "VERIFY");
                       setError("");
                    }}
                    className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                  >
                    {mode === "VERIFY" ? t("Forgot Security PIN?") : t("Back to Unlock")}
                  </button>
                ) : (
                  mode === "VERIFY" && (
                    <button 
                      type="button"
                      onClick={() => setMode("SETUP")}
                      className="text-[10px] font-black text-slate-400 hover:text-amber-600 uppercase tracking-widest transition-colors"
                    >
                      {t("First time? Set up your PIN")}
                    </button>
                  )
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
