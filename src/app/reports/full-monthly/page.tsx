"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { formatCurrency, calculateSalaryBreakdown } from "@/utils/calculations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";

function ReportContent() {
  const searchParams = useSearchParams();
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const autoPrint = searchParams.get("print") === "true";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/reports/full-monthly?month=${month}&year=${year}`);
        if (!res.ok) throw new Error("Failed to load report data");
        const result = await res.json();
        setData(result);
        
        if (autoPrint) {
          setTimeout(() => window.print(), 1000);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (month && year) fetchData();
  }, [month, year, autoPrint]);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="h-10 w-10 animate-spin text-brand-600 mb-4" />
        <p className="text-lg font-medium">Generating Full Monthly Report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-10">
        <Card className="p-10 text-center max-w-md w-full border-rose-100 bg-rose-50/50">
          <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">!</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Report Error</h2>
          <p className="text-slate-600 mb-6">{error || "Could not load report data."}</p>
          <Link href="/">
             <Button variant="secondary" className="w-full">Back to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][parseInt(month!) - 1];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 print:p-0 print:bg-white">
      {/* Print Controls */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center print:hidden">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium transition">
           <ChevronLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex gap-4">
           <Button onClick={() => window.print()} className="gap-2 shadow-soft">
              <Printer className="h-4 w-4" /> Print PDF
           </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white shadow-pdf rounded-3xl overflow-hidden print:shadow-none print:rounded-none">
        {/* Report Header */}
        <div className="bg-slate-950 text-white p-10 flex justify-between items-end border-b-8 border-brand-500 print:bg-slate-950">
           <div>
              <h1 className="text-3xl font-bold tracking-tight">Full Monthly Report</h1>
              <p className="text-slate-400 mt-2 font-medium uppercase tracking-widest text-sm">
                 {monthName} {year} • Generated on {format(new Date(), "dd MMM, yyyy")}
              </p>
           </div>
           <div className="text-right">
              <h2 className="text-2xl font-black text-brand-400">AppDevs HR</h2>
              <p className="text-slate-500 text-xs mt-1 uppercase font-bold tracking-tighter">Enterprise Management</p>
           </div>
        </div>

        <div className="p-10 space-y-16">
          
          {/* Section 1: Running Loans */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
               <div className="h-8 w-1.5 bg-brand-500 rounded-full"></div>
               <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">1. Running Loans Summary</h2>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                        <th className="px-4 py-3 border-b border-slate-200">ID</th>
                        <th className="px-4 py-3 border-b border-slate-200">Employee Name</th>
                        <th className="px-4 py-3 border-b border-slate-200">Designation</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-right">Loan Amount</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-right">Paid</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-right text-brand-600">Due Amount</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-right">Installments</th>
                     </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 divide-y divide-slate-50">
                     {data.loans.length ? data.loans.map((loan: any) => (
                       <tr key={loan.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-500">{loan.employee.employeeCode}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{loan.employee.name}</td>
                          <td className="px-4 py-3">{loan.employee.designation}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(loan.loanAmount)}</td>
                          <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(loan.paidAmount)}</td>
                          <td className="px-4 py-3 text-right font-bold text-rose-600">{formatCurrency(loan.dueAmount)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(loan.installmentAmount)}</td>
                       </tr>
                     )) : (
                       <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">No running loans for this period.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
          </section>

          {/* Section 2: Advance Salary */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
               <div className="h-8 w-1.5 bg-brand-500 rounded-full"></div>
               <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">2. Advance Salary Disbursements</h2>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                        <th className="px-4 py-3 border-b border-slate-200">ID</th>
                        <th className="px-4 py-3 border-b border-slate-200">Employee Name</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-right">Amount</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center">Date</th>
                        <th className="px-4 py-3 border-b border-slate-200">Note</th>
                     </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 divide-y divide-slate-50">
                     {data.advances.length ? data.advances.map((adv: any) => (
                       <tr key={adv.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-500">{adv.employee.employeeCode}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{adv.employee.name}</td>
                          <td className="px-4 py-3 text-right font-bold text-brand-600">{formatCurrency(adv.amount)}</td>
                          <td className="px-4 py-3 text-center text-slate-500">{format(new Date(adv.createdAt), "dd MMM yyyy")}</td>
                          <td className="px-4 py-3 text-slate-500 italic truncate max-w-[200px]">{adv.note || "-"}</td>
                       </tr>
                     )) : (
                       <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic">No advance salary recorded for this month.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
          </section>

          {/* Section 3: Monthly Payroll */}
          <section className="space-y-4 break-before-page">
            <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
               <div className="h-8 w-1.5 bg-brand-500 rounded-full"></div>
               <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">3. Monthly Payroll Summary</h2>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                        <th className="px-4 py-3 border-b border-slate-200">ID</th>
                        <th className="px-4 py-3 border-b border-slate-200">Name</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-right">Total Sal.</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-center">Days</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-right">Adv. Ded.</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-right">Loan Ded.</th>
                        <th className="px-4 py-3 border-b border-slate-200 text-right text-brand-600">Net Payable</th>
                     </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 divide-y divide-slate-50">
                     {data.salaries.length ? data.salaries.map((sal: any) => (
                       <tr key={sal.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-500">{sal.employee.employeeCode}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{sal.employee.name}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(sal.totalSalary)}</td>
                          <td className="px-4 py-3 text-center">{sal.workingDays} / 30</td>
                          <td className="px-4 py-3 text-right text-rose-500">{formatCurrency(sal.advanceSalaryAmount)}</td>
                          <td className="px-4 py-3 text-right text-rose-500">{formatCurrency(sal.loanAdjustAmount)}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">{formatCurrency(sal.payableSalary)}</td>
                       </tr>
                     )) : (
                       <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 italic">No payroll found for this month.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
          </section>

          {/* Section 4: Office Cost Summary */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
               <div className="h-8 w-1.5 bg-brand-500 rounded-full"></div>
               <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">4. Office Expenses Summary (Preview)</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
               {[
                 { label: "Bazar Cost", key: "bazarCost", color: "text-blue-600" },
                 { label: "Recurring Cost", key: "recurringCost", color: "text-indigo-600" },
                 { label: "Capital Cost", key: "capitalCost", color: "text-emerald-600" },
                 { label: "Extra Cost", key: "extraCost", color: "text-rose-600" },
                 { label: "Total Expense", key: "total", color: "text-slate-900", isTotal: true }
               ].map((cat) => {
                 const totalValue = data.officeCosts.reduce((sum: number, cost: any) => {
                   if (cat.isTotal) return sum + cost.bazarCost + cost.recurringCost + cost.capitalCost + cost.extraCost;
                   return sum + (cost[cat.key] || 0);
                 }, 0);
                 
                 return (
                   <div key={cat.label} className={`p-4 rounded-2xl border border-slate-100 bg-white shadow-sm ${cat.isTotal ? 'bg-slate-50 ring-1 ring-slate-200' : ''}`}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{cat.label}</p>
                      <p className={`text-lg font-black ${cat.color}`}>{formatCurrency(totalValue)}</p>
                   </div>
                 );
               })}
            </div>
            {data.officeCosts.length > 0 && (
               <p className="text-[10px] text-slate-400 italic mt-2">
                 * Consolidated summary based on {data.officeCosts.length} daily entries for {monthName} {year}.
               </p>
            )}
          </section>

          {/* Report Footer */}
          <div className="mt-20 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-8 uppercase tracking-widest font-bold">
             <div>AppDevs HR Dashboard • Confidential Management Report</div>
             <div className="flex items-center gap-10">
                <div className="border-t border-slate-300 pt-2 min-w-[150px] text-center">Manager Signature</div>
                <div className="border-t border-slate-300 pt-2 min-w-[150px] text-center">Director Approval</div>
             </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .min-h-screen {
            height: auto !important;
            padding: 0 !important;
          }
          .shadow-pdf {
            box-shadow: none !important;
          }
          .break-before-page {
            page-break-before: always;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          .print\:hidden {
            display: none !important;
          }
        }
        
        .shadow-pdf {
           box-shadow: 0 40px 100px -20px rgba(0,0,0,0.15), 0 30px 60px -30px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}

export default function ConsolidatedReport() {
  return (
    <Suspense fallback={
       <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400">
         <Loader2 className="h-10 w-10 animate-spin mr-3" />
         Loading Report framework...
       </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
