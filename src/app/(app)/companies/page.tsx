import { redirect } from "next/navigation";

// Companies and Clients were merged into one searchable list — this route
// stays only so existing links/bookmarks to /companies keep working.
export default function CompaniesRedirectPage() {
  redirect("/clients");
}
