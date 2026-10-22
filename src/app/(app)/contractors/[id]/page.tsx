import { notFound } from "next/navigation";
import { getContractorRecord } from "@/lib/dal/contractors";
import { StoreData } from "@/terminal/store";
import { ContractorDetail } from "@/terminal/screens/Detail";

// A contractor roster record (profiles live in Project Incrementum): system
// access and assigned tasks, in the terminal concept's parts.
export default async function ContractorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inviteError?: string; invited?: string; passwordEmailError?: string }>;
}) {
  const [{ id }, { inviteError, invited, passwordEmailError }] = await Promise.all([params, searchParams]);
  const data = await getContractorRecord(id);
  if (!data) notFound();
  const { contractor, portalUsers, assignedTasks } = data;
  return (
    <StoreData
      data={{
        contractor: {
          id: contractor.id,
          name: contractor.name,
          specialty: contractor.specialty ?? "",
          users: portalUsers.map((u) => ({ id: u.id, email: u.email, active: !!u.googleUid })),
          tasks: assignedTasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
        },
        flash: [
          invited && { tone: "good", text: "Invite sent." },
          inviteError && { tone: "bad", text: `Couldn't invite: ${inviteError}` },
          passwordEmailError && { tone: "bad", text: `Login was created, but the password-setup email didn't send: ${passwordEmailError}` },
        ].filter(Boolean),
      }}
    >
      <ContractorDetail />
    </StoreData>
  );
}
