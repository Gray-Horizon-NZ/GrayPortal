import { redirect } from "next/navigation";

// Contractors moved into Project Incrementum (docs/Project-Incrementum-Plan.md
// §4) — the recruiting pipeline, bench and profiles live there now. Existing
// roster records (and their /contractors/[id] pages) still work; the
// Incrementum Contractors tab lists any that don't have a profile yet so
// they can be brought across.
export default function ContractorsPage() {
  redirect("/incrementum/contractors");
}
