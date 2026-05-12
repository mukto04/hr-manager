import { LucideIcon } from "lucide-react";
import { Card } from "./card";

export function StatCard({
  title,
  value,
  icon: Icon,
  helper,
  color = "blue"
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  helper?: string;
  color?: "blue" | "emerald" | "amber" | "rose" | "purple" | "indigo";
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };

  return (
    <Card className="p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
         <Icon className="h-24 w-24 rotate-12" />
      </div>
      
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
          <h3 className="text-3xl font-black tracking-tight text-slate-900 pt-2">{value}</h3>
          {helper && (
            <p className="text-[10px] font-bold text-slate-400 pt-1 flex items-center gap-1">
               <span className="w-1 h-1 rounded-full bg-slate-300" />
               {helper}
            </p>
          )}
        </div>
        <div className={`rounded-2xl border p-3.5 transition-transform duration-500 group-hover:rotate-12 ${colorMap[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}
