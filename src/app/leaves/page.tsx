import { LeavesClient } from "@/modules/leaves/leaves-client";
import { ServiceGuard } from "@/components/shared/service-guard";

export default function LeavesPage() {
  return (
    <ServiceGuard id="leaves">
      <LeavesClient />
    </ServiceGuard>
  );
}
