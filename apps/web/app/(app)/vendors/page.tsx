import { ApiError } from "@/components/comply/api-error";
import { PageHeader } from "@/components/comply/page-header";
import { VendorsPageContent } from "@/components/vendors/vendors-page";
import { complianceApi } from "@/lib/compliance-api";
import { mapVendorRow } from "@/lib/ui-mappers";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  try {
    const vendors = await complianceApi.vendors();
    return <VendorsPageContent vendors={vendors.map(mapVendorRow)} />;
  } catch (e) {
    return (
      <div className="comply-page">
        <PageHeader eyebrow="Compliance" title="Vendors" description="Third-party risk register." />
        <ApiError message={e instanceof Error ? e.message : "Failed to load vendors"} />
      </div>
    );
  }
}
