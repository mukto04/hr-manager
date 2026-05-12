"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Printer, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ServiceGuard } from "@/components/shared/service-guard";
import { CustomSelect } from "@/components/ui/custom-select";
import { useTranslation } from "@/hooks/use-translation";

export default function AttendanceReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState(() => String(new Date().getMonth() + 1));
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();

  const months = [
    { label: "January", value: "1" },
    { label: "February", value: "2" },
    { label: "March", value: "3" },
    { label: "April", value: "4" },
    { label: "May", value: "5" },
    { label: "June", value: "6" },
    { label: "July", value: "7" },
    { label: "August", value: "8" },
    { label: "September", value: "9" },
    { label: "October", value: "10" },
    { label: "November", value: "11" },
    { label: "December", value: "12" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => ({
    label: String(new Date().getFullYear() - i),
    value: String(new Date().getFullYear() - i),
  }));

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/attendance/summary?month=${month}&year=${year}`);
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.message || "Failed to generate report");
      }
      
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin text-brand-600 mb-4" />
        <p>{t("Generating detailed report...")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-10 text-center border-rose-100 bg-rose-50/30">
           <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
             <span className="text-xl font-bold">!</span>
           </div>
           <h3 className="text-lg font-bold text-slate-900 mb-2">{t("Error Generating Report")}</h3>
           <p className="text-slate-600 mb-6 max-w-md mx-auto">{error}</p>
           <Button onClick={() => fetchReport()}>{t("Try Again")}</Button>
        </Card>
      </div>
    );
  }

  const monthName = months.find(m => m.value === month)?.label;

  return (
    <ServiceGuard id="attendance">
    <div className="space-y-6 print:space-y-0 print:p-0">
      <div className="print:hidden text-slate-700">
        <PageHeader
          title={t("Monthly Attendance Report")}
          subtitle={t("Enterprise-grade matrix view with shift analysis and performance summary")}
          actions={
            <Button onClick={handlePrint} className="gap-2 shadow-soft-xl hover:scale-105 transition-all">
              <Printer className="h-4 w-4" /> {t("Export Professional PDF")}
            </Button>
          }
        />

        <Card className="p-5 mt-6 border-slate-200">
          <div className="flex flex-wrap items-end gap-6 text-slate-700">
            <CustomSelect 
              label={t("Select Month")}
              options={months.map(m => ({...m, label: t(m.label)}))}
              value={month}
              onChange={setMonth}
              className="min-w-[180px]"
            />
            <CustomSelect 
              label={t("Select Year")}
              options={years}
              value={year}
              onChange={setYear}
              className="min-w-[120px]"
            />
            
            <div className="space-y-2 flex-1 min-w-[240px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t("Search Employee")}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder={t("Search by name or employee code...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {data && (
        <div className="max-w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white print:border-none print:rounded-none">
          {/* Print Header */}
          <div className="hidden print:flex justify-between items-end p-8 border-b-4 border-black mb-6 bg-white">
             <div className="text-black">
                <h1 className="text-2xl font-bold tracking-tight leading-none uppercase">{t("Monthly Attendance Report")}</h1>
                <p className="text-gray-600 text-[10px] font-bold tracking-widest mt-2 uppercase">
                   {monthName ? t(monthName) : ""} {year} • {t("Generated on")} {format(new Date(), "dd MMM, yyyy")}
                </p>
             </div>
             <div className="text-right">
                <h2 className="text-xl font-bold text-blue-700">AppDevs HR</h2>
                <div className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">{t("Management Information System")}</div>
             </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible custom-scrollbar print:custom-scrollbar-hidden">
            <table className="w-full text-left border-collapse table-fixed print:table-auto print:w-full print:border">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-widest print:bg-white print:text-black">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20 px-4 py-4 font-bold text-slate-900 text-[10px] border-r border-slate-200 w-[200px] print:static print:w-[130px] print:border print:text-black">
                    {t("Employee Details")}
                  </th>
                  {data.dates?.map((d: any) => (
                    <th key={d.full} className={`px-0.5 py-2 border-r border-slate-200 text-center font-bold min-w-[38px] print:border print:w-[32px] print:min-w-0 ${d.isWeekend ? 'bg-sky-50 text-sky-800' : 'text-slate-500'}`}>
                      <div className="text-[10px] leading-none print:text-[8px] print:text-black font-bold">{d.day}</div>
                      <div className="text-[6px] font-bold opacity-60 leading-none print:hidden">{d.month}</div>
                    </th>
                  ))}
                  <th className="px-4 py-4 font-bold text-slate-900 border-l border-slate-200 text-center w-[120px] bg-slate-50 print:static print:border print:bg-white print:text-black print:w-[120px] print:min-w-[120px]">
                    {t("Monthly Summary")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-gray-300 print:text-black font-sans">
                {data.report
                  .filter((emp: any) => 
                    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((emp: any) => {
                  const isUnderperform = emp.summary.avgWorkingHours < 9.6;
                  
                  return (
                    <tr key={emp.id} className={`${isUnderperform ? 'bg-rose-50/20' : 'hover:bg-slate-50/40'} transition-all print:bg-white`}>
                      <td className="sticky left-0 bg-white z-10 px-4 py-3 border-r border-slate-200 print:static print:border">
                        <div className="font-bold text-blue-600 text-[8px] uppercase print:text-blue-600 print:text-[7px]">{emp.employeeCode}</div>
                        <div className="font-black text-slate-900 text-[11px] leading-tight print:text-black print:text-[10px] print:font-black">{emp.name}</div>
                        <div className="text-slate-500 text-[8px] font-bold truncate mt-0.5 uppercase print:text-gray-400 print:text-[6px]">{emp.designation}</div>
                      </td>
                      {data.dates?.map((d: any) => {
                        const rec = emp.records[d.full];
                        const checkInStr = rec.checkIn ? format(new Date(rec.checkIn), "hh:mm a") : null;
                        const checkOutStr = rec.checkOut ? format(new Date(rec.checkOut), "hh:mm a") : null;
                        const isLate = rec.checkIn && new Date(rec.checkIn).getHours() >= 9 && new Date(rec.checkIn).getMinutes() > 10;
                        
                        if (rec.status === "WEEKEND") {
                           return (
                             <td key={d.full} className="px-0.5 py-2 bg-sky-50 border-r border-slate-200 align-middle text-center print:border print:bg-[#f0f9ff]">
                               <div className="font-bold text-sky-700 text-[10px] print:text-sky-700">{t("W")}</div>
                             </td>
                           );
                        }

                        if (rec.status === "ABSENT") {
                           return (
                             <td key={d.full} className="px-0.5 py-2 border-r border-slate-200 align-middle text-center print:border print:bg-white print:text-red-600 font-bold text-rose-600 text-[11px]">{t("A")}</td>
                           );
                        }

                        if (rec.status === "HALF_DAY") {
                           return (
                             <td key={d.full} className="px-0.5 py-2 border-r border-slate-200 text-center align-middle whitespace-nowrap print:border print:bg-white bg-rose-50/20">
                               <div className="h-4 leading-4 text-rose-600 font-bold text-[8px] print:text-rose-600 print:text-[7px]">
                                 {checkInStr ? (
                                   <>
                                     {checkInStr.split(' ')[0]}
                                     <span className="text-[5px] ml-0.5 font-bold uppercase">{checkInStr.split(' ')[1]}</span>
                                   </>
                                 ) : "-"}
                               </div>
                               <div className="h-4 leading-4 text-rose-500 font-bold text-[8px] print:text-rose-500 print:text-[7px]">
                                 {checkOutStr ? (
                                   <>
                                     {checkOutStr.split(' ')[0]}
                                     <span className="text-[5px] ml-0.5 font-bold uppercase">{checkOutStr.split(' ')[1]}</span>
                                   </>
                                 ) : "-"}
                               </div>
                             </td>
                           );
                        }

                        return (
                          <td key={d.full} className={`px-0.5 py-2 border-r border-slate-200 text-center align-middle whitespace-nowrap print:border print:bg-white ${isLate ? 'bg-amber-100/40' : 'bg-white'}`}>
                            <div className="h-4 leading-4 text-slate-900 font-bold text-[8px] print:text-black print:text-[7px]">
                              {checkInStr ? (
                                <>
                                  {checkInStr.split(' ')[0]}
                                  <span className="text-[5px] ml-0.5 font-bold uppercase">{checkInStr.split(' ')[1]}</span>
                                </>
                              ) : "-"}
                            </div>
                            <div className="h-4 leading-4 text-slate-600 font-bold text-[8px] print:text-black print:text-[7px]">
                              {checkOutStr ? (
                                <>
                                  {checkOutStr.split(' ')[0]}
                                  <span className="text-[5px] ml-0.5 font-bold uppercase">{checkOutStr.split(' ')[1]}</span>
                                </>
                              ) : "-"}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 border-l border-slate-100 align-middle bg-slate-50/20 print:static print:border print:bg-white print:text-black print:w-[124px] print:min-w-[124px]">
                        <div className="grid grid-cols-2 gap-x-1 gap-y-1 text-[9px] font-bold uppercase print:text-[8px] print:font-black">
                           <span className="text-slate-600 print:text-black">PESS:</span>
                           <span className="text-emerald-700 text-right print:text-emerald-700">{emp.summary.present}</span>
                           <span className="text-slate-600 print:text-black">ABST:</span>
                           <span className="text-rose-600 text-right print:text-rose-600">{emp.summary.absent}</span>
                           <span className="text-slate-600 print:text-black">BRKS:</span>
                           <span className="text-amber-600 text-right print:text-amber-600">
                              {(() => {
                                const h = Math.floor(emp.summary.totalBreakHours || 0);
                                const m = Math.round(((emp.summary.totalBreakHours || 0) - h) * 60);
                                return `${h}h ${m}m`;
                              })()}
                           </span>
                           <span className="text-slate-600 print:text-black">AVRG:</span>
                           <span className={`text-right whitespace-nowrap ${isUnderperform ? 'text-rose-600' : 'text-slate-950 font-black'}`}>
                             {(() => {
                               const hours = Math.floor(emp.summary.avgWorkingHours);
                               const minutes = Math.round((emp.summary.avgWorkingHours - hours) * 60);
                               return `${hours}h ${minutes}m`;
                             })()}
                           </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="hidden print:flex justify-between items-center p-10 text-[8px] text-gray-500 border-t border-gray-100 mt-10 uppercase font-bold tracking-widest">
             <div>{t("AppDevs Management Information System • Official Attendance Record")}</div>
             <div className="flex gap-16">
                <div className="border-t border-black pt-3 min-w-[120px] text-center text-black">{t("Department Head")}</div>
                <div className="border-t border-black pt-3 min-w-[120px] text-center text-black">{t("HR Administrator")}</div>
             </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body {
             background: white !important;
             color: black !important;
             overflow: visible !important;
             zoom: 0.72;
          }
          .print\:hidden {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important; /* Force fixed layout so summary column doesn't shrink */
          }
          tr {
            page-break-inside: avoid !important;
          }
          td, th {
            display: table-cell !important;
            border: 1px solid #ddd !important;
            -webkit-print-color-adjust: exact !important;
          }
          .sticky {
            position: static !important;
          }
          /* Fix individual column widths in print */
          th:first-child, td:first-child { width: 130px !important; }
          th:not(:first-child):not(:last-child), td:not(:first-child):not(:last-child) { width: 32px !important; }
          th:last-child, td:last-child { width: 120px !important; min-width: 120px !important; }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
           height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
           background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
           background: #cbd5e1;
           border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
           background: #94a3b8;
        }
      `}</style>
    </div>
    </ServiceGuard>
  );
}
