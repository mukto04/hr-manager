import { LoansClient } from "@/modules/loans/loans-client";
import { ServiceGuard } from "@/components/shared/service-guard";
import { FinancialSecurityGuard } from "@/components/shared/financial-security-guard";

export default function LoansPage() {
  return (
    <ServiceGuard id="finance">
      <FinancialSecurityGuard>
        <LoansClient />
      </FinancialSecurityGuard>
    </ServiceGuard>
  );
}
