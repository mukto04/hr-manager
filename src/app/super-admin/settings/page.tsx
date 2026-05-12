"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ShieldAlert, 
  Key, 
  Save, 
  Loader2, 
  Lock,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff
} from "lucide-react";
import { useToastStore } from "@/lib/store/use-toast-store";

export default function SuperAdminSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [systemLoading, setSystemLoading] = useState(false);
  const { showToast } = useToastStore();
  
  // Password Visibility States
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [systemFormData, setSystemFormData] = useState({
    loginTitle: "",
    loginSub: "",
    country: "Bangladesh",
    currencySymbol: "৳",
    timezone: "Asia/Dhaka",
    language: "en"
  });

  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const countries = [
    { name: "Afghanistan", currency: "؋", timezone: "Asia/Kabul", language: "ps" },
    { name: "Albania", currency: "L", timezone: "Europe/Tirane", language: "sq" },
    { name: "Algeria", currency: "د.ج", timezone: "Africa/Algiers", language: "ar" },
    { name: "Angola", currency: "Kz", timezone: "Africa/Luanda", language: "pt" },
    { name: "Argentina", currency: "$", timezone: "America/Argentina/Buenos_Aires", language: "es" },
    { name: "Armenia", currency: "֏", timezone: "Asia/Yerevan", language: "hy" },
    { name: "Australia", currency: "A$", timezone: "Australia/Sydney", language: "en" },
    { name: "Austria", currency: "€", timezone: "Europe/Vienna", language: "de" },
    { name: "Azerbaijan", currency: "₼", timezone: "Asia/Baku", language: "az" },
    { name: "Bahrain", currency: ".د.ب", timezone: "Asia/Bahrain", language: "ar" },
    { name: "Bangladesh", currency: "৳", timezone: "Asia/Dhaka", language: "bn" },
    { name: "Belarus", currency: "Br", timezone: "Europe/Minsk", language: "be" },
    { name: "Belgium", currency: "€", timezone: "Europe/Brussels", language: "nl" },
    { name: "Bolivia", currency: "Bs", timezone: "America/La_Paz", language: "es" },
    { name: "Bosnia and Herzegovina", currency: "KM", timezone: "Europe/Sarajevo", language: "bs" },
    { name: "Brazil", currency: "R$", timezone: "America/Sao_Paulo", language: "pt" },
    { name: "Bulgaria", currency: "лв", timezone: "Europe/Sofia", language: "bg" },
    { name: "Cambodia", currency: "៛", timezone: "Asia/Phnom_Penh", language: "km" },
    { name: "Cameroon", currency: "Fr", timezone: "Africa/Douala", language: "fr" },
    { name: "Canada", currency: "CA$", timezone: "America/Toronto", language: "en" },
    { name: "Chile", currency: "$", timezone: "America/Santiago", language: "es" },
    { name: "China", currency: "¥", timezone: "Asia/Shanghai", language: "zh" },
    { name: "Colombia", currency: "$", timezone: "America/Bogota", language: "es" },
    { name: "Croatia", currency: "€", timezone: "Europe/Zagreb", language: "hr" },
    { name: "Cuba", currency: "$", timezone: "America/Havana", language: "es" },
    { name: "Czech Republic", currency: "Kč", timezone: "Europe/Prague", language: "cs" },
    { name: "Denmark", currency: "kr", timezone: "Europe/Copenhagen", language: "da" },
    { name: "Ecuador", currency: "$", timezone: "America/Guayaquil", language: "es" },
    { name: "Egypt", currency: "£", timezone: "Africa/Cairo", language: "ar" },
    { name: "Ethiopia", currency: "Br", timezone: "Africa/Addis_Ababa", language: "am" },
    { name: "Finland", currency: "€", timezone: "Europe/Helsinki", language: "fi" },
    { name: "France", currency: "€", timezone: "Europe/Paris", language: "fr" },
    { name: "Georgia", currency: "₾", timezone: "Asia/Tbilisi", language: "ka" },
    { name: "Germany", currency: "€", timezone: "Europe/Berlin", language: "de" },
    { name: "Ghana", currency: "₵", timezone: "Africa/Accra", language: "en" },
    { name: "Greece", currency: "€", timezone: "Europe/Athens", language: "el" },
    { name: "Guatemala", currency: "Q", timezone: "America/Guatemala", language: "es" },
    { name: "Hungary", currency: "Ft", timezone: "Europe/Budapest", language: "hu" },
    { name: "India", currency: "₹", timezone: "Asia/Kolkata", language: "hi" },
    { name: "Indonesia", currency: "Rp", timezone: "Asia/Jakarta", language: "id" },
    { name: "Iran", currency: "﷼", timezone: "Asia/Tehran", language: "fa" },
    { name: "Iraq", currency: "ع.د", timezone: "Asia/Baghdad", language: "ar" },
    { name: "Ireland", currency: "€", timezone: "Europe/Dublin", language: "en" },
    { name: "Israel", currency: "₪", timezone: "Asia/Jerusalem", language: "he" },
    { name: "Italy", currency: "€", timezone: "Europe/Rome", language: "it" },
    { name: "Japan", currency: "¥", timezone: "Asia/Tokyo", language: "ja" },
    { name: "Jordan", currency: "د.ا", timezone: "Asia/Amman", language: "ar" },
    { name: "Kazakhstan", currency: "₸", timezone: "Asia/Almaty", language: "kk" },
    { name: "Kenya", currency: "KSh", timezone: "Africa/Nairobi", language: "sw" },
    { name: "Kuwait", currency: "د.ك", timezone: "Asia/Kuwait", language: "ar" },
    { name: "Kyrgyzstan", currency: "с", timezone: "Asia/Bishkek", language: "ky" },
    { name: "Lebanon", currency: "ل.ل", timezone: "Asia/Beirut", language: "ar" },
    { name: "Libya", currency: "ل.د", timezone: "Africa/Tripoli", language: "ar" },
    { name: "Malaysia", currency: "RM", timezone: "Asia/Kuala_Lumpur", language: "ms" },
    { name: "Maldives", currency: "ރ.", timezone: "Indian/Maldives", language: "dv" },
    { name: "Mexico", currency: "$", timezone: "America/Mexico_City", language: "es" },
    { name: "Morocco", currency: "د.م.", timezone: "Africa/Casablanca", language: "ar" },
    { name: "Myanmar", currency: "K", timezone: "Asia/Rangoon", language: "my" },
    { name: "Nepal", currency: "₨", timezone: "Asia/Kathmandu", language: "ne" },
    { name: "Netherlands", currency: "€", timezone: "Europe/Amsterdam", language: "nl" },
    { name: "New Zealand", currency: "NZ$", timezone: "Pacific/Auckland", language: "en" },
    { name: "Nigeria", currency: "₦", timezone: "Africa/Lagos", language: "en" },
    { name: "Norway", currency: "kr", timezone: "Europe/Oslo", language: "no" },
    { name: "Oman", currency: "ر.ع.", timezone: "Asia/Muscat", language: "ar" },
    { name: "Pakistan", currency: "₨", timezone: "Asia/Karachi", language: "ur" },
    { name: "Palestine", currency: "₪", timezone: "Asia/Gaza", language: "ar" },
    { name: "Peru", currency: "S/.", timezone: "America/Lima", language: "es" },
    { name: "Philippines", currency: "₱", timezone: "Asia/Manila", language: "tl" },
    { name: "Poland", currency: "zł", timezone: "Europe/Warsaw", language: "pl" },
    { name: "Portugal", currency: "€", timezone: "Europe/Lisbon", language: "pt" },
    { name: "Qatar", currency: "ر.ق", timezone: "Asia/Qatar", language: "ar" },
    { name: "Romania", currency: "lei", timezone: "Europe/Bucharest", language: "ro" },
    { name: "Russia", currency: "₽", timezone: "Europe/Moscow", language: "ru" },
    { name: "Saudi Arabia", currency: "﷼", timezone: "Asia/Riyadh", language: "ar" },
    { name: "Serbia", currency: "дин", timezone: "Europe/Belgrade", language: "sr" },
    { name: "Singapore", currency: "S$", timezone: "Asia/Singapore", language: "en" },
    { name: "South Africa", currency: "R", timezone: "Africa/Johannesburg", language: "en" },
    { name: "South Korea", currency: "₩", timezone: "Asia/Seoul", language: "ko" },
    { name: "Spain", currency: "€", timezone: "Europe/Madrid", language: "es" },
    { name: "Sri Lanka", currency: "₨", timezone: "Asia/Colombo", language: "si" },
    { name: "Sudan", currency: "ج.س.", timezone: "Africa/Khartoum", language: "ar" },
    { name: "Sweden", currency: "kr", timezone: "Europe/Stockholm", language: "sv" },
    { name: "Switzerland", currency: "Fr", timezone: "Europe/Zurich", language: "de" },
    { name: "Syria", currency: "£", timezone: "Asia/Damascus", language: "ar" },
    { name: "Taiwan", currency: "NT$", timezone: "Asia/Taipei", language: "zh" },
    { name: "Tajikistan", currency: "SM", timezone: "Asia/Dushanbe", language: "tg" },
    { name: "Tanzania", currency: "TSh", timezone: "Africa/Dar_es_Salaam", language: "sw" },
    { name: "Thailand", currency: "฿", timezone: "Asia/Bangkok", language: "th" },
    { name: "Tunisia", currency: "د.ت", timezone: "Africa/Tunis", language: "ar" },
    { name: "Turkey", currency: "₺", timezone: "Europe/Istanbul", language: "tr" },
    { name: "Turkmenistan", currency: "T", timezone: "Asia/Ashgabat", language: "tk" },
    { name: "Uganda", currency: "USh", timezone: "Africa/Kampala", language: "sw" },
    { name: "Ukraine", currency: "₴", timezone: "Europe/Kiev", language: "uk" },
    { name: "United Arab Emirates", currency: "د.إ", timezone: "Asia/Dubai", language: "ar" },
    { name: "United Kingdom", currency: "£", timezone: "Europe/London", language: "en" },
    { name: "United States", currency: "$", timezone: "America/New_York", language: "en" },
    { name: "Uzbekistan", currency: "soʻm", timezone: "Asia/Tashkent", language: "uz" },
    { name: "Venezuela", currency: "Bs.F", timezone: "America/Caracas", language: "es" },
    { name: "Vietnam", currency: "₫", timezone: "Asia/Ho_Chi_Minh", language: "vi" },
    { name: "Yemen", currency: "﷼", timezone: "Asia/Aden", language: "ar" },
    { name: "Zambia", currency: "ZK", timezone: "Africa/Lusaka", language: "en" },
    { name: "Zimbabwe", currency: "$", timezone: "Africa/Harare", language: "en" },
  ];

  const filteredCountries = useMemo(() =>
    countrySearch
      ? countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
      : countries,
    [countrySearch]
  );

  useEffect(() => {
    fetch("/api/super-admin/settings/system")
      .then(res => res.json())
      .then(data => {
        setSystemFormData({
          loginTitle: data.loginTitle || "AppDevs HR Master Access",
          loginSub: data.loginSub || "Restricted to AppDevs Administrators only.",
          country: data.country || "Bangladesh",
          currencySymbol: data.currencySymbol || "৳",
          timezone: data.timezone || "Asia/Dhaka",
          language: data.language || "en"
        });
      })
      .catch(err => console.error("Failed to fetch system settings:", err));
  }, []);

  const handleCountryChange = (countryName: string) => {
    const selected = countries.find(c => c.name === countryName);
    if (selected) {
      setSystemFormData(prev => ({
        ...prev,
        country: selected.name,
        currencySymbol: selected.currency,
        timezone: selected.timezone,
        language: "en",
      }));
    }
    setCountryOpen(false);
    setCountrySearch("");
  };

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }

    if (formData.newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/super-admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || "Failed to update password.", "error");
        return;
      }

      showToast("Master password updated successfully!", "success");
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      showToast("Connection error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSystemUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSystemLoading(true);

    try {
      const res = await fetch("/api/super-admin/settings/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemFormData),
      });

      if (!res.ok) throw new Error("Failed to update system settings");

      showToast("System configurations updated successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update settings", "error");
    } finally {
      setSystemLoading(false);
    }
  }

  const languageLabels: Record<string, string> = {
    en: "English",
    bn: "Bengali (বাংলা)",
    ar: "Arabic (عربي)",
    zh: "Chinese (中文)",
    fr: "French (Français)",
    de: "German (Deutsch)",
    hi: "Hindi (हिन्दी)",
    id: "Indonesian (Indonesia)",
    it: "Italian (Italiano)",
    ja: "Japanese (日本語)",
    ko: "Korean (한국어)",
    ms: "Malay (Bahasa Melayu)",
    pt: "Portuguese (Português)",
    ru: "Russian (Русский)",
    es: "Spanish (Español)",
    tr: "Turkish (Türkçe)",
    ur: "Urdu (اردو)",
    vi: "Vietnamese (Tiếng Việt)",
    th: "Thai (ภาษาไทย)",
    sw: "Swahili (Kiswahili)",
    tl: "Filipino (Tagalog)",
    uk: "Ukrainian (Українська)",
    he: "Hebrew (עברית)",
    fa: "Persian (فارسی)",
    ne: "Nepali (नेपाली)",
    si: "Sinhala (සිංහල)",
    my: "Burmese (မြန်မာ)",
    km: "Khmer (ខ្មែរ)",
    am: "Amharic (አማርኛ)",
    dv: "Dhivehi (ދިވެހި)",
    ps: "Pashto (پښتو)",
    hy: "Armenian (Հայերեն)",
    az: "Azerbaijani (Azərbaycan)",
    ka: "Georgian (ქართული)",
    kk: "Kazakh (Қазақша)",
    ky: "Kyrgyz (Кыргызча)",
    tg: "Tajik (Тоҷикӣ)",
    tk: "Turkmen (Türkmen)",
    uz: "Uzbek (O'zbek)",
    bs: "Bosnian (Bosanski)",
    hr: "Croatian (Hrvatski)",
    sr: "Serbian (Српски)",
    bg: "Bulgarian (Български)",
    cs: "Czech (Čeština)",
    da: "Danish (Dansk)",
    fi: "Finnish (Suomi)",
    el: "Greek (Ελληνικά)",
    hu: "Hungarian (Magyar)",
    no: "Norwegian (Norsk)",
    pl: "Polish (Polski)",
    ro: "Romanian (Română)",
    sk: "Slovak (Slovenčina)",
    sv: "Swedish (Svenska)",
    sq: "Albanian (Shqip)",
    be: "Belarusian (Беларускі)",
    lt: "Lithuanian (Lietuvių)",
    lv: "Latvian (Latviešu)",
    et: "Estonian (Eesti)",
    mk: "Macedonian (Македонски)",
    sl: "Slovenian (Slovenščina)",
  };

  const countryLangOptions = [
    { code: "en", label: languageLabels["en"] },
    { code: "es", label: languageLabels["es"] },
    { code: "ar", label: languageLabels["ar"] },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 pb-12 w-full animate-fade-in">
      {/* Header */}
      <div className="relative group overflow-hidden bg-slate-900 shadow-xl p-6 rounded-3xl border border-slate-800 backdrop-blur-md">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <ShieldCheck className="w-24 h-24 text-red-500 -rotate-12 translate-x-4 -translate-y-4" />
        </div>
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-2.5 rounded-2xl shadow-lg ring-4 ring-red-600/10 shrink-0">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">System Settings</h1>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                 <Zap className="w-3 h-3 text-yellow-500" />
                 Master Configurations
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Global Localization Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-1">
             <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
               <Monitor className="w-4 h-4 text-emerald-500" />
             </div>
             <h2 className="text-sm font-bold text-white uppercase tracking-wider">Global Localization</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             <div className="lg:col-span-8">
                <form onSubmit={handleSystemUpdate} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1.5" ref={countryRef}>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Primary Country</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => { setCountryOpen(o => !o); }}
                            className="w-full flex items-center justify-between bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                          >
                            <span className="truncate">{systemFormData.country || "Select country..."}</span>
                            <svg className={`w-4 h-4 text-slate-400 transition-transform ${countryOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {countryOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                              <div className="flex items-center border-b border-slate-700 px-3">
                                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input
                                  autoFocus
                                  type="text"
                                  value={countrySearch}
                                  onChange={e => setCountrySearch(e.target.value)}
                                  placeholder="Search country..."
                                  className="w-full bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
                                />
                              </div>
                              <div className="max-h-52 overflow-y-auto">
                                {filteredCountries.length === 0 ? (
                                  <div className="px-4 py-3 text-sm text-slate-500 text-center">No country found</div>
                                ) : filteredCountries.map(c => (
                                  <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => handleCountryChange(c.name)}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                      systemFormData.country === c.name
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "text-slate-300 hover:bg-slate-800"
                                    }`}
                                  >
                                    <span>{c.name}</span>
                                    <span className="text-xs text-slate-500 ml-2">{c.currency}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Currency Symbol</label>
                        <input 
                          type="text"
                          required
                          value={systemFormData.currencySymbol}
                          onChange={e => setSystemFormData({...systemFormData, currencySymbol: e.target.value})}
                          className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                          placeholder="e.g. $, ৳, £"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Timezone</label>
                        <input 
                          type="text"
                          required
                          value={systemFormData.timezone}
                          onChange={e => setSystemFormData({...systemFormData, timezone: e.target.value})}
                          className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                          placeholder="e.g. Asia/Dhaka"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">System Language</label>
                        <select
                          value={systemFormData.language}
                          onChange={e => setSystemFormData({...systemFormData, language: e.target.value})}
                          className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                          {countryLangOptions.map(opt => (
                            <option key={opt.code} value={opt.code} className="bg-slate-900 text-white">
                              {opt.label}{opt.code === "en" ? " (Default)" : " (Native)"}
                            </option>
                          ))}
                        </select>
                    </div>
                  </div>

                  <div className="h-px bg-slate-800/50" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Login Page Title</label>
                        <input 
                          type="text"
                          required
                          value={systemFormData.loginTitle}
                          onChange={e => setSystemFormData({...systemFormData, loginTitle: e.target.value})}
                          className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-red-600 outline-none transition-all"
                          placeholder="e.g. Master Access"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Login Page Subtitle</label>
                        <textarea 
                          rows={1}
                          required
                          value={systemFormData.loginSub}
                          onChange={e => setSystemFormData({...systemFormData, loginSub: e.target.value})}
                          className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-red-600 outline-none resize-none transition-all"
                        />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={systemLoading}
                    className="w-full bg-white hover:bg-slate-100 text-black text-[11px] font-black uppercase tracking-[0.1em] py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl shadow-white/5"
                  >
                    {systemLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save System Configurations</span>
                      </>
                    )}
                  </button>
                </form>
             </div>

             <div className="lg:col-span-4">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3 h-full">
                   <div className="bg-red-500/10 w-9 h-9 rounded-xl flex items-center justify-center border border-red-500/20">
                      <Zap className="w-4 h-4 text-red-500" />
                   </div>
                   <h3 className="text-sm font-bold text-white">Instant Sync</h3>
                   <p className="text-[11px] text-slate-500 leading-relaxed">
                      Changes propagate instantly to the login gateway. 
                      Keep branding consistent with your company guidelines.
                   </p>
                </div>
             </div>
          </div>
        </section>

        {/* Master Security Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-1">
             <Lock className="w-4 h-4 text-red-500" />
             <h2 className="text-sm font-bold text-white uppercase tracking-wider">Master Security</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             <div className="lg:col-span-8">
                <form onSubmit={handlePasswordChange} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Current Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                          <input 
                            type={showCurrent ? "text" : "password"}
                            required
                            value={formData.currentPassword}
                            onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                            className="w-full bg-black/40 border border-slate-800 rounded-xl pl-11 pr-12 py-3 text-sm text-white focus:ring-1 focus:ring-red-600 outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrent(!showCurrent)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-red-500 transition-colors"
                          >
                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                    </div>

                    <div className="h-px bg-slate-800" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">New Password</label>
                            <div className="relative">
                              <input 
                                type={showNew ? "text" : "password"}
                                required
                                value={formData.newPassword}
                                onChange={e => setFormData({...formData, newPassword: e.target.value})}
                                className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 pr-12 py-3 text-sm text-white focus:ring-1 focus:ring-red-600 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-red-500 transition-colors"
                              >
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">Confirm New</label>
                            <div className="relative">
                              <input 
                                type={showConfirm ? "text" : "password"}
                                required
                                value={formData.confirmPassword}
                                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                                className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 pr-12 py-3 text-sm text-white focus:ring-1 focus:ring-red-600 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-red-500 transition-colors"
                              >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                        </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/10"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Update Master Secret</span>
                      </>
                    )}
                  </button>
                </form>
             </div>

             <div className="lg:col-span-4">
                <div className="bg-yellow-600/5 border border-yellow-600/10 p-6 rounded-3xl space-y-4 h-full flex flex-col justify-center">
                   <div className="flex items-center gap-2 text-yellow-500">
                      <AlertTriangle className="w-4 h-4" />
                      <h3 className="font-bold uppercase tracking-wider text-[10px]">Level 1 Protocol</h3>
                   </div>
                   <p className="text-[11px] text-slate-400 leading-relaxed">
                      Updating the Master Key will invalidate all active sessions. 
                      Keep your new password documented securely.
                   </p>
                </div>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
