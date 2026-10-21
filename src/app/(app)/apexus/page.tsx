import ApexusBuilder from "./ApexusBuilder";
import { PageHead } from "@/components/ui/terminal/Term";

export default function ApexusPage() {
  return (
    <div className="gh-term-page">
      <PageHead
        title="Apexus quote builder"
        sub="Curates a package from GrayPortal's pricing catalogue and GrayScale products, then exports a client-facing quote. Prices flow through from /pricing and /grayscale-products on next load."
      />
      <ApexusBuilder />
    </div>
  );
}
