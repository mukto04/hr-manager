"use client";

import { Employee } from "@/types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Fingerprint, 
  CreditCard, 
  GraduationCap, 
  Heart, 
  Users,
  Briefcase,
  DollarSign
} from "lucide-react";
import { useGlobalSettings } from "@/components/providers/global-settings-provider";

interface CustomField {
  id: string;
  label: string;
  type: string;
  category: string;
}

export function EmployeeDetails({ 
  employee, 
  onClose,
  customFields 
}: { 
  employee: Employee & { customData?: any }; 
  onClose: () => void;
  customFields?: CustomField[];
}) {
  const { currencySymbol } = useGlobalSettings();
  const renderCustomFields = (category: string) => {
    if (!customFields || !employee.customData) return null;
    const data = employee.customData as Record<string, any>;
    
    return customFields
      .filter((f) => f.category === category && data[f.id])
      .map((field) => (
        <div key={field.id} className="group">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 group-hover:text-indigo-500 transition-colors">
            {field.label}
          </p>
          <p className="text-sm font-semibold text-slate-700 truncate">
            {data[field.id] || "—"}
          </p>
        </div>
      ));
  };

  const DetailItem = ({ label, value, icon: Icon, color = "indigo" }: any) => (
    <div className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
      <div className={`mt-0.5 h-8 w-8 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-700 truncate">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 -mt-2">
      {/* Premium Header Profile */}
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-16 -mt-16" />
        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-28 h-28 rounded-[2rem] bg-indigo-50 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
             {employee.image ? (
               <img src={employee.image} alt={employee.name} className="w-full h-full object-cover" />
             ) : (
               <span className="text-4xl font-black text-indigo-200">{employee.name.charAt(0)}</span>
             )}
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{employee.name}</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider self-center md:self-auto ${
                employee.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full mr-2 animate-pulse ${employee.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {employee.status}
              </span>
            </div>
            <p className="text-indigo-600 font-bold text-sm uppercase tracking-[0.15em] flex items-center justify-center md:justify-start gap-2">
              <Briefcase size={14} /> {employee.designation}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
               <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Fingerprint size={12} className="text-slate-400" /> ID: {employee.employeeCode}
               </div>
               <div className="h-1 w-1 rounded-full bg-slate-300" />
               <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Calendar size={12} className="text-slate-400" /> Join: {format(new Date(employee.joiningDate), "dd MMM yyyy")}
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Essential Info */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
            <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <User size={12} className="text-indigo-500" /> Primary Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DetailItem label="Email" value={employee.email} icon={Mail} />
              <DetailItem label="Phone" value={employee.phone} icon={Phone} color="emerald" />
              <DetailItem label="Department" value={employee.department} icon={Briefcase} color="blue" />
              <DetailItem label="Joining Date" value={format(new Date(employee.joiningDate), "dd MMM yyyy")} icon={Calendar} color="indigo" />
              <DetailItem label="Date of Birth" value={format(new Date(employee.dateOfBirth), "dd MMM yyyy")} icon={Calendar} color="amber" />
              
              {/* Basic Category Custom Fields */}
              {customFields?.filter(f => f.category === "basic" && (employee.customData as any)?.[f.id]).map(f => (
                <div key={f.id} className="p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{f.label}</p>
                  <p className="text-sm font-semibold text-slate-700">{(employee.customData as any)[f.id]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
            <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <ShieldCheck size={12} className="text-indigo-500" /> Identity & Records
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
              <div className="group">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Heart size={10} className="text-rose-500" /> Blood Group
                </p>
                <p className="text-sm font-black text-rose-600">{employee.bloodGroup || "—"}</p>
              </div>
              <div className="group">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                  <CreditCard size={10} className="text-indigo-500" /> NID Number
                </p>
                <p className="text-sm font-bold text-slate-800">{employee.nidNumber || "—"}</p>
              </div>
              <div className="group">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                  <GraduationCap size={10} className="text-emerald-500" /> Education
                </p>
                <p className="text-sm font-bold text-slate-800">{employee.educationStatus || "—"}</p>
              </div>
              
              {/* Identity Category Custom Fields */}
              {renderCustomFields("identity")}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
            <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Users size={12} className="text-indigo-500" /> Guardian & Family
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pb-2">
              <div className="group">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Guardian Name</p>
                <p className="text-sm font-bold text-slate-800">{employee.guardianName || "—"}</p>
              </div>
              <div className="group">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Relation</p>
                <p className="text-sm font-bold text-slate-800">{employee.guardianRelation || "—"}</p>
              </div>
              <div className="group">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Phone size={10} className="text-emerald-500" /> Contact
                </p>
                <p className="text-sm font-bold text-slate-800">{employee.guardianPhone || "—"}</p>
              </div>
              
              {/* Guardian Category Custom Fields */}
              {renderCustomFields("guardian")}
            </div>
          </div>
        </div>

        {/* Right Column: Financials & Others */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-200">
            <div className="flex items-center justify-between mb-6">
               <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <DollarSign size={20} />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Payroll</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1">Monthly Gross Salary</p>
            <h3 className="text-3xl font-black tracking-tighter">
              {currencySymbol}{employee.salaryStructure?.totalSalary?.toLocaleString() ?? 0}
            </h3>
            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
               <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-indigo-200 uppercase tracking-widest">Base Payout</span>
                  <span className="font-black">80%</span>
               </div>
               <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-[80%] rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
               </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Quick Stats</h4>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <p className="text-xs text-slate-500 font-bold">Joining Year</p>
                   <p className="text-xs font-black text-slate-900">{format(new Date(employee.joiningDate), "yyyy")}</p>
                </div>
                <div className="flex items-center justify-between">
                   <p className="text-xs text-slate-500 font-bold">Current Status</p>
                   <p className="text-[10px] font-black text-emerald-600 uppercase">Active Member</p>
                </div>
                <div className="flex items-center justify-between">
                   <p className="text-xs text-slate-500 font-bold">Sync Device ID</p>
                   <p className="text-xs font-black text-indigo-600">{employee.fingerprintId || "—"}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          type="button" 
          variant="secondary" 
          onClick={onClose}
          className="h-11 px-8 rounded-2xl bg-white border-slate-100 hover:bg-slate-50 text-slate-600 font-bold shadow-sm"
        >
          Close Profile
        </Button>
      </div>
    </div>
  );
}

// Add ShieldCheck icon since it's used in the code but not imported in the initial thought block
import { ShieldCheck } from "lucide-react";
