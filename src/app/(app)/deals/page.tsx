import { redirect } from "next/navigation";

// Deals and Pipeline were merged into one page with a List/Board toggle —
// this route stays only so existing links/bookmarks to /deals keep working.
export default function DealsRedirectPage() {
  redirect("/pipeline?view=list");
}
