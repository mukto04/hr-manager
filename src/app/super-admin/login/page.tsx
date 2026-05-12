"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Key, Loader2, Eye, EyeOff } from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState({
    loginTitle: "AppDevs HR Master Access",
    loginSub: "Restricted to AppDevs Administrators only."
  });

  useEffect(() => {
    fetch("/api/super-admin/settings/public")
      .then(res => res.json())
      .then(data => {
        if (data.loginTitle) {
          setSettings({
            loginTitle: data.loginTitle,
            loginSub: data.loginSub
          });
        }
      })
      .catch(err => console.error("Failed to fetch login settings:", err));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/super-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      console.log("Super Admin Login Status:", res.status);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Unauthorized access.");
        return;
      }

      router.push("/super-admin/tenants");
      router.refresh();
    } catch (err: any) {
      console.error("Super Admin Login Error:", err);
      setError(`Connection error: ${err.message || 'Please try again'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="mx-auto w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20 ring-4 ring-red-600/10 animate-pulse">
          <ShieldAlert className="w-8 h-8 text-white" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">{settings.loginTitle}</h1>
          <p className="text-slate-500 text-sm">{settings.loginSub}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-red-500 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Master Password"
                className="w-full bg-black border border-slate-700 rounded-xl pl-11 pr-12 py-3 text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs bg-red-500/10 border border-red-500/20 py-2 rounded-lg animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-red-600/20 flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                Enter Command Center
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

