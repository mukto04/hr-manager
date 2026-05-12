import { Card } from "@/components/ui/card";
import { AlertTriangle, ExternalLink } from "lucide-react";

export function ErrorState({ message }: { message: string }) {
  if (message.includes("ACCOUNT_FROZEN")) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl text-center border border-rose-100">
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
    <Card className="p-10 text-center text-sm text-rose-600 border-rose-100 bg-rose-50/50">
      {message}
    </Card>
  );
}
