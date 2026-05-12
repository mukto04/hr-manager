import { OfficeCostClient } from "@/modules/office-cost/office-cost-client";
import { ServiceGuard } from "@/components/shared/service-guard";
import { FinancialSecurityGuard } from "@/components/shared/financial-security-guard";

export const metadata = {
  title: "Office Cost - AppDevs HR",
  description: "Manage monthly office costs."
};

export default function OfficeCostPage() {
  return (
    <ServiceGuard id="office_admin">
      <FinancialSecurityGuard>
        <OfficeCostClient />
      </FinancialSecurityGuard>
    </ServiceGuard>
  );
}
