"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Loan } from "@/types";
import { useAsyncData } from "@/modules/shared/use-async-data";
import Link from "next/link";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { ArrowLeft } from "lucide-react";
import { Select } from "@/components/ui/select";

export function LoansHistoryClient() {
  const loans = useAsyncData<Loan[]>("/api/loans?history=true", []);
  const [query, setQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const fmt = useCurrencyFormatter();

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const range = [];
    for (let i = current - 5; i <= current + 1; i++) range.push(i);
    return range;
  }, []);

  const filtered = useMemo(() => {
    return loans.data.filter((item) => {
      const matchesQuery = (item.employee?.name || "").toLowerCase().includes(query.toLowerCase());
      const itemYear = new Date(item.createdAt).getFullYear();
      const matchesYear = itemYear === selectedYear;
      return matchesQuery && matchesYear;
    });
  }, [loans.data, query, selectedYear]);

  if (loans.loading) return <LoadingState />;
  if (loans.error) return <ErrorState message={loans.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan History"
        subtitle="Historical records of all fully paid and settled loans."
        actions={
          <div className="flex gap-3">
            <Link href="/loans">
              <Button variant="secondary">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Active Loans
              </Button>
            </Link>
          </div>
        }
      />

      <SearchFilterBar 
        value={query} 
        onChange={setQuery} 
        placeholder="Search completed loans by employee..." 
        rightSlot={
          <Select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-[120px]"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        }
      />

      <DataTable
        data={filtered}
        columns={[
          { key: "employee", title: "Employee", render: (row) => row.employee?.name || "-" },
          { key: "loanAmount", title: "Loan Amount", render: (row) => fmt(row.loanAmount) },
          { key: "paidAmount", title: "Paid Amount", render: (row) => fmt(row.paidAmount) },
          { 
            key: "date", 
            title: "Date Created", 
            render: (row) => new Date(row.createdAt).toLocaleDateString() 
          },
          {
            key: "status",
            title: "Status",
            render: () => <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Paid Off</span>
          }
        ]}
      />
    </div>
  );
}
