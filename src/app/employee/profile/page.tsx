"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { 
  User, Mail, Phone, Calendar, Fingerprint, Shield, 
  Users, GraduationCap, Briefcase, Droplets, CreditCard, 
  Camera, Loader2, CheckCircle2, Building2, MapPin 
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function EmployeeProfilePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const { t } = useTranslation();
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    fetch("/api/employee/me")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
      })
      .then(data => {
        setEmployee(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Profile fetch error:", err);
        setLoading(false);
      });
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        if (typeof window === 'undefined') return reject('Window not defined');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new window.Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.7));
          };
          img.onerror = reject;
        };
        reader.onerror = reject;
      });

      const res = await fetch("/api/employee/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressedBase64 }),
      });

      if (res.ok) {
        setEmployee({ ...employee, image: compressedBase64 });
        setSuccessMessage(t('Profile picture updated successfully!'));
      } else {
        const errData = await res.json();
        alert(t(errData.message || "Failed to upload image"));
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert(t("An unexpected error occurred during upload."));
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-2">
        <div className="h-48 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="h-96 bg-slate-50 rounded-2xl" />
           <div className="lg:col-span-2 h-96 bg-slate-50 rounded-2xl" />
        </div>
      </div>
    );
  }

  const InfoCard = ({ icon: Icon, label, value, colorClass = "text-indigo-600 bg-indigo-50" }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${colorClass} shrink-0`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t(label)}</p>
        <p className="font-bold text-slate-700 truncate text-[15px]">{value || t("Not Available")}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border border-white/10 animate-in slide-in-from-top-4">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-bold tracking-tight">{successMessage}</span>
        </div>
      )}
      {/* Header Profile Section */}
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
           <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest">{t("Active Personnel")}</span>
           </div>
        </div>

        {/* Photo Upload */}
        <div className="relative group shrink-0">
          <div className="h-32 w-32 rounded-2xl bg-slate-100 border-4 border-white shadow-xl overflow-hidden relative">
            {employee?.image ? (
              <img src={employee.image} alt={employee.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <User size={48} strokeWidth={1} />
              </div>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              {uploading ? <Loader2 size={24} className="animate-spin text-white" /> : <Camera size={24} className="text-white" />}
            </button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>

        <div className="text-center md:text-left space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{employee?.name}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-slate-500 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Briefcase size={16} className="text-indigo-500" />
              {employee?.designation}
            </div>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-indigo-500" />
              {employee?.department || t("Core Department")}
            </div>
            <div className="flex items-center gap-2">
              <Fingerprint size={16} className="text-indigo-500" />
              {t("ID")}: {employee?.employeeCode}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal Vitals */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl rounded-full" />
             <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-400 mb-8 flex items-center gap-2">
                <Shield size={14} /> {t("Identity Summary")}
             </h3>
             <div className="space-y-6 relative z-10">
                <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("Joined Since")}</p>
                   <p className="text-lg font-bold text-white tracking-tight">
                     {employee?.joiningDate ? t(format(new Date(employee.joiningDate), "MMMM")) + " " + format(new Date(employee.joiningDate), "dd, yyyy") : t("Not Set")}
                   </p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("Current Base")}</p>
                   <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-indigo-400" />
                      <p className="text-lg font-bold text-white tracking-tight">{employee?.companyName || t("Headquarters")}</p>
                   </div>
                </div>
                <div className="pt-6 border-t border-white/5">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("System Fingerprint")}</p>
                   <p className="text-2xl font-black font-mono text-indigo-400 tracking-tighter">#{employee?.fingerprintId || t("VOID")}</p>
                </div>
             </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
             <h3 className="text-lg font-bold text-slate-900 px-1">{t("Family & Emergency")}</h3>
             <div className="space-y-4">
                <InfoCard icon={Users} label="Guardian Name" value={employee?.guardianName} />
                <InfoCard icon={Shield} label="Relation" value={employee?.guardianRelation} colorClass="text-amber-600 bg-amber-50" />
                <InfoCard icon={Phone} label="Emergency Contact" value={employee?.guardianPhone} colorClass="text-emerald-600 bg-emerald-50" />
             </div>
          </div>
        </div>

        {/* Right Column: Detailed Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <InfoCard icon={Mail} label="Email Address" value={employee?.email} />
             <InfoCard icon={Phone} label="Personal Phone" value={employee?.phone} />
             <InfoCard icon={Calendar} label="Date of Birth" value={employee?.dateOfBirth ? format(new Date(employee.dateOfBirth), "dd") + " " + t(format(new Date(employee.dateOfBirth), "MMM")) + ", " + format(new Date(employee.dateOfBirth), "yyyy") : "-"} />
             <InfoCard icon={Droplets} label="Blood Group" value={employee?.bloodGroup} colorClass="text-rose-600 bg-rose-50" />
             <InfoCard icon={CreditCard} label="Government ID (NID)" value={employee?.nidNumber} colorClass="text-blue-600 bg-blue-50" />
             <InfoCard icon={GraduationCap} label="Academic Level" value={employee?.educationStatus} colorClass="text-emerald-600 bg-emerald-50" />
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-slate-900 px-1">{t("Employment Intelligence")}</h3>
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-5">
                   <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
                      <Briefcase size={24} />
                   </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t("Department")}</p>
                       <p className="font-bold text-slate-800 text-lg leading-tight">{employee?.department || t("General Operations")}</p>
                    </div>
                </div>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
                       <Building2 size={24} />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t("Assigned Role")}</p>
                       <p className="font-bold text-slate-800 text-lg leading-tight">{employee?.designation}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
