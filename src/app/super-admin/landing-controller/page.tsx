"use client";

import React, { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { 
  Globe, 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  Zap,
  DollarSign,
  RefreshCcw,
  Upload,
  Palette,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Layout,
  ExternalLink,
  Target,
  X
} from "lucide-react";

const toPascalCase = (str: string) => {
  if (!str) return "";
  return str
    .split(/[-_ ]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

const LucideIcon = ({ name, className }: { name: string, className?: string }) => {
  const normalizedName = toPascalCase(name);
  const IconComponent = (LucideIcons as any)[normalizedName] || (LucideIcons as any)[name] || LucideIcons.Zap;
  return <IconComponent className={className} />;
};

import { useToastStore } from "@/lib/store/use-toast-store";

export default function LandingControllerPage() {
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"branding" | "hero" | "stats" | "features" | "pricing" | "corporate" | "footer">("branding");
  const { showToast } = useToastStore();
  
  // Content States
  const [branding, setBranding] = useState({
    siteTitle: "AppDevs HR Dashboard",
    siteDescription: "Modern HR Management Dashboard built with Next.js, Tailwind CSS, TypeScript and Prisma.",
    primaryColor: "#2563eb",
    logo: "/logo.png",
    favicon: "/favicon.png"
  });

  const [hero, setHero] = useState({
    title: "Revolutionize Your HR Operations",
    subtitle: "The all-in-one HR Management System designed for modern businesses. Automate attendance, payroll, and employee life-cycles in one sleek platform.",
    cta: "Contact Support",
    ctaLink: "https://wa.me/8801739748004",
    mockupImg: "/hr_dashboard_mockup_new.png"
  });

  const [stats, setStats] = useState([
    { label: "Uptime SLA", val: "99.9%" },
    { label: "Active Tenants", val: "500+" },
    { label: "Support", val: "24/7" },
    { label: "Encryption", val: "AES-256" }
  ]);

  const [features, setFeatures] = useState([
    { title: "Employee Management", desc: "Manage onboarding, employee documents, and profiles in one centralized database.", icon: "Users" },
    { title: "Biometric Attendance", desc: "Real-time attendance sync with ZKTeco and physical biometric machines.", icon: "Clock" },
    { title: "Automated Payroll", desc: "Calculate salaries, manageable structures, and monthly payments with one click.", icon: "CreditCard" },
    { title: "Loans & Advances", desc: "Specifically track employee loans and advance salaries with automated deductions.", icon: "Shield" },
    { title: "Leave & Holidays", desc: "Full control over leave balances, holidays, and manual attendance requests.", icon: "PieChart" },
    { title: "Office Cost Tracking", desc: "Monitor daily expenses and maintain financial transparency for the office.", icon: "Briefcase" }
  ]);

  const [yearlyDiscount, setYearlyDiscount] = useState("20");

  const [pricing, setPricing] = useState([
    { name: "Starter", price: "$19", employees: "25", features: ["Employee Management", "Biometric Attendance", "Automated Payroll", "Loans & Advances", "Leave & Holidays"] },
    { name: "Growth", price: "$49", employees: "100", features: ["Employee Management", "Biometric Attendance", "Automated Payroll", "Loans & Advances", "Leave & Holidays", "Office Cost Tracking"] },
    { name: "Enterprise", price: "$99", employees: "300", features: ["Employee Management", "Biometric Attendance", "Automated Payroll", "Loans & Advances", "Leave & Holidays", "Office Cost Tracking","Company Spreadsheet"] }
  ]);

  const [corporate, setCorporate] = useState({
    title: "Master HR Management",
    titleAccent: "Without the Complexity",
    description: "Manage 10 to 10,000 employees with the same level of granular control. Our platform handles the \"noisy\" administrative tasks so you can focus on building your culture.",
    bullets: [
      "Granular Role-Based Access Control",
      "Automated Leave Compliance",
      "Smart Loan & Advance Deduction",
      "Interactive Attendance Reports"
    ],
    metrics: [
      { label: "Payroll Processing", efficiency: "98%", color: "" },
      { label: "Attendance Accuracy", efficiency: "100%", color: "#10b981" },
      { label: "Admin Time Saved", efficiency: "85%", color: "#a855f7" }
    ],
    testimonial: {
      quote: "It transformed our chaotic payroll into a 10-minute task.",
      author: "Sarah Jenkins",
      role: "Head of Operations, TechFlow"
    }
  });

  const [footer, setFooter] = useState({
    copyright: "© 2026 AppDevs HR Framework. All rights reserved.",
    description: "Empowering organizations with intelligent and intuitive HR infrastructure.",
    email: "support@appdevs.net",
    facebook: "https://facebook.com",
    twitter: "https://twitter.com",
    linkedin: "https://linkedin.com",
    whatsapp: "https://wa.me/8801739748004",
    columns: [
      {
        title: "Product",
        links: [
          { label: "Features", url: "#" },
          { label: "Integrations", url: "#" },
          { label: "Security", url: "#" }
        ]
      },
      {
        title: "Company",
        links: [
          { label: "About Us", url: "#" },
          { label: "Blog", url: "#" },
          { label: "Privacy", url: "#" }
        ]
      },
      {
        title: "Support",
        links: [
          { label: "Contact", url: "#" },
          { label: "Documentation", url: "#" },
          { label: "Status", url: "#" }
        ]
      }
    ]
  });

  useEffect(() => {
    fetchContent();
  }, []);

  async function fetchContent() {
    try {
      const res = await fetch("/api/super-admin/landing-page");
      const data = await res.json();
      if (typeof data === 'object') {
        if (data.BRANDING) setBranding(prev => ({...prev, ...data.BRANDING}));
        if (data.HERO) setHero(prev => ({...prev, ...data.HERO}));
        if (data.STATS) setStats(data.STATS);
        if (data.FEATURES) setFeatures(data.FEATURES);
        if (data.CORPORATE) setCorporate(prev => ({...prev, ...data.CORPORATE}));
        if (data.FOOTER) setFooter(prev => ({...prev, ...data.FOOTER}));
        if (data.PRICING) {
           if (Array.isArray(data.PRICING)) {
              setPricing(data.PRICING);
           } else {
              setPricing(data.PRICING.plans || []);
              if (data.PRICING.yearlyDiscount) setYearlyDiscount(data.PRICING.yearlyDiscount);
           }
        }
      }
    } catch (e) {
      console.error("Failed to fetch landing page content");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(file: File, type: "LOGO" | "FAVICON" | "MOCKUP") {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/super-admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        if (type === "LOGO") setBranding({...branding, logo: data.url});
        if (type === "FAVICON") setBranding({...branding, favicon: data.url});
        if (type === "MOCKUP") setHero({...hero, mockupImg: data.url});
      }
    } catch (e) {
      alert("File upload failed");
    }
  }

  async function saveSection(section: string, content: any) {
    setSavingSection(section);
    try {
      const res = await fetch("/api/super-admin/landing-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, content }),
      });
      if (res.ok) {
        showToast(`${section} saved successfully!`, "success");
      } else {
        showToast(`Failed to save ${section}. Something went wrong.`, "error");
      }
    } catch (e) {
      showToast(`Error connecting to server. Please try again.`, "error");
    } finally {
      setSavingSection(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-20 w-full animate-fade-in">
      {/* Header */}
      <div className="relative group overflow-hidden bg-slate-900 shadow-xl p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <Globe className="w-24 h-24 text-red-500 -rotate-12 translate-x-4 -translate-y-4" />
        </div>
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-2.5 rounded-2xl shadow-lg ring-4 ring-red-600/10 shrink-0">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Landing Controller</h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                 <Zap className="w-3 h-3 text-yellow-500" />
                 Visual Identity Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
             <a href="/" target="_blank" className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all border border-slate-700">
                <ExternalLink className="w-4 h-4" /> Live View
             </a>
             <button onClick={fetchContent} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-xs font-bold rounded-xl transition-all border border-red-500/20">
                <RefreshCcw className="w-4 h-4" /> Sync
             </button>
          </div>
        </div>
      </div>

      {/* Tabs System */}
      <div className="flex gap-1.5 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-fit overflow-x-auto max-w-full backdrop-blur-sm">
        {[
          { id: "branding", label: "Branding", icon: <Palette className="w-3.5 h-3.5" /> },
          { id: "hero", label: "Hero", icon: <Zap className="w-3.5 h-3.5" /> },
          { id: "stats", label: "Stats", icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { id: "features", label: "Features", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
          { id: "corporate", label: "Corporate", icon: <Globe className="w-3.5 h-3.5" /> },
          { id: "pricing", label: "Pricing", icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: "footer", label: "Footer", icon: <Layout className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? "bg-slate-100 text-black shadow-lg" 
                : "text-slate-500 hover:text-white hover:bg-slate-800"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-[32px] shadow-2xl p-6 sm:p-8 backdrop-blur-md min-h-[500px]">
        
        {/* BRANDING */}
        {activeTab === "branding" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                   <Palette className="w-5 h-5 text-red-500" />
                   <h2 className="text-lg font-bold text-white uppercase tracking-wider">Visual Identity & SEO</h2>
                </div>
                <button 
                  onClick={() => saveSection("BRANDING", branding)}
                  disabled={savingSection === "BRANDING"}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-red-600/10"
                >
                  {savingSection === "BRANDING" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Branding
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Site Name (Tab Title)</label>
                  <input 
                    value={branding.siteTitle}
                    onChange={e => setBranding({...branding, siteTitle: e.target.value})}
                    className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-red-600 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">SEO Description</label>
                  <input 
                    value={branding.siteDescription}
                    onChange={e => setBranding({...branding, siteDescription: e.target.value})}
                    className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-red-600 outline-none transition-all"
                  />
                </div>
             </div>

             <div className="space-y-6">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Primary Brand Color</label>
                   <div className="flex gap-3">
                      <div className="relative w-12 h-12 rounded-xl border border-slate-800 flex-shrink-0 overflow-hidden shadow-inner group">
                         <div className="absolute inset-0 transition-transform group-hover:scale-110 duration-500" style={{ backgroundColor: branding.primaryColor }} />
                         <input 
                           type="color" 
                           value={branding.primaryColor}
                           onChange={e => setBranding({...branding, primaryColor: e.target.value})}
                           className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                         />
                      </div>
                      <input 
                        type="text" 
                        value={branding.primaryColor}
                        onChange={e => setBranding({...branding, primaryColor: e.target.value})}
                        className="flex-1 bg-black/40 border border-slate-800 rounded-xl px-4 text-sm text-white focus:ring-1 focus:ring-red-600 outline-none transition-all uppercase"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Main Logo</label>
                      <div className="relative group aspect-video bg-slate-800/50 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden">
                         <img src={branding.logo} className="h-12 w-auto object-contain transition-opacity group-hover:opacity-40" />
                         <label className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                            <div className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-[10px] font-bold uppercase shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                               <Upload className="w-3 h-3 text-red-600" /> Change Logo
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], "LOGO")} />
                         </label>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Favicon (32x32)</label>
                      <div className="relative group aspect-video bg-slate-800/50 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden">
                         <img src={branding.favicon} className="w-8 h-8 object-contain transition-opacity group-hover:opacity-40" />
                         <label className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                            <div className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-[10px] font-bold uppercase shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                               <Upload className="w-3 h-3 text-red-600" /> Change Icon
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], "FAVICON")} />
                         </label>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* HERO SECTION */}
        {activeTab === "hero" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                   <Zap className="w-5 h-5 text-yellow-500" />
                   <h2 className="text-lg font-bold text-white uppercase tracking-wider">Hero Section Control</h2>
                </div>
                <button 
                  onClick={() => saveSection("HERO", hero)}
                  disabled={savingSection === "HERO"}
                  className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-yellow-600/10"
                >
                  {savingSection === "HERO" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Hero
                </button>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Headline</label>
                      <textarea value={hero.title} onChange={e => setHero({...hero, title: e.target.value})} className="w-full bg-black/40 border border-slate-800 rounded-xl p-4 text-white text-base h-24 focus:ring-1 focus:ring-yellow-600 outline-none transition-all" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Description</label>
                      <textarea value={hero.subtitle} onChange={e => setHero({...hero, subtitle: e.target.value})} className="w-full bg-black/40 border border-slate-800 rounded-xl p-4 text-slate-400 text-sm h-32 focus:ring-1 focus:ring-yellow-600 outline-none transition-all leading-relaxed" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">CTA Text</label>
                        <input value={hero.cta} onChange={e => setHero({...hero, cta: e.target.value})} className="w-full bg-black/40 border border-slate-800 rounded-xl p-3 text-sm text-white" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">CTA Link</label>
                        <input value={hero.ctaLink} onChange={e => setHero({...hero, ctaLink: e.target.value})} className="w-full bg-black/40 border border-slate-800 rounded-xl p-3 text-sm text-white" />
                      </div>
                   </div>
                </div>
                <div className="lg:col-span-5">
                   <div className="bg-black/30 rounded-3xl border border-slate-800 p-6 space-y-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Mockup Image</label>
                      <div className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-slate-800">
                         <img src={hero.mockupImg} className="w-full h-40 object-cover opacity-60 group-hover:opacity-100 transition-all" />
                         <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                            <div className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-[10px] font-bold uppercase">
                               <Upload className="w-3 h-3" /> Change Image
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], "MOCKUP")} />
                         </label>
                      </div>
                      <p className="text-[9px] text-slate-600 text-center">Recommended: 1200x800px PNG/JPG</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* STATS SECTION */}
        {activeTab === "stats" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                   <BarChart3 className="w-5 h-5 text-cyan-500" />
                   <h2 className="text-lg font-bold text-white uppercase tracking-wider">Metrics & Performance</h2>
                </div>
                <button onClick={() => saveSection("STATS", stats)} className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-cyan-600/10">
                   <Save className="w-4 h-4" /> Save Statistics
                </button>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-black/30 p-5 rounded-2xl border border-slate-800 space-y-4 relative group">
                     <button onClick={() => setStats(stats.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                     </button>
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest ml-1">Value</label>
                        <input value={stat.val} onChange={e => {
                           const newStats = [...stats];
                           newStats[i].val = e.target.value;
                           setStats(newStats);
                        }} className="w-full bg-slate-900/50 text-white text-2xl font-black px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500 transition-all" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest ml-1">Label</label>
                        <input value={stat.label} onChange={e => {
                           const newStats = [...stats];
                           newStats[i].label = e.target.value;
                           setStats(newStats);
                        }} className="w-full bg-transparent text-slate-400 font-bold uppercase tracking-widest text-[10px] px-3 py-1 outline-none" />
                     </div>
                  </div>
                ))}
                <button onClick={() => setStats([...stats, { label: "NEW STAT", val: "100%" }])} className="border border-dashed border-slate-700 bg-slate-800/10 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-600 hover:text-white hover:border-slate-500 transition-all group">
                   <div className="bg-slate-800 p-2 rounded-lg group-hover:bg-cyan-600/10 transition-colors">
                      <Plus className="w-5 h-5 group-hover:text-cyan-500 transition-colors" />
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-widest mt-3">Add Statistic</span>
                </button>
             </div>
          </div>
        )}

        {/* FEATURES GRID */}
        {activeTab === "features" && (
           <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                   <CheckCircle2 className="w-5 h-5 text-rose-500" />
                   <h2 className="text-lg font-bold text-white uppercase tracking-wider">Features Architecture</h2>
                </div>
                <button onClick={() => saveSection("FEATURES", features)} className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-600/10">
                   <Save className="w-4 h-4" /> Save Features
                </button>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {features.map((feature, i) => (
                   <div key={i} className="bg-black/30 p-6 rounded-3xl border border-slate-800 space-y-6 relative group">
                      <button onClick={() => setFeatures(features.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 p-2 text-slate-700 hover:text-red-500 transition-colors">
                         <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex flex-col sm:flex-row gap-6">
                         <div className="sm:w-32 space-y-2">
                            <label className="text-[9px] font-bold text-slate-600 uppercase">Icon</label>
                            <div className="relative group/icon">
                               <input 
                                 value={feature.icon}
                                 onChange={e => {
                                    const f = [...features];
                                    f[i].icon = e.target.value;
                                    setFeatures(f);
                                 }}
                                 className="w-full bg-slate-900/50 text-white text-[10px] rounded-lg p-2.5 pl-9 outline-none border border-slate-800 focus:border-rose-500 transition-all"
                               />
                               <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-500">
                                  <LucideIcon name={feature.icon} className="w-4 h-4" />
                                </div>
                            </div>
                         </div>
                         <div className="flex-1 space-y-4">
                            <input value={feature.title} onChange={e => {
                               const f = [...features];
                               f[i].title = e.target.value;
                               setFeatures(f);
                            }} placeholder="Feature Title" className="w-full bg-transparent text-white font-bold outline-none focus:text-rose-500 transition-colors" />
                            <textarea value={feature.desc} onChange={e => {
                               const f = [...features];
                               f[i].desc = e.target.value;
                               setFeatures(f);
                            }} placeholder="Description..." className="w-full bg-transparent text-slate-500 text-xs outline-none h-16 resize-none leading-relaxed" />
                         </div>
                      </div>
                   </div>
                ))}
                <button onClick={() => setFeatures([...features, { title: "NEW FEATURE", desc: "Short desc", icon: "Zap" }])} className="border border-dashed border-slate-700 bg-slate-800/10 rounded-3xl flex flex-col items-center justify-center p-8 text-slate-600 hover:text-white hover:border-slate-500 transition-all group">
                   <div className="bg-slate-800 p-3 rounded-xl group-hover:bg-rose-600/10 transition-colors">
                      <Plus className="w-6 h-6 group-hover:text-rose-500 transition-colors" />
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-widest mt-4">Add New Feature</span>
                </button>
             </div>
           </div>
        )}

        {/* CORPORATE INFO */}
        {activeTab === "corporate" && (
           <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                   <Target className="w-5 h-5 text-blue-500" />
                   <h2 className="text-lg font-bold text-white uppercase tracking-wider">Corporate Content</h2>
                </div>
                <button 
                  onClick={() => saveSection("CORPORATE", corporate)}
                  disabled={savingSection === "CORPORATE"}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/10"
                >
                  {savingSection === "CORPORATE" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Corporate
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                 <div className="lg:col-span-7 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Title</label>
                          <input value={corporate.title} onChange={e => setCorporate({...corporate, title: e.target.value})} className="w-full bg-black/40 border border-slate-800 rounded-xl p-3 text-sm text-white" />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Accent Text</label>
                          <input value={corporate.titleAccent} onChange={e => setCorporate({...corporate, titleAccent: e.target.value})} className="w-full bg-black/40 border border-slate-800 rounded-xl p-3 text-sm text-blue-400" />
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Description</label>
                       <textarea value={corporate.description} onChange={e => setCorporate({...corporate, description: e.target.value})} className="w-full bg-black/40 border border-slate-800 rounded-xl p-4 text-slate-400 text-sm h-24" />
                    </div>
                    <div className="bg-black/30 p-5 rounded-2xl border border-slate-800 space-y-3">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Core Competencies (List)</label>
                       <textarea value={corporate.bullets.join("\n")} onChange={e => setCorporate({...corporate, bullets: e.target.value.split("\n").filter(b => b.trim())})} className="w-full bg-transparent text-slate-300 text-xs h-32 focus:ring-0 outline-none leading-relaxed" placeholder="One per line..." />
                    </div>
                 </div>

                 <div className="lg:col-span-5 space-y-6">
                    <div className="space-y-4">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Success Metrics</label>
                       {corporate.metrics.map((m, i) => (
                          <div key={i} className="flex gap-3 items-center bg-black/40 p-3 rounded-xl border border-slate-800 group">
                             <input value={m.label} onChange={e => {
                                const newM = [...corporate.metrics];
                                newM[i].label = e.target.value;
                                setCorporate({...corporate, metrics: newM});
                             }} className="bg-transparent flex-1 text-xs text-white outline-none" />
                             <input value={m.efficiency} onChange={e => {
                                const newM = [...corporate.metrics];
                                newM[i].efficiency = e.target.value;
                                setCorporate({...corporate, metrics: newM});
                             }} className="bg-slate-800 w-16 text-center py-1 rounded text-[10px] font-black text-blue-400 outline-none" />
                             <button onClick={() => setCorporate({...corporate, metrics: corporate.metrics.filter((_, idx) => idx !== i)})} className="text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                       ))}
                       <button onClick={() => setCorporate({...corporate, metrics: [...corporate.metrics, { label: "New Metric", efficiency: "90%", color: "" }]})} className="w-full py-2 bg-slate-800/40 border border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-tighter">+ Add Success Metric</button>
                    </div>

                    <div className="bg-blue-600/5 p-6 rounded-3xl border border-blue-600/10 space-y-4">
                       <label className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest block">Executive Testimonial</label>
                       <textarea value={corporate.testimonial.quote} onChange={e => setCorporate({...corporate, testimonial: {...corporate.testimonial, quote: e.target.value}})} className="w-full bg-transparent text-white text-xs italic outline-none leading-relaxed" placeholder="Client feedback..." />
                      <div className="flex gap-3 pt-2 border-t border-blue-600/10">
                          <input value={corporate.testimonial.author} onChange={e => setCorporate({...corporate, testimonial: {...corporate.testimonial, author: e.target.value}})} className="bg-transparent text-[10px] font-bold text-white outline-none w-1/2" placeholder="Name" />
                          <input value={corporate.testimonial.role} onChange={e => setCorporate({...corporate, testimonial: {...corporate.testimonial, role: e.target.value}})} className="bg-transparent text-[10px] text-blue-500 outline-none w-1/2" placeholder="Role" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* PRICING PLANS */}
        {activeTab === "pricing" && (
           <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                       <DollarSign className="w-5 h-5 text-emerald-500" />
                       <h2 className="text-lg font-bold text-white uppercase tracking-wider">Revenue Model</h2>
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 border border-slate-800 px-3 py-1.5 rounded-xl">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Yearly Save %</label>
                       <input 
                         type="text"
                         value={yearlyDiscount}
                         onChange={e => setYearlyDiscount(e.target.value)}
                         className="bg-transparent w-8 text-center text-xs font-black text-emerald-500 outline-none"
                       />
                    </div>
                 </div>
                <button onClick={() => saveSection("PRICING", { plans: pricing, yearlyDiscount })} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/10">
                   <Save className="w-4 h-4" /> Save Pricing
                </button>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {pricing.map((plan, i) => (
                  <div key={i} className="bg-black/30 p-6 rounded-3xl border border-slate-800 space-y-6 relative group">
                      <button onClick={() => setPricing(pricing.filter((_, idx) => idx !== i))} className="absolute top-4 right-4 p-2 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                         <Trash2 className="w-4 h-4" />
                      </button>
                      <input value={plan.name} onChange={e => {
                         const p = [...pricing];
                         p[i].name = e.target.value;
                         setPricing(p);
                      }} className="w-full bg-transparent text-xl font-black text-white outline-none focus:text-emerald-500 transition-colors" placeholder="Plan Name" />
                      
                      <div className="flex gap-4">
                         <div className="flex-1 space-y-1">
                           <label className="text-[9px] font-bold text-slate-600 uppercase">Monthly</label>
                           <input value={plan.price} onChange={e => {
                              const p = [...pricing];
                              p[i].price = e.target.value;
                              setPricing(p);
                           }} className="bg-slate-900/50 p-3 rounded-xl text-emerald-500 font-bold text-sm outline-none w-full border border-slate-800" />
                         </div>
                         <div className="flex-1 space-y-1">
                           <label className="text-[9px] font-bold text-slate-600 uppercase">Capacity</label>
                           <input value={plan.employees} onChange={e => {
                              const p = [...pricing];
                              p[i].employees = e.target.value;
                              setPricing(p);
                           }} className="bg-slate-900/50 p-3 rounded-xl text-white font-bold text-sm outline-none w-full border border-slate-800" />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-bold text-slate-600 uppercase">Included Features</label>
                         <textarea value={plan.features.join("\n")} onChange={e => {
                            const p = [...pricing];
                            p[i].features = e.target.value.split("\n").filter(f => f.trim() !== "");
                            setPricing(p);
                         }} className="w-full bg-slate-900/50 p-4 rounded-xl text-slate-400 text-[10px] min-h-[160px] outline-none leading-relaxed border border-slate-800" placeholder="One per line..." />
                      </div>
                  </div>
               ))}
               <button onClick={() => setPricing([...pricing, { name: "NEW PLAN", price: "$49", employees: "100", features: ["Core Feature"] }])} className="border border-dashed border-slate-700 bg-slate-800/10 rounded-3xl flex flex-col items-center justify-center p-8 text-slate-600 hover:text-white hover:border-slate-500 transition-all group">
                   <div className="bg-slate-800 p-3 rounded-xl group-hover:bg-emerald-600/10 transition-colors">
                      <Plus className="w-6 h-6 group-hover:text-emerald-500 transition-colors" />
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-widest mt-4">Add Pricing Tier</span>
               </button>
             </div>
           </div>
        )}

        {/* FOOTER SECTION */}
        {activeTab === "footer" && (
           <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                   <Layout className="w-5 h-5 text-indigo-500" />
                   <h2 className="text-lg font-bold text-white uppercase tracking-wider">Footer Management</h2>
                </div>
                <button 
                  onClick={() => saveSection("FOOTER", footer)}
                  disabled={savingSection === "FOOTER"}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/10"
                >
                  {savingSection === "FOOTER" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Footer
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: General Info */}
                <div className="lg:col-span-5 space-y-6">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Short Description</label>
                      <textarea 
                        value={footer.description}
                        onChange={e => setFooter({...footer, description: e.target.value})}
                        className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all h-24"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Copyright Text</label>
                      <input 
                        value={footer.copyright}
                        onChange={e => setFooter({...footer, copyright: e.target.value})}
                        className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Support Email</label>
                      <input 
                        value={footer.email}
                        onChange={e => setFooter({...footer, email: e.target.value})}
                        className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
                      />
                   </div>

                   <div className="space-y-4 pt-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-0.5">Social Presence</label>
                      <div className="grid grid-cols-1 gap-2">
                         {[
                           { id: 'facebook', label: 'Facebook URL', icon: 'Facebook' },
                           { id: 'twitter', label: 'Twitter / X URL', icon: 'Twitter' },
                           { id: 'linkedin', label: 'LinkedIn URL', icon: 'Linkedin' },
                           { id: 'whatsapp', label: 'WhatsApp Link', icon: 'Phone' },
                         ].map((social) => (
                           <div key={social.id} className="flex items-center bg-black/30 border border-slate-800 rounded-xl px-4 py-2 gap-3 focus-within:border-indigo-500 transition-colors">
                              <LucideIcon name={social.icon} className="w-3.5 h-3.5 text-slate-500" />
                              <input 
                                placeholder={social.label}
                                value={(footer as any)[social.id]}
                                onChange={e => setFooter({...footer, [social.id]: e.target.value})}
                                className="bg-transparent flex-1 text-xs text-white outline-none"
                              />
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Right: Columns Editor */}
                <div className="lg:col-span-7 space-y-6">
                   <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Footer Link Columns</label>
                      <button 
                        onClick={() => setFooter({...footer, columns: [...footer.columns, { title: "New Column", links: [{ label: "Link Label", url: "#" }] }]})}
                        className="text-[9px] bg-indigo-600/10 text-indigo-400 px-3 py-1 rounded-lg border border-indigo-500/20 hover:bg-indigo-600 transition-all hover:text-white"
                      >
                         + Add Column
                      </button>
                   </div>

                   <div className="grid grid-cols-1 gap-6">
                      {footer.columns.map((col, colIdx) => (
                         <div key={colIdx} className="bg-black/30 border border-slate-800 rounded-2xl p-5 relative group">
                            <button 
                              onClick={() => setFooter({...footer, columns: footer.columns.filter((_, idx) => idx !== colIdx)})}
                              className="absolute top-4 right-4 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>

                            <input 
                              value={col.title}
                              onChange={e => {
                                 const newCols = [...footer.columns];
                                 newCols[colIdx].title = e.target.value;
                                 setFooter({...footer, columns: newCols});
                              }}
                              className="bg-transparent text-white font-bold text-sm mb-4 outline-none border-b border-transparent focus:border-indigo-500 transition-all w-fit"
                              placeholder="Column Title"
                            />

                            <div className="space-y-3">
                               {col.links.map((link, linkIdx) => (
                                  <div key={linkIdx} className="flex gap-3 items-center">
                                     <input 
                                       value={link.label}
                                       onChange={e => {
                                          const newCols = [...footer.columns];
                                          newCols[colIdx].links[linkIdx].label = e.target.value;
                                          setFooter({...footer, columns: newCols});
                                       }}
                                       placeholder="Label"
                                       className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white flex-1 focus:border-indigo-500 outline-none"
                                     />
                                     <input 
                                       value={link.url}
                                       onChange={e => {
                                          const newCols = [...footer.columns];
                                          newCols[colIdx].links[linkIdx].url = e.target.value;
                                          setFooter({...footer, columns: newCols});
                                       }}
                                       placeholder="URL"
                                       className="bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 flex-1 focus:border-indigo-500 outline-none"
                                     />
                                     <button 
                                       onClick={() => {
                                          const newCols = [...footer.columns];
                                          newCols[colIdx].links = newCols[colIdx].links.filter((_, idx) => idx !== linkIdx);
                                          setFooter({...footer, columns: newCols});
                                       }}
                                       className="text-slate-600 hover:text-red-500"
                                     >
                                        <X className="w-3.5 h-3.5" />
                                     </button>
                                  </div>
                               ))}
                               <button 
                                 onClick={() => {
                                    const newCols = [...footer.columns];
                                    newCols[colIdx].links.push({ label: "New Link", url: "#" });
                                    setFooter({...footer, columns: newCols});
                                 }}
                                 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors flex items-center gap-1.5 pt-2"
                               >
                                  <Plus className="w-3 h-3" /> Add Link
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
