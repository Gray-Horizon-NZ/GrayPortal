import { notFound } from "next/navigation";
import { getCompany } from "@/lib/dal/companies";
import { getClientByCompanyId } from "@/lib/dal/clients";
import { StoreData } from "@/terminal/store";
import { CompanyDetail } from "@/terminal/screens/Detail";

// A company (prospect or client): its deals and contacts, in the terminal
// concept's parts. Onboarding is offered once it has a won deal.
export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, existingClient] = await Promise.all([getCompany(id), getClientByCompanyId(id)]);
  if (!data) notFound();
  const { company, contacts, deals } = data;
  return (
    <StoreData
      data={{
        company: {
          id: company.id,
          name: company.name,
          industry: company.industry ?? "",
          region: company.region ?? "",
          status: company.status,
          source: company.source ?? "",
          clientId: existingClient?.id ?? null,
          hasWonDeal: deals.some((d) => d.stage === "Won"),
          deals: deals.map((d) => ({ id: d.id, label: d.packageTier || d.nextAction, stage: d.stage, value: d.valueNzd ? Number(d.valueNzd) : 0 })),
          contacts: contacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, role: c.roleTitle ?? "", email: c.email ?? "", phone: c.phone ?? "" })),
        },
      }}
    >
      <CompanyDetail />
    </StoreData>
  );
}
