import { HolidaysClient } from "@/modules/holidays/holidays-client";
import { ServiceGuard } from "@/components/shared/service-guard";

export default function HolidaysPage() {
  return (
    <ServiceGuard id="leaves">
      <HolidaysClient />
    </ServiceGuard>
  );
}
