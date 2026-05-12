import { MonthlySalaryClient } from "@/modules/monthly-salary/monthly-salary-client";
import { ServiceGuard } from "@/components/shared/service-guard";
import { FinancialSecurityGuard } from "@/components/shared/financial-security-guard";

export default function MonthlySalaryPage() {
  return (
    <ServiceGuard id="finance">
      <FinancialSecurityGuard>
        <MonthlySalaryClient />
      </FinancialSecurityGuard>
    </ServiceGuard>
  );
}
