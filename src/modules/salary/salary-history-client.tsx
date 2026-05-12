"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { SalaryStructure } from "@/types";
import { useAsyncData } from "@/modules/shared/use-async-data";
import Link from "next/link";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { ArrowLeft } from "lucide-react";

export function SalaryHistoryClient() {
  const salaries = useAsyncData<SalaryStructure[]>("/api/salary?history=true", []);
  const [query, setQuery] = useState("");
  const fmt = useCurrencyFormatter();

  const filtered = useMemo(() => {
    return salaries.data.filter((item) =>
      (item.employee?.name || "").toLowerCase().includes(query.toLowerCase())
    );
  }, [salaries.data, query]);

  if (salaries.loading) return <LoadingState />;
  if (salaries.error) return <ErrorState message={salaries.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Structure History"
        subtitle="Historical salary records for disabled or former employees."
        actions={
          <div className="flex gap-3">
            <Link href="/salary">
              <Button variant="secondary">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Active
              </Button>
            </Link>
          </div>
        }
      />

      <SearchFilterBar value={query} onChange={setQuery} placeholder="Search historical salary structures..." />

      <DataTable
        data={filtered}
        columns={[
          { key: "employee", title: "Name", render: (row) => row.employee?.name || "-" },
          { key: "totalSalary", title: "Total Salary", render: (row) => fmt(row.totalSalary) },
          { key: "basicSalary", title: "Basic Salary: 50%", render: (row) => fmt(row.basicSalary) },
          { key: "hra", title: "House Rent Allowance (H.R.A): 25%", render: (row) => fmt(row.hra) },
          { key: "medicalAllowance", title: "Medical Allowance (M.A): 12.5%", render: (row) => fmt(row.medicalAllowance) },
          { key: "travelAllowance", title: "Travel Allowance (T.A): 5%", render: (row) => fmt(row.travelAllowance) },
          { key: "others", title: "Others: 7.5%", render: (row) => fmt(row.others) },
          {
            key: "status",
            title: "Status",
            render: () => <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">Disabled</span>
          }
        ]}
      />
    </div>
  );
}
