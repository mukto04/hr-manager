"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Clock, 
  CreditCard, 
  ShieldCheck, 
  Shield,
  PieChart, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  Briefcase,
  Zap,
  Globe,
  Lock,
  Menu,
  X,
  Loader2,
  Award,
  Trophy,
  Star
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";



export function LandingPage({ initialData }: { initialData?: any }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  // Dynamic Content States with Fallbacks
  const [branding, setBranding] = useState({
    primaryColor: initialData?.BRANDING?.primaryColor || "#2563eb",
    logo: initialData?.BRANDING?.logo || "/logo.png",
    favicon: initialData?.BRANDING?.favicon || "/favicon.png"
  });

  const [hero, setHero] = useState({
    title: initialData?.HERO?.title || "Revolutionize Your HR Operations",
    subtitle: initialData?.HERO?.subtitle || "The all-in-one HR Management System designed for modern businesses. Automate attendance, payroll, and employee life-cycles in one sleek platform.",
    cta: initialData?.HERO?.cta || "Contact Support",
    ctaLink: initialData?.HERO?.ctaLink || "https://wa.me/8801739748004",
    mockupImg: initialData?.HERO?.mockupImg || "/hr_dashboard_mockup_new.png"
  });

  const [stats, setStats] = useState(initialData?.STATS || [
    { label: "Uptime SLA", val: "99.9%" },
    { label: "Active Tenants", val: "500+" },
    { label: "Support", val: "24/7" },
    { label: "Encryption", val: "AES-256" }
  ]);

  const [features, setFeatures] = useState(initialData?.FEATURES || [
    { title: "Employee Management", desc: "Manage onboarding, employee documents, and profiles in one centralized database.", icon: "Users" },
    { title: "Biometric Attendance", desc: "Real-time attendance sync with ZKTeco and physical biometric machines.", icon: "Clock" },
    { title: "Automated Payroll", desc: "Calculate salaries, manageable structures, and monthly payments with one click.", icon: "CreditCard" },
    { title: "Loans & Advances", desc: "Specifically track employee loans and advance salaries with automated deductions.", icon: "Shield" },
    { title: "Leave & Holidays", desc: "Full control over leave balances, holidays, and manual attendance requests.", icon: "PieChart" },
    { title: "Office Cost Tracking", desc: "Monitor daily expenses and maintain financial transparency for the office.", icon: "Briefcase" }
  ]);

  const [pricing, setPricing] = useState(() => {
    if (initialData?.PRICING) {
      return Array.isArray(initialData.PRICING) ? initialData.PRICING : (initialData.PRICING.plans || []);
    }
    return [
      { name: "Starter", price: "$19", employees: "25", features: ["Employee Management", "Biometric Attendance", "Automated Payroll", "Loans & Advances", "Leave & Holidays"] },
      { name: "Growth", price: "$49", employees: "100", features: ["Employee Management", "Biometric Attendance", "Automated Payroll", "Loans & Advances", "Leave & Holidays", "Office Cost Tracking"] },
      { name: "Enterprise", price: "$99", employees: "300", features: ["Employee Management", "Biometric Attendance", "Automated Payroll", "Loans & Advances", "Leave & Holidays", "Office Cost Tracking","Company Spreadsheet"] }
    ];
  });

  const [yearlyDiscount, setYearlyDiscount] = useState(initialData?.PRICING?.yearlyDiscount || "20");

  const [corporate, setCorporate] = useState({
    title: initialData?.CORPORATE?.title || "Master HR Management",
    titleAccent: initialData?.CORPORATE?.titleAccent || "Without the Complexity",
    description: initialData?.CORPORATE?.description || "Manage 10 to 10,000 employees with the same level of granular control. Our platform handles the \"noisy\" administrative tasks so you can focus on building your culture.",
    bullets: initialData?.CORPORATE?.bullets || [
      "Granular Role-Based Access Control",
      "Automated Leave Compliance",
      "Smart Loan & Advance Deduction",
      "Interactive Attendance Reports"
    ],
    metrics: initialData?.CORPORATE?.metrics || [
      { label: "Payroll Processing", efficiency: "98%", color: "" },
      { label: "Attendance Accuracy", efficiency: "100%", color: "#10b981" },
      { label: "Admin Time Saved", efficiency: "85%", color: "#a855f7" }
    ],
    testimonial: initialData?.CORPORATE?.testimonial || {
      quote: "It transformed our chaotic payroll into a 10-minute task.",
      author: "Sarah Jenkins",
      role: "Head of Operations, TechFlow"
    }
  });

  const [footer, setFooter] = useState({
    copyright: initialData?.FOOTER?.copyright || `© ${new Date().getFullYear()} AppDevs HR Framework · All Rights Reserved`,
    description: initialData?.FOOTER?.description || "Empowering organizations with intelligent and intuitive HR infrastructure.",
    email: initialData?.FOOTER?.email || "support@appdevs.net",
    facebook: initialData?.FOOTER?.facebook || "#",
    twitter: initialData?.FOOTER?.twitter || "#",
    linkedin: initialData?.FOOTER?.linkedin || "#",
    whatsapp: initialData?.FOOTER?.whatsapp || "#",
    columns: initialData?.FOOTER?.columns || [
      {
        title: t("Product"),
        links: [
          { label: t("Features"), url: "#" },
          { label: t("Integrations"), url: "#" },
          { label: t("Security"), url: "#" }
        ]
      },
      {
        title: t("Company"),
        links: [
          { label: t("About Us"), url: "#" },
          { label: t("Blog"), url: "#" },
          { label: t("Privacy"), url: "#" }
        ]
      },
      {
        title: t("Support"),
        links: [
          { label: t("Contact"), url: "#" },
          { label: t("Documentation"), url: "#" },
          { label: t("Status"), url: "#" }
        ]
      }
    ]
  });

  useEffect(() => {
    async function fetchLandingData() {
      try {
        const res = await fetch("/api/landing-page");
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        if (data.BRANDING) setBranding(data.BRANDING);
        if (data.HERO) setHero(data.HERO);
        if (data.STATS) setStats(data.STATS);
        if (data.FEATURES) setFeatures(data.FEATURES);
        if (data.FOOTER) setFooter(data.FOOTER);
        if (data.CORPORATE) setCorporate(prev => ({...prev, ...data.CORPORATE}));
        if (data.PRICING) {
           if (Array.isArray(data.PRICING)) {
              setPricing(data.PRICING);
           } else {
              setPricing(data.PRICING.plans || []);
              if (data.PRICING.yearlyDiscount) setYearlyDiscount(data.PRICING.yearlyDiscount);
           }
        }
      } catch (e) {
        console.error("Failed to load dynamic landing content:", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLandingData();
  }, []);

  const toPascalCase = (str: string) => {
    if (!str) return "";
    return str
      .split(/[-_ ]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  const DynamicIcon = ({ name, className, style }: { name: string, className?: string, style?: any }) => {
    const icons: any = { ...LucideIcons };
    const normalizedName = toPascalCase(name);
    const IconComponent = icons[normalizedName] || icons[name] || Zap;
    return <IconComponent className={className} style={style} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-red-500/30 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --primary: ${branding.primaryColor};
          --primary-glow: ${branding.primaryColor}33;
          --primary-soft: ${branding.primaryColor}1a;
        }
      `}} />
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <a href="#hero" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={branding.logo} alt="Logo" className="h-10 w-auto" />
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">{t("Features")}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{t("Pricing")}</a>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href={hero.ctaLink} 
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex px-5 py-2 rounded-xl text-white text-sm font-bold transition-all shadow-lg"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {t("Contact Support")}
            </a>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-slate-900 border-b border-slate-800 p-6 space-y-4 animate-in slide-in-from-top duration-300">
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-slate-300 hover:text-white">{t("Features")}</a>
            <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-slate-300 hover:text-white">{t("Pricing")}</a>
            <a 
              href={hero.ctaLink} 
              target="_blank"
              onClick={() => setIsMenuOpen(false)}
              className="block w-full text-center py-3 rounded-xl text-white text-sm font-bold shadow-lg"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {t("Contact Support")}
            </a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative pt-32 pb-20 md:pt-52 md:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 tracking-wide uppercase">
               <Zap className="w-3.5 h-3.5" style={{ color: branding.primaryColor }} /> 
               {t("Next-Gen HR OS")}
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1]">
              {hero.title.split(' ').slice(0, -1).join(' ')} <span style={{ color: branding.primaryColor }}>{hero.title.split(' ').pop()}</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0">
              {hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
               <a 
                 href={hero.ctaLink} 
                 target="_blank"
                 rel="noopener noreferrer"
                 className="w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-bold transition-all shadow-xl hover:scale-105 active:scale-95"
                 style={{ backgroundColor: branding.primaryColor, boxShadow: `0 10px 30px -5px ${branding.primaryColor}66` }}
               >
                 {t(hero.cta)}
               </a>
               <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border border-white/10">
                 {t("Explore Features")}
               </a>
            </div>
          </div>
          <div className="relative group perspective-1000 mt-12 lg:mt-0">
             <div className="relative z-10 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl transition-transform duration-700 group-hover:rotate-y-12">
               <img src={hero.mockupImg} alt="Dashboard Mockup" className="w-full h-auto" />
             </div>
             <div className="absolute inset-0 blur-[100px] opacity-20 -z-10 rounded-full" style={{ background: branding.primaryColor }} />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/5 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
           {stats.map((stat: any, i: number) => (
             <div key={i} className="text-center space-y-1">
                <div className="text-2xl md:text-4xl font-black text-white">{stat.val}</div>
                <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">{t(stat.label)}</div>
             </div>
           ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto space-y-20">
           <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">{t("Powerful Architecture")}</h2>
              <p className="text-slate-500 max-w-2xl mx-auto font-medium">{t("Modular components designed for high-availability enterprise environments.")}</p>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {features.map((feature: any, i: number) => (
                <div key={i} className="group p-8 md:p-10 rounded-[40px] bg-slate-900/50 border border-slate-800 hover:border-white/10 transition-all hover:bg-slate-900 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                      <DynamicIcon name={feature.icon} className="w-20 h-20 rotate-12" />
                   </div>
                   <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-500">
                      <DynamicIcon name={feature.icon} className="w-6 h-6 md:w-7 md:h-7" style={{ color: branding.primaryColor }} />
                   </div>
                   <h3 className="mt-8 text-lg md:text-xl font-bold text-white tracking-tight">{t(feature.title)}</h3>
                   <p className="mt-4 text-sm text-slate-500 leading-relaxed font-medium">{t(feature.desc)}</p>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* Corporate Highlight */}
      <section className="py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24 items-center">
           <div className="space-y-10 order-2 lg:order-1">
              <div className="space-y-4 text-center lg:text-left">
                <h2 className="text-3xl md:text-5xl font-black text-white leading-tight uppercase tracking-tight">
                  {t(corporate.title)} <br/>
                  <span style={{ color: branding.primaryColor }}>{t(corporate.titleAccent)}</span>
                </h2>
                <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                  {t(corporate.description)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {corporate.bullets.map((bullet: string, i: number) => (
                   <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className="text-xs md:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{t(bullet)}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="relative order-1 lg:order-2">
              <div className="grid grid-cols-1 gap-6 relative z-10">
                 {corporate.metrics.map((metric: any, i: number) => (
                   <div key={i} className="p-6 md:p-8 rounded-[32px] bg-slate-900 border border-slate-800 shadow-2xl hover:-translate-y-2 transition-transform duration-500">
                      <div className="flex justify-between items-end mb-4">
                         <div className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">{t(metric.label)}</div>
                         <div className="text-2xl md:text-3xl font-black text-white">{metric.efficiency}</div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                         <div 
                           className="h-full rounded-full animate-progress" 
                           style={{ width: metric.efficiency, backgroundColor: metric.color || branding.primaryColor }} 
                         />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 md:py-32 px-6 bg-slate-900/20">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-6">
             <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">{t("Flexible Scaling")}</h2>
             <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
               <button 
                 onClick={() => setBillingCycle('monthly')}
                 className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === 'monthly' ? "bg-white text-black shadow-lg" : "text-slate-500 hover:text-white"}`}
               >
                 {t("Monthly")}
               </button>
               <button 
                 onClick={() => setBillingCycle('yearly')}
                 className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === 'yearly' ? "bg-white text-black shadow-lg" : "text-slate-500 hover:text-white"}`}
               >
                 {t("Yearly")} <span className="ml-1 text-[8px] text-emerald-500">-{yearlyDiscount}%</span>
               </button>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {pricing.map((plan: any, i: number) => {
              const isGrowth = plan.name === 'Growth';
              const discountFactor = 1 - (parseInt(yearlyDiscount) / 100);
              const price = billingCycle === 'monthly' ? plan.price : `$${Math.floor(parseInt(plan.price.replace('$','')) * discountFactor * 12)}`;
              return (
                <div key={i} className={`p-8 md:p-10 rounded-[48px] border transition-all hover:scale-[1.02] duration-500 relative flex flex-col justify-between ${
                  isGrowth ? "bg-slate-900 border-white/20 shadow-2xl z-10" : "bg-white/5 border-white/5 hover:bg-white/[0.07]"
                }`}>
                  {isGrowth && (
                    <div className="absolute top-6 right-8 px-3 py-1 bg-white text-black rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                      {t("Most Popular")}
                    </div>
                  )}
                  <div className="mb-10">
                    <div className={`text-xs font-black uppercase tracking-[0.2em] mb-4 ${isGrowth ? "text-white/60" : "text-slate-500"}`}>{plan.name}</div>
                    <div className="text-4xl md:text-5xl font-black text-white mb-8 flex items-baseline">
                      {price}
                      <span className={`text-sm font-normal ${isGrowth ? "text-white/60" : "text-slate-500"}`}>
                        /{billingCycle === 'monthly' ? t('mo') : t('yr')}
                      </span>
                    </div>
                    <ul className="space-y-4">
                      <li className={`flex items-center gap-3 text-sm font-bold ${isGrowth ? "text-white" : ""}`} style={{ color: isGrowth ? undefined : branding.primaryColor }}>
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isGrowth ? "text-white" : ""}`} style={{ color: isGrowth ? undefined : branding.primaryColor }} /> 
                        {t("Up to")} {plan.employees} {t("Employees")}
                      </li>
                      {plan.features.map((feature: any, fIdx: number) => (
                        <li key={fIdx} className={`flex items-center gap-3 text-sm ${isGrowth ? "text-white/90" : "text-slate-300"}`}>
                          <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isGrowth ? "text-white" : ""}`} style={{ color: isGrowth ? undefined : branding.primaryColor }} /> {t(feature)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a 
                    href={hero.ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full text-center py-4 rounded-2xl font-bold transition-all shadow-lg ${
                      isGrowth ? "bg-white text-black hover:bg-slate-100" : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {t(hero.cta)}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 px-6">
         <div className="max-w-5xl mx-auto p-8 md:p-20 rounded-[48px] text-center space-y-8 shadow-2xl relative overflow-hidden" style={{ background: `linear-gradient(to bottom right, ${branding.primaryColor}, #0f172a)`, boxShadow: `0 25px 50px -12px ${branding.primaryColor}44` }}>
           <Lock className="absolute -left-10 -bottom-10 w-64 h-64 text-white/5" />
           <Building2 className="absolute -right-10 -top-10 w-64 h-64 text-white/5" />
           
           <h2 className="text-3xl md:text-5xl font-black text-white relative z-10 leading-tight uppercase tracking-tight">{t("Get Your Branded HR Portal Today")}</h2>
           <p className="text-white/80 text-base md:text-lg max-w-xl mx-auto relative z-10 font-medium">
             {t("Join 500+ forward-thinking companies who have modernized their HR experience.")}
           </p>
           <div className="pt-6 relative z-10">
             <a 
               href="https://wa.me/8801739748004" 
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex w-full sm:w-auto px-10 py-5 bg-white font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-xl shadow-black/10 items-center justify-center"
                style={{ color: branding.primaryColor }}
             >
               {t("Contact Support for Portal Setup")}
             </a>
           </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-12 md:py-20 px-6 border-t border-white/5 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between gap-12">
          <div className="space-y-6 text-center lg:text-left items-center lg:items-start flex flex-col lg:block">
            <div className="flex items-center gap-2">
              <img src={branding.logo} alt="Logo" className="h-8 w-auto" />
            </div>
            <p className="max-w-xs text-sm text-slate-500 font-medium">{footer.description}</p>
            <div className="flex items-center gap-6 pt-2">
               {footer.facebook && <a href={footer.facebook} target="_blank" className="text-slate-500 hover:text-white transition-colors"><LucideIcons.Facebook className="w-5 h-5" /></a>}
               {footer.twitter && <a href={footer.twitter} target="_blank" className="text-slate-500 hover:text-white transition-colors"><LucideIcons.Twitter className="w-5 h-5" /></a>}
               {footer.linkedin && <a href={footer.linkedin} target="_blank" className="text-slate-500 hover:text-white transition-colors"><LucideIcons.Linkedin className="w-5 h-5" /></a>}
               {footer.whatsapp && <a href={footer.whatsapp} target="_blank" className="text-slate-500 hover:text-white transition-colors"><LucideIcons.Phone className="w-5 h-5" /></a>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-12 text-sm">
             {footer.columns.map((col: any, idx: number) => (
               <div key={idx} className="space-y-6 text-center sm:text-left">
                  <div className="font-black text-white uppercase tracking-widest text-[10px]">{col.title}</div>
                  <ul className="space-y-3 text-slate-500">
                    {col.links.map((link: any, lIdx: number) => (
                      <li key={lIdx}>
                        <a href={link.url} className="hover:text-white transition-colors font-medium">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
               </div>
             ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-white/5 text-center text-[9px] font-black text-slate-700 uppercase tracking-[0.3em]">
           {footer.copyright}
        </div>
      </footer>

    </div>
  );
}
