import { SalaryEditClient } from "@/modules/salary/salary-edit-client";

export default async function SalaryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SalaryEditClient id={id} />;
}
