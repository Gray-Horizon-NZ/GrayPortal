import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { DemoBuilder } from "@/terminal/screens/DemoBuilder";

// Admin-only Demo Builder: builds branded Osseus demos for prospects from industry packs.
// Source and how it works: GrayScale/demos/builder/README.md.
export default async function DemoBuilderPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");
  return <DemoBuilder />;
}
