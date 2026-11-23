import { redirect } from "next/navigation";
import { getCaller } from "@/lib/dal/auth";
import { osseusUrl } from "@/lib/dal/osseusPrices";
import { PageHead } from "@/terminal/ui";

// Finance tools › Demo Builder opens Osseus's Demo Builder (/platform/demos), the one place demos
// are built, saved, tailored and published since 23 Nov 2026. GrayPortal's framed copy is gone.
// Source and how it works: GrayScale/demos/builder/README.md.
export default async function DemoBuilderPage() {
  const caller = await getCaller();
  if (caller.role !== "admin") redirect("/");
  const url = osseusUrl();
  if (url) redirect(`${url}/platform/demos`);
  return (
    <div className="screen">
      <PageHead title="Demo builder" sub="Demos are built in Osseus at /platform/demos. Set OSSEUS_URL so this opens it.">{null}</PageHead>
    </div>
  );
}
