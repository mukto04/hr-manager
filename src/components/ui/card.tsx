import { ReactNode } from "react";
import { cn } from "@/utils/classnames";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-soft", className)}>
      {children}
    </div>
  );
}
