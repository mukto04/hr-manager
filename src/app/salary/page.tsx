import { SalaryClient } from "@/modules/salary/salary-client";
import { ServiceGuard } from "@/components/shared/service-guard";
import { FinancialSecurityGuard } from "@/components/shared/financial-security-guard";

export default function SalaryPage() {
  return (
    <ServiceGuard id="finance">
      <FinancialSecurityGuard>
        <SalaryClient />
      </FinancialSecurityGuard>
    </ServiceGuard>
  );
}
