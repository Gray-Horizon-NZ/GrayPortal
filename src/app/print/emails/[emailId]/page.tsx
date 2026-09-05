import { notFound } from "next/navigation";
import { getEmailBody } from "@/lib/dal/emails";
import { INK, MUTED, HEADING_FONT } from "@/lib/email/chrome";
import AutoPrint from "./AutoPrint";

const PAPER = "#f7f5f0";
const BORDER = "#e2ddd0";
const BODY_FONT = "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export default async function EmailPrintPage({ params }: { params: Promise<{ emailId: string }> }) {
  const { emailId } = await params;
  const email = await getEmailBody(emailId);
  if (!email) notFound();

  return (
    <div style={{ background: PAPER, minHeight: "100vh", padding: "32px 16px", fontFamily: BODY_FONT, color: INK }}>
      <AutoPrint />
      <div style={{ maxWidth: 640, margin: "0 auto", background: "#ffffff", border: `1px solid ${BORDER}` }}>
        <div style={{ padding: "28px 32px", borderBottom: `2px solid ${MUTED}` }}>
          <h1 style={{ fontFamily: HEADING_FONT, fontSize: 22, fontWeight: 600, margin: 0 }}>
            {email.subject || "(no subject)"}
          </h1>
          <div style={{ marginTop: 12, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
            <div>From: {email.fromAddress}</div>
            <div>To: {email.toAddresses.join(", ")}</div>
            <div>Date: {new Date(email.sentAt).toLocaleString("en-NZ")}</div>
          </div>
        </div>
        <div style={{ padding: 32, fontSize: 14, lineHeight: 1.6 }}>
          {email.html ? (
            <div dangerouslySetInnerHTML={{ __html: email.html }} />
          ) : email.text ? (
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{email.text}</pre>
          ) : (
            <p style={{ color: MUTED }}>(No readable body content)</p>
          )}
        </div>
        <div style={{ padding: "16px 32px", borderTop: `1px solid ${BORDER}`, fontSize: 11, color: MUTED }}>
          Gray Horizon · Auckland, NZ
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 16mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
