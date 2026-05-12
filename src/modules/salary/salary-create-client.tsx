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

export function SalaryCreateClient() {
  const employees = useEmployees();
  const router = useRouter();

  async function submit(payload: Record<string, unknown>) {
    await sendJson("/api/salary", "POST", payload);
    router.push("/salary");
  }

  if (employees.loading) return <LoadingState />;
  if (employees.error) return <ErrorState message={employees.error} />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Create Salary Structure"
        subtitle="Define a new salary structure for an employee."
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
          onSubmit={submit} 
          onCancel={() => router.push("/salary")} 
        />
      </Card>
    </div>
  );
}
