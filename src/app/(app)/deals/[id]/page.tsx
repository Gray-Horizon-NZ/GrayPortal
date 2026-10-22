import { notFound } from "next/navigation";
import { getDeal } from "@/lib/dal/deals";
import { getCompany } from "@/lib/dal/companies";
import { getContact } from "@/lib/dal/contacts";
import { listEmailTemplates } from "@/lib/dal/emails";
import { StoreData } from "@/terminal/store";
import { DealDetail } from "@/terminal/screens/Detail";

const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(d);

// One deal: stage, contact, activity, tasks, email and stage change, in the
// terminal concept's parts (the concept only had the pipeline drawer).
export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ emailSent?: string; emailError?: string }>;
}) {
  const [{ id }, { emailSent, emailError }] = await Promise.all([params, searchParams]);
  const data = await getDeal(id);
  if (!data) notFound();
  const { deal, activities, tasks } = data;
  const [templates, companyData, contactData] = await Promise.all([
    listEmailTemplates(),
    deal.companyId ? getCompany(deal.companyId) : Promise.resolve(null),
    deal.primaryContactId ? getContact(deal.primaryContactId) : Promise.resolve(null),
  ]);
  const company = companyData?.company ?? null;
  const contact = contactData?.contact ?? null;

  return (
    <StoreData
      data={{
        deal: {
          id: deal.id,
          companyId: deal.companyId,
          company: company?.name ?? "Deal",
          industry: company?.industry ?? "",
          contactId: contact?.id ?? null,
          contact: contact ? `${contact.firstName} ${contact.lastName}` : "",
          role: contact?.roleTitle ?? "",
          email: contact?.email ?? "",
          phone: contact?.phone ?? "",
          stage: deal.stage,
          value: deal.valueNzd ? Number(deal.valueNzd) : 0,
          pkg: deal.packageTier ?? "",
          source: deal.source ?? company?.source ?? "",
          next: deal.nextActionDate,
          nextAction: deal.nextAction,
          lostReason: deal.closeReason ?? "",
          sync: deal.syncState,
          activity: [...activities]
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .map((a) => ({ id: a.id, at: day(a.occurredAt), type: a.type[0].toUpperCase() + a.type.slice(1), body: a.body ?? "", outcome: a.outcome ?? "" })),
        },
        tasks: tasks.map((t) => ({
          id: t.id,
          list: `deal:${deal.id}`,
          title: t.title,
          priority: t.priority,
          status: t.status === "ongoing" ? "in_progress" : t.status,
          due: t.dueDate ?? "",
          assignee: "—",
          starred: t.starred,
          notes: "",
        })),
        templates: templates.map((t) => ({ key: t.key, name: t.name, subject: t.subject, htmlBody: t.htmlBody })),
        flash: [
          emailSent && { tone: "good", text: "Email sent and logged." },
          emailError && { tone: "bad", text: `Couldn't send: ${emailError}` },
        ].filter(Boolean),
      }}
    >
      <DealDetail />
    </StoreData>
  );
}
