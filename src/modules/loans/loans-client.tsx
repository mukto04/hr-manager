"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AdvanceSalary, Loan, ModalMode } from "@/types";
import { useAsyncData } from "@/modules/shared/use-async-data";
import { useEmployees } from "@/modules/shared/use-employees";
import { sendJson } from "@/lib/http";
import Link from "next/link";
import { format } from "date-fns";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { LoanForm } from "./loan-form";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { useDialog } from "@/components/ui/dialog-provider";
import { useTranslation } from "@/hooks/use-translation";

export function LoansClient() {
  const loans = useAsyncData<Loan[]>("/api/loans", []);
  const employees = useEmployees();
  const advances = useAsyncData<AdvanceSalary[]>("/api/advance-salary", []);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("create");
  const [selected, setSelected] = useState<Loan | undefined>();
  const dialog = useDialog();
  const fmt = useCurrencyFormatter();
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    return loans.data.filter((item) =>
      (item.employee?.name || "").toLowerCase().includes(query.toLowerCase())
    );
  }, [loans.data, query]);

  async function submit(payload: Record<string, unknown>) {
    if (mode === "create") {
      await sendJson("/api/loans", "POST", payload);
    } else if (selected) {
      await sendJson(`/api/loans/${selected.id}`, "PUT", payload);
    }
    setOpen(false);
    setSelected(undefined);
    await loans.refresh();
  }

  async function remove(item: Loan) {
    const ok = await dialog.danger(
      t("Delete this loan?"),
      <p className="text-sm text-slate-600">{t("This will permanently remove {name}'s loan record. This cannot be undone.", { name: item.employee?.name })}</p>
    );
    if (!ok) return;
    await sendJson(`/api/loans/${item.id}`, "DELETE");
    await loans.refresh();
  }

  if (loans.loading || employees.loading || advances.loading) return <LoadingState />;
  if (loans.error) return <ErrorState message={loans.error} />;
  if (employees.error) return <ErrorState message={employees.error} />;
  if (advances.error) return <ErrorState message={advances.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Loan Management")}
        subtitle={t("Track employee loans, paid amounts and due balance.")}
        actions={
          <div className="flex gap-3">
            <Link href="/loans/history">
              <Button variant="secondary">{t("History")}</Button>
            </Link>
            <Button onClick={() => { setMode("create"); setSelected(undefined); setOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> {t("Add Loan")}
            </Button>
          </div>
        }
      />

      <SearchFilterBar value={query} onChange={setQuery} placeholder={t("Search loans by employee...")} />

      <DataTable
        data={filtered}
        columns={[
          { key: "employee", title: t("Employee"), render: (row) => row.employee?.name || "-" },
          { key: "date", title: t("Apply Date"), render: (row) => row.createdAt ? format(new Date(row.createdAt), "dd MMM yyyy") : "-" },
          { key: "loanAmount", title: t("Loan Amount"), render: (row) => fmt(row.loanAmount) },
          { key: "installmentAmount", title: t("Monthly Installment"), render: (row) => fmt(row.installmentAmount || 0) },
          { 
            key: "startsFrom", 
            title: t("Starts From"), 
            render: (row) => {
              if (!row.startMonth || !row.startYear) return <span className="text-slate-500 italic">{t("Immediate")}</span>;
              const date = new Date(row.startYear, row.startMonth - 1);
              // Wrap the format result in t() to get translated month if we added them to dict, otherwise just use format.
              // We've added month names like January, etc. But date-fns format "MMM yyyy" gives "Jan 2026". We'll just leave it for now or implement a custom month formatter.
              return <span className="font-medium text-blue-600">{format(date, "MMM yyyy")}</span>;
            } 
          },
          { key: "paidAmount", title: t("Paid Amount"), render: (row) => fmt(row.paidAmount) },
          { key: "dueAmount", title: t("Due Amount"), render: (row) => <span className="font-medium">{fmt(row.dueAmount)}</span> },
          { key: "note", title: t("Note"), render: (row) => row.note || "-" },
          {
            key: "actions",
            title: t("Actions"),
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="secondary" className="h-9 px-3" onClick={() => { setMode("edit"); setSelected(row); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="danger" className="h-9 px-3" onClick={() => remove(row)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          }
        ]}
      />

      <Modal
        open={open}
        title={mode === "create" ? t("Add Loan") : t("Edit Loan")}
        onClose={() => setOpen(false)}
      >
        <LoanForm employees={employees.data} advances={advances.data} loans={loans.data} initialData={selected} onSubmit={submit} onCancel={() => setOpen(false)} />
      </Modal>
    </div>
  );
}
