import { redirect } from "next/navigation";

// Client emails are the "Clients" folder of the triage screen now.
export default function ClientEmailsPage() {
  redirect("/email-triage");
}
