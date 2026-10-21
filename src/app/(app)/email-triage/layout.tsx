import TriageTabs from "./TriageTabs";
import { PageHead } from "@/components/ui/terminal/Term";

export default function EmailTriageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gh-term-page" style={{ maxWidth: 1000 }}>
      <PageHead title="Email triage" sub="Inbound mail that couldn't be auto-matched to a contact, and a single feed of every matched client email." />
      <TriageTabs />
      {children}
    </div>
  );
}
