// Starter email drafts for the Incrementum composers. They only pre-fill
// the subject/body fields — Max edits before anything is sent, and nothing
// here is ever sent automatically. {{first_name}} and {{business}} are
// filled from the record.
export type EmailDraft = { key: string; label: string; subject: string; body: string };

export const CONTRACTOR_DRAFTS: EmailDraft[] = [
  {
    key: "outreach",
    label: "First outreach",
    subject: "Ongoing work with Gray Horizon",
    body: `Hi {{first_name}},

I'm Max from Gray Horizon, a growth agency in Auckland. I came across your work and I'm building a small bench of specialists to deliver ongoing client work with us.

It's monthly retainer work, steady rather than one-off. I'd love a quick 20-minute chat about how you work, your rates and your capacity.

Would any time this week or next suit?

Max
Gray Horizon`,
  },
  {
    key: "follow_up",
    label: "Meeting follow-up",
    subject: "Great to chat",
    body: `Hi {{first_name}},

Thanks for your time today. As discussed, the next step is a short paid test task so we can see how you work. I'll send the brief through shortly.

Max`,
  },
  {
    key: "confirmed",
    label: "You're confirmed",
    subject: "Welcome to the Gray Horizon bench",
    body: `Hi {{first_name}},

Great news: we'd like you on the Gray Horizon bench.

Next I'll send our contractor agreement (pay-when-paid terms, confidentiality and non-solicit) for you to review and sign. Once that's back, I'll set you up with access.

Max`,
  },
  {
    key: "welcome",
    label: "Onboarding welcome",
    subject: "You're set up with Gray Horizon",
    body: `Hi {{first_name}},

You'll receive a separate email to set your Gray Portal password. That's where your assigned work and tasks live.

A few ground rules: clients deal with Gray Horizon only, so all client communication goes through me. Work comes to me for approval before it reaches the client.

Max`,
  },
];

export const LEAD_DRAFTS: EmailDraft[] = [
  {
    key: "first_reply",
    label: "First reply",
    subject: "Thanks for getting in touch",
    body: `Hi {{first_name}},

Thanks for reaching out about {{business}}. I'd love to learn more about what you're after.

Have you got 20 minutes for a quick call this week? Let me know a time that suits, or reply with the best number to reach you on.

Max
Gray Horizon`,
  },
  {
    key: "follow_up",
    label: "Follow-up",
    subject: "Following up",
    body: `Hi {{first_name}},

Just following up on my last note. Happy to work around your schedule for a quick call.

Max`,
  },
  {
    key: "proposal",
    label: "Proposal sent",
    subject: "Your proposal from Gray Horizon",
    body: `Hi {{first_name}},

As promised, here's the proposal for {{business}}. Any questions at all, just reply here.

Max`,
  },
];

export function fillDraft(text: string, vars: { name: string | null; business?: string | null }): string {
  const first = (vars.name ?? "").trim().split(/\s+/)[0] || "there";
  return text.replaceAll("{{first_name}}", first).replaceAll("{{business}}", vars.business ?? "your business");
}
