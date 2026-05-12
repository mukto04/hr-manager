"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { Employee } from "@/types";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { sendJson } from "@/lib/http";
import { format } from "date-fns";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/ui/dialog-provider";
import { RotateCcw, ArrowLeft, Users, UserCheck, UserX } from "lucide-react";
import { useGlobalSettings } from "@/components/providers/global-settings-provider";

export function EmployeeHistoryClient() {
  const router = useRouter();
  const [v] = useState(Date.now());
  const { data: allData, loading, error, refresh } = useAsyncData<Employee[]>(`/api/employees?all=true&t=${v}`, []);
  const { currencySymbol } = useGlobalSettings();

  const [query, setQuery] = useState("");
  const dialog = useDialog();

  const filteredHistory = useMemo(() => {
    return allData.filter((item) =>
      [item.name, item.employeeCode, item.designation, item.department || "", item.email || ""]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  }, [allData, query]);

  async function handleRestore(item: Employee) {
    const ok = await dialog.confirm(
      `Restore "${item.name}"?`,
      <p className="text-sm text-slate-600">This employee will be restored to <strong>Active</strong> status.</p>
    );
    if (!ok) return;
    await sendJson(`/api/employees/${item.id}`, "PUT", {
      employeeCode: item.employeeCode,
      fingerprintId: item.fingerprintId,
      name: item.name,
      designation: item.designation,
      department: item.department ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      joiningDate: item.joiningDate.slice(0, 10),
      dateOfBirth: item.dateOfBirth.slice(0, 10),
      salary: item.salaryStructure?.totalSalary ?? 0,
      bloodGroup: item.bloodGroup,
      guardianName: item.guardianName,
      guardianRelation: item.guardianRelation,
      guardianPhone: item.guardianPhone,
      nidNumber: item.nidNumber,
      educationStatus: item.educationStatus,
      status: "ACTIVE"
    });
    await refresh();
  }

  const activeCount = allData.filter(e => e.status === "ACTIVE").length;
  const disabledCount = allData.filter(e => e.status === "DISABLED").length;

  const historyColumns = [
    {
      key: "ids",
      title: "IDs",
      render: (row: Employee) => (
        <div className="space-y-1 min-w-[120px]">
          <p className="font-mono text-xs font-bold text-slate-900">{row.employeeCode}</p>
          <p className="text-[10px] text-slate-500 font-medium">FP: <span className="text-brand-600 font-bold">{row.fingerprintId || "—"}</span></p>
        </div>
      )
    },
    {
      key: "employee",
      title: "Employee",
      render: (row: Employee) => (
        <div className="min-w-[180px]">
          <p className="font-bold text-slate-900 leading-tight">{row.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{row.designation}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{row.department || "No Department"}</p>
        </div>
      )
    },
    {
      key: "contact",
      title: "Contact",
      render: (row: Employee) => (
        <div className="space-y-1 min-w-[160px]">
          <p className="text-xs truncate" title={row.email || ""}>{row.email || "No Email"}</p>
          <p className="text-xs font-semibold text-slate-600">{row.phone || "No Phone"}</p>
        </div>
      )
    },
    {
      key: "dates",
      title: "Dates",
      render: (row: Employee) => (
        <div className="space-y-1 min-w-[120px]">
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tighter">Joining:</p>
          <p className="text-xs font-bold text-slate-800">{format(new Date(row.joiningDate), "dd MMM yyyy")}</p>
          <div className="pt-1 mt-1 border-t border-slate-50">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tighter">DOB:</p>
            <p className="text-xs font-bold text-slate-800">{format(new Date(row.dateOfBirth), "dd MMM yyyy")}</p>
          </div>
        </div>
      )
    },
    {
      key: "salary_blood",
      title: "Salary & Blood",
      render: (row: Employee) => (
        <div className="space-y-2 min-w-[110px]">
          <div className="rounded-md bg-emerald-50 px-2 py-1 inline-block">
            <p className="text-xs font-bold text-emerald-700">{currencySymbol}{row.salaryStructure?.totalSalary?.toLocaleString() ?? "—"}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Blood:</span>
            <span className="text-xs font-black text-rose-600">{row.bloodGroup || "—"}</span>
          </div>
        </div>
      )
    },
    {
      key: "guardian",
      title: "Guardian Info",
      render: (row: Employee) => (
        <div className="space-y-1 min-w-[180px] text-xs">
          <p className="font-bold text-slate-800">{row.guardianName || "—"}</p>
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-600">{row.guardianRelation || "Relation N/A"}</span>
            <span className="text-slate-500 font-medium">{row.guardianPhone || "No Phone"}</span>
          </div>
        </div>
      )
    },
    {
      key: "personal",
      title: "NID & Education",
      render: (row: Employee) => (
        <div className="space-y-1 min-w-[180px] text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">NID:</span>
            <span className="font-mono font-medium text-slate-700">{row.nidNumber || "—"}</span>
          </div>
          <div className="pt-1 mt-1 border-t border-slate-50">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Education:</p>
            <p className="leading-snug text-slate-600 line-clamp-2">{row.educationStatus || "—"}</p>
          </div>
        </div>
      )
    },
    {
      key: "status_actions",
      title: "Status",
      render: (row: Employee) => (
        <div className="space-y-3 min-w-[100px]">
          {row.status === "ACTIVE" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
              ACTIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-[10px] font-bold">
              DISABLED
            </span>
          )}
          {row.status === "DISABLED" && (
            <Button
              variant="secondary"
              className="w-full h-8 text-[10px] gap-1 px-2"
              onClick={() => handleRestore(row)}
            >
              <RotateCcw className="h-3 w-3" />
              RESTORE
            </Button>
          )}
        </div>
      )
    }
  ];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee History"
        subtitle="All employees ever added — active and disabled."
        actions={
          <Button variant="secondary" onClick={() => router.push("/employees")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Employees
          </Button>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2">
            <Users className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total</p>
            <p className="text-2xl font-bold">{allData.length}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2">
            <UserCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active</p>
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-red-100 p-2">
            <UserX className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Disabled</p>
            <p className="text-2xl font-bold text-red-500">{disabledCount}</p>
          </div>
        </div>
      </div>

      <SearchFilterBar value={query} onChange={setQuery} placeholder="Search history..." />

      <DataTable data={filteredHistory} columns={historyColumns} />
    </div>
  );
}
