"use client";

import { useEmployees } from "@/modules/shared/use-employees";
import { SalaryForm } from "./salary-form";
import { sendJson } from "@/lib/http";
import { LoadingState } from "@/modules/shared/loading-state";
import { ErrorState } from "@/modules/shared/error-state";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SalaryStructure } from "@/types";
import { useAsyncData } from "@/modules/shared/use-async-data";

export function SalaryEditClient({ id }: { id: string }) {
  const salary = useAsyncData<SalaryStructure | null>(`/api/salary/${id}`, null);
  const employees = useEmployees();
  const router = useRouter();

  async function submit(payload: Record<string, unknown>) {
    await sendJson(`/api/salary/${id}`, "PUT", payload);
    router.push("/salary");
  }

  if (employees.loading || salary.loading) return <LoadingState />;
  if (employees.error) return <ErrorState message={employees.error} />;
  if (salary.error) return <ErrorState message={salary.error} />;
  if (!salary.data) return <ErrorState message={"Failed to load salary data"} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Edit Salary Structure"
        subtitle="Modify the salary structure for the selected employee."
        actions={
          <Link href="/salary">
            <Button variant="secondary">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Salary List
            </Button>
          </Link>
        }
      />
      <Card className="p-6">
        <SalaryForm 
          employees={employees.data} 
          initialData={salary.data}
          onSubmit={submit} 
          onCancel={() => router.push("/salary")} 
        />
      </Card>
    </div>
  );
}
