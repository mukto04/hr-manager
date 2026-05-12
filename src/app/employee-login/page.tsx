"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Lock, User, Building2, Loader2, Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

function EmployeeLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { t } = useTranslation();
  
  // Try to get slug from multiple sources
  const slugFromUrl = searchParams.get("slug") || 
                    (pathname.endsWith("-employee") ? pathname.replace("-employee", "").split("/").pop() : "");

  const [slug, setSlug] = useState(slugFromUrl || "");
  const [companyName, setCompanyName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [employeeImage, setEmployeeImage] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(!!slugFromUrl);
  const [fetchingAvatar, setFetchingAvatar] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Resolution effect for branded URLs
  useEffect(() => {
    if (slugFromUrl) {
      resolveBranding(slugFromUrl);
    }
  }, [slugFromUrl]);

  // Real-time avatar resolution
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (slug && employeeCode.length >= 2) {
      timer = setTimeout(() => {
        fetchAvatar(slug, employeeCode);
      }, 500);
    } else {
      setEmployeeImage("");
    }
    return () => clearTimeout(timer);
  }, [employeeCode, slug]);

  async function fetchAvatar(slugCode: string, empCode: string) {
    try {
      setFetchingAvatar(true);
      const res = await fetch(`/api/public/employee-avatar/${slugCode}/${empCode}`);
      if (res.ok) {
        const data = await res.json();
        setEmployeeImage(data.image || "");
        if (data.name) setCompanyName(data.name); // Show individual name as secondary branding
      } else {
        setEmployeeImage("");
      }
    } catch (err) {
      setEmployeeImage("");
    } finally {
      setFetchingAvatar(false);
    }
  }

  async function resolveBranding(code: string) {
    try {
      setResolving(true);
      setNotFound(false);
      const res = await fetch(`/api/tenant/resolve/${code.toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        setCompanyName(data.companyName);
        setSlug(data.slug);
      } else if (res.status === 404) {
        setNotFound(true);
      }
    } catch (err) {
      console.error("Employee portal branding resolution failed", err);
    } finally {
      setResolving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) {
      setError(t("Company identity is missing. Please use your unique company link."));
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/employee-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, employeeCode, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(t(data.message || "Invalid credentials."));
        return;
      }

      const callbackUrl = searchParams.get("redirect");
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        router.push("/employee/dashboard");
      }
      router.refresh();
    } catch {
      setError(t("Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  // --- Render Switch for Context States ---

  // 1. Missing Slug State
  if (!slugFromUrl && !resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-6 text-center selection:bg-indigo-500/30">
        <div className="relative w-full max-w-sm">
           <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl space-y-8">
              <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 mx-auto text-amber-500">
                 <AlertCircle size={36} strokeWidth={1.5} />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-white tracking-tight">{t("Access Restricted")}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t("Please use your company's unique portal link to sign in.")}
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all" 
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 w-4 h-4" /> {t("Go Back")}
              </Button>
           </div>
        </div>
      </div>
    );
  }

  // 2. Company Not Found State
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-6 text-center">
        <div className="relative w-full max-w-sm">
           <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl space-y-8">
              <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 mx-auto text-red-500">
                 <Building2 size={36} strokeWidth={1.5} />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-white tracking-tight">{t("Portal Not Found")}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                   {t("We couldn't find an active portal for")} <span className="text-red-400 font-bold">"{slugFromUrl}"</span>.
                </p>
              </div>
              <Button 
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/20" 
                onClick={() => window.location.reload()}
              >
                {t("Reload Page")}
              </Button>
           </div>
        </div>
      </div>
    );
  }

  // 3. Main Login Form (Branded)
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] p-6 selection:bg-indigo-500/30">
      {/* Subtle Depth Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative w-full max-w-[460px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Brand Header */}
        <div className="mb-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20 p-0.5 relative">
             <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/10 to-transparent opacity-50" />
             <div className="h-full w-full rounded-2xl overflow-hidden relative bg-indigo-600 flex items-center justify-center">
                {employeeImage ? (
                  <img src={employeeImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-white/80" strokeWidth={1.5} />
                )}
             </div>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">{t("Employee Portal")}</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2">
               <span className="h-px w-3 bg-slate-800" />
               {companyName || "AppDevs Infrastructure"}
               <span className="h-px w-3 bg-slate-800" />
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] relative">
          <form onSubmit={handleSubmit} autoComplete="on" className="space-y-6">
            {/* Employee ID */}
            <div className="space-y-2">
              <label htmlFor="employeeCode" className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                {t("Identity Code")}
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                   <User size={18} />
                </div>
                <input
                  id="employeeCode"
                  name="employeeCode"
                  type="text"
                  required
                  value={employeeCode}
                  onChange={e => setEmployeeCode(e.target.value)}
                  placeholder="EMP-XXXX"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/20 border border-white/5 text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                {t("Access Key")}
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-black/20 border border-white/5 text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-xs text-red-400 font-medium flex items-center gap-2.5">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || resolving}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98] text-sm uppercase tracking-widest"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2.5">
                   <Loader2 size={18} className="animate-spin" />
                   {t("Processing...")}
                </div>
              ) : t("Sign In")}
            </Button>
          </form>
        </div>

        {/* System Footer */}
        <div className="mt-10 text-center space-y-4">
           <div className="flex items-center justify-center gap-4 opacity-10">
              <div className="h-px w-8 bg-white" />
              <div className="h-px w-8 bg-white" />
           </div>
           <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">
             © {new Date().getFullYear()} {companyName || "AppDevs"} · {t("Enterprise HR Solutions")}
           </p>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A]">
        <div className="relative">
           <div className="w-16 h-16 rounded-full border-2 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 animate-pulse"></div>
           </div>
        </div>
      </div>
    }>
      <EmployeeLoginContent />
    </Suspense>
  );
}

