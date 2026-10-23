import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { BrandGuidelines } from "@/terminal/screens/System";

// Admin-only brand reference: the terminal concept's summary panels, then the
// full guidebook (public/brand-guidebook.html — untouched design work this
// app only displays), section by section.
export default async function BrandGuidelinesPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");
  return <BrandGuidelines />;
}
