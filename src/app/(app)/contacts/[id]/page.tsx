import { notFound } from "next/navigation";
import { getContact } from "@/lib/dal/contacts";
import { getCompany } from "@/lib/dal/companies";
import { listEmailTemplates } from "@/lib/dal/emails";
import { StoreData } from "@/terminal/store";
import { ContactDetail } from "@/terminal/screens/Detail";

const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(d);

// One contact: details, linked deals, activity, email and log, in the
// terminal concept's parts.
export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ emailSent?: string; emailError?: string }>;
}) {
  const [{ id }, { emailSent, emailError }] = await Promise.all([params, searchParams]);
  const data = await getContact(id);
  if (!data) notFound();
  const { contact, activities } = data;
  const [companyData, templates] = await Promise.all([getCompany(contact.companyId), listEmailTemplates()]);
  const deals = companyData?.deals.filter((d) => d.primaryContactId === contact.id) ?? [];

  return (
    <StoreData
      data={{
        contact: {
          id: contact.id,
          name: `${contact.firstName} ${contact.lastName}`,
          role: contact.roleTitle ?? "",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          notes: contact.notes ?? "",
          companyId: companyData?.company.id ?? null,
          company: companyData?.company.name ?? "",
          deals: deals.map((d) => ({ id: d.id, label: d.packageTier || d.nextAction, stage: d.stage, value: d.valueNzd ? Number(d.valueNzd) : 0 })),
          activity: [...activities]
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .map((a) => ({ id: a.id, at: day(a.occurredAt), type: a.type[0].toUpperCase() + a.type.slice(1), body: a.body ?? "", outcome: a.outcome ?? "" })),
        },
        templates: templates.map((t) => ({ key: t.key, name: t.name, subject: t.subject, htmlBody: t.htmlBody })),
        flash: [
          emailSent && { tone: "good", text: "Email sent and logged." },
          emailError && { tone: "bad", text: `Couldn't send: ${emailError}` },
        ].filter(Boolean),
      }}
    >
      <ContactDetail />
    </StoreData>
  );
}
