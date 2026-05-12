"use client";

import React from "react";
import { Lock, ShieldAlert, Rocket, MessageSquareText } from "lucide-react";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { useRouter } from "next/navigation";

interface ServiceGuardProps {
  id: "main_menu" | "attendance" | "leaves" | "finance" | "office_admin";
  children: React.ReactNode;
}

export function ServiceGuard({ id, children }: ServiceGuardProps) {
  const { data: session, loading } = useAsyncData<any>("/api/me", null);
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check if service is enabled (Default to true if permissions object doesn't exist yet)
  const isEnabled = session?.permissions?.[id] !== false;

  if (!isEnabled) {
    const slug = session?.slug;
    const landingHref = slug ? `/${slug}-hr` : "/";

    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-center relative group">
          {/* Top gradient bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />

          <div className="p-8 space-y-5 relative z-10">
            <div className="inline-flex p-4 rounded-full bg-red-50 border border-red-100">
              <Lock className="w-8 h-8 text-red-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Service Locked
              </h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                This module is not included in your current subscription plan.
              </p>
            </div>

            <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 inline-flex items-center gap-2 text-slate-600 font-medium text-sm">
              <MessageSquareText className="w-4 h-4 text-red-500 shrink-0" />
              <span>Please contact your provider to activate this module.</span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push(landingHref)}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg"
              >
                <Rocket className="w-4 h-4" />
                Request Activation
              </button>
              <button
                onClick={() => window.history.back()}
                className="text-slate-500 text-sm font-bold hover:text-slate-900 px-4"
              >
                Go Back
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border-t border-slate-100 py-4 px-6 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Security Protocol v2.4</span>
            <div className="flex items-center gap-1.5 grayscale opacity-50">
              <ShieldAlert className="w-3 h-3" />
              <span className="text-[10px] font-bold">Module ID: {id.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
