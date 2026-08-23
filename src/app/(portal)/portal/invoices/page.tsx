import { notFound } from "next/navigation";
import { getEnabledFeatureKeys, listPortalInvoices } from "@/lib/dal/portal";

const STATUS_TAG: Record<string, string> = {
  PAID: "ghp-good",
  AUTHORISED: "ghp-warn",
  SUBMITTED: "ghp-warn",
  DRAFT: "",
  VOIDED: "ghp-danger",
  DELETED: "ghp-danger",
};

export default async function PortalInvoicesPage() {
  const enabled = await getEnabledFeatureKeys();
  if (!enabled.includes("invoices")) notFound();

  const invoices = await listPortalInvoices();
  const outstanding = invoices.filter((i) => i.status === "AUTHORISED" || i.status === "SUBMITTED");

  return (
    <div>
      <div className="ghp-page-head">
        <h1>Invoices</h1>
        <div className="ghp-sub">Billing history</div>
      </div>

      <div className="ghp-panel-block">
        <div className="ghp-panel-head">
          <div className="ghp-t">Invoices</div>
          <div className="ghp-n">{outstanding.length} outstanding</div>
        </div>
        {invoices.length > 0 ? (
          <table className="ghp-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Status</th>
                <th className="ghp-r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div className="ghp-proj-name">
                      {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-NZ", { month: "long", year: "numeric" }) : "—"}
                    </div>
                  </td>
                  <td>
                    <span className={`ghp-tag ${STATUS_TAG[inv.status] ?? ""}`}>
                      {inv.status === "PAID" ? "Paid" : inv.dueDate ? `Due ${inv.dueDate}` : inv.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="ghp-r">
                    <span className="ghp-serif" style={{ fontSize: 15 }}>
                      {inv.total ? `$${Number(inv.total).toLocaleString("en-NZ")}` : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="ghp-empty">No invoices yet.</p>
        )}
      </div>
    </div>
  );
}
