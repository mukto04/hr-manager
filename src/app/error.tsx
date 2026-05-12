"use client";

import { useEffect } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error("Global Error Boundary Caught:", error);
  }, [error]);

  const isFrozen = error.message?.includes("ACCOUNT_FROZEN");

  if (isFrozen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl text-center border border-rose-100 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Service Suspended</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Your service is currently frozen. Please contact your service provider to renew your subscription and restore access.
          </p>
          <a
            href="https://www.appdevs.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full bg-brand-600 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-200"
          >
            Contact AppDevs UK <ExternalLink className="w-4 h-4 text-brand-200" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
        <div className="mx-auto w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-3">Something went wrong!</h2>
        <p className="text-slate-500 mb-6 text-sm">{error.message || "An unexpected error occurred."}</p>
        <Button onClick={() => reset()} className="w-full">
          Try again
        </Button>
      </div>
    </div>
  );
}
