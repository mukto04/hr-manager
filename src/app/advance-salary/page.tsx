import { AdvanceSalaryClient } from "@/modules/advance-salary/advance-salary-client";
import { ServiceGuard } from "@/components/shared/service-guard";
import { FinancialSecurityGuard } from "@/components/shared/financial-security-guard";

export default function AdvanceSalaryPage() {
  return (
    <ServiceGuard id="finance">
      <FinancialSecurityGuard>
        <AdvanceSalaryClient />
      </FinancialSecurityGuard>
    </ServiceGuard>
  );
}
