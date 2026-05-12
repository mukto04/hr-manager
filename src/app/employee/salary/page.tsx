"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Banknote, 
  ReceiptText, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Loader2, 
  Wallet,
  CalendarDays,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { generatePayslipPDF } from "@/lib/payslip-generator";
import { useTranslation } from "@/hooks/use-translation";
import { FinancialSecurityGuard } from "@/components/shared/financial-security-guard";

export default function EmployeeSalaryPage() {
  const [data, setData] = useState<{ salaryStructure: any, monthlySalaries: any[] }>({
    salaryStructure: null,
    monthlySalaries: []
  });
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { t } = useTranslation();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    Promise.all([
      fetch("/api/employee/salary").then(res => {
        if (!res.ok) throw new Error("Failed to fetch salary");
        return res.json();
      }),
      fetch("/api/employee/me").then(res => {
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
      })
    ]).then(([salaryData, meData]) => {
      setData(salaryData);
      setEmployeeInfo(meData);
      setLoading(false);

      if (salaryData.monthlySalaries?.length > 0) {
        const years = Array.from(new Set(salaryData.monthlySalaries.map((s: any) => s.year))) as number[];
        if (!years.includes(new Date().getFullYear())) {
          setSelectedYear(Math.max(...years));
        }
      }
    }).catch(err => {
      console.error("Salary fetch error:", err);
      setLoading(false);
    });
  }, []);

  const handleDownload = async (salary: any) => {
    if (!employeeInfo) return;
    setDownloadingId(salary.id);
    try {
      await generatePayslipPDF(employeeInfo, salary);
    } catch (error) {
      console.error("PDF Error:", error);
      alert(t("Failed to generate PDF. Please try again."));
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const availableYears = Array.from(new Set(data.monthlySalaries.map(s => s.year))).sort((a, b) => b - a);
  const displayYears = availableYears.length > 0 ? availableYears : [new Date().getFullYear()];
  const filteredSalaries = data.monthlySalaries.filter(s => s.year === selectedYear);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse w-full">
        <div className="h-40 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-50 rounded-2xl" />
        <div className="space-y-4">
           {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-50 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <FinancialSecurityGuard>
      <div className="space-y-8 pb-20 animate-in fade-in duration-700">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{t("Salary & Payroll")}</h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm">{t("Monitor your earnings, deductions and official payslips.")}</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
             <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShieldCheck size={14} />
             </div>
             <p className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-widest">{t("Secured Access")}</p>
          </div>
        </div>

        {/* Salary Structure Card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-8">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Wallet size={20} />
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Live Structure")}</p>
                <h3 className="text-xl font-bold text-slate-900">{t("Monthly Gross Salary")}</h3>
                <p className="text-xs text-slate-400 font-medium">{t("Authorized by HR Department")}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-4 border-b border-slate-50">
                  <span className="text-sm font-bold text-slate-600">{t("Total Salary")}</span>
                  <span className="text-lg font-bold text-slate-900">
                    <CurrencyAmount amount={data.salaryStructure?.totalSalary || 0} />
                  </span>
                </div>
                {data.salaryStructure?.fields?.map((field: any) => (
                  <div key={field.label} className="flex items-center justify-between py-1">
                    <span className="text-xs font-medium text-slate-500">{t(field.label)}</span>
                    <span className="text-xs font-bold text-slate-700">
                      <CurrencyAmount amount={field.value} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-50/50 rounded-full blur-3xl -z-0" />
          </div>
        </div>

        {/* Payroll History */}
        <div className="space-y-6">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                 <CalendarDays size={18} className="text-emerald-600" />
                 <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest">{t("Payroll history")}</h2>
              </div>
              <div className="flex items-center gap-2">
                 {displayYears.length > 1 && (
                   <select 
                     value={selectedYear}
                     onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                     className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-600 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                   >
                     {displayYears.map(y => <option key={y} value={y}>{y}</option>)}
                   </select>
                 )}
              </div>
           </div>

           <div className="space-y-4">
              {filteredSalaries.length > 0 ? (
                filteredSalaries.map((salary: any) => (
                  <div key={salary.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div 
                      className="p-5 sm:p-6 cursor-pointer flex items-center justify-between"
                      onClick={() => toggleExpand(salary.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${salary.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                           <span className="text-[8px] font-black uppercase">{t(format(new Date(salary.year, salary.month - 1), "MMM"))}</span>
                           <span className="text-base font-black leading-none">{salary.year.toString().slice(-2)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                             <p className="font-bold text-slate-900 text-sm">{t(format(new Date(salary.year, salary.month - 1), "MMMM"))} {salary.year}</p>
                             <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                               salary.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                               salary.status === 'HOLD' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                             }`}>
                               {t(salary.status)}
                             </span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t("Net Payable")}: <CurrencyAmount amount={salary.payableSalary} />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleDownload(salary); }}
                           disabled={downloadingId === salary.id}
                           className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                         >
                           {downloadingId === salary.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                         </button>
                         <div className="text-slate-300">
                            {expandedId === salary.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                         </div>
                      </div>
                    </div>

                    {expandedId === salary.id && (
                      <div className="px-5 sm:px-6 pb-6 border-t border-slate-50 pt-6 animate-in slide-in-from-top-2 duration-300">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <div className="h-1 w-1 rounded-full bg-emerald-500" /> {t("Earnings Breakdown")}
                               </p>
                               <div className="space-y-2.5">
                                  <div className="flex justify-between text-xs font-medium text-slate-500">
                                     <span>{t("Working Day Salary")}</span>
                                     <span className="text-slate-700 font-bold"><CurrencyAmount amount={salary.workingDaySalary} /></span>
                                  </div>
                                  {salary.festivalBonus > 0 && (
                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                       <span>{t("Festival Bonus")}</span>
                                       <span className="text-emerald-600 font-bold"><CurrencyAmount amount={salary.festivalBonus} /></span>
                                    </div>
                                  )}
                                  <div className="flex justify-between pt-2 border-t border-slate-50 text-xs font-bold text-slate-900">
                                     <span>{t("Total Earnings")}</span>
                                     <span><CurrencyAmount amount={salary.workingDaySalary + (salary.festivalBonus || 0)} /></span>
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-4">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <div className="h-1 w-1 rounded-full bg-rose-500" /> {t("Deductions")}
                               </p>
                               <div className="space-y-2.5">
                                  <div className="flex justify-between text-xs font-medium text-slate-500">
                                     <span>{t("Advance Recov.")}</span>
                                     <span className="text-rose-500 font-bold"><CurrencyAmount amount={salary.advanceSalary} /></span>
                                  </div>
                                  <div className="flex justify-between text-xs font-medium text-slate-500">
                                     <span>{t("Loan Adjust.")}</span>
                                     <span className="text-rose-500 font-bold"><CurrencyAmount amount={salary.loanAdjust} /></span>
                                  </div>
                                  {salary.leaveDeductionAmount > 0 && (
                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                       <span>{t("Leave Deduct.")}</span>
                                       <span className="text-rose-500 font-bold"><CurrencyAmount amount={salary.leaveDeductionAmount} /></span>
                                    </div>
                                  )}
                               </div>
                            </div>
                         </div>

                         <div className="mt-8 p-4 bg-emerald-50/50 rounded-xl flex items-center justify-between border border-emerald-100/50">
                            <span className="text-xs font-bold text-emerald-900">{t("Final Take Home")}</span>
                            <span className="text-lg font-black text-emerald-600"><CurrencyAmount amount={salary.payableSalary} /></span>
                         </div>
                         
                         <div className="mt-4 flex justify-center">
                            <button 
                              onClick={() => handleDownload(salary)}
                              disabled={downloadingId === salary.id}
                              className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest"
                            >
                               {downloadingId === salary.id ? t("Processing...") : t("Get PDF Payslip")}
                               <ArrowRight size={12} />
                            </button>
                         </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white p-16 rounded-2xl border border-slate-100 text-center space-y-4">
                   <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-200">
                      <ReceiptText size={32} />
                   </div>
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t("No official payslips found for {year}.", { year: selectedYear })}</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </FinancialSecurityGuard>
  );
}
