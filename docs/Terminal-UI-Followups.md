# Terminal UI: real-system follow-ups

Written 2026-10-21 while reviewing the terminal-UI concept (`OS/grayportal-terminal-concept`, mock data only). These changes need backend work in the real Gray Portal, not just CSS. Project Incrementum is out of scope.

## 1. Client health score: add more room

**Problem:** health is too tight, and brand-new clients show red.

**Why it happens** (`src/lib/dal/health.ts`): four components, each worth 0–25, are added together.

| Component | New client today | Why |
|---|---|---|
| Payment | 15 | No payment date gives a neutral 60%. |
| Tasks | 0 | Onboarding creates tasks, none are done yet, so 0 done ÷ N = 0. |
| Activity | 0 | No `activities` row yet means `lastActivityAt` is null, which scores 0. |
| Deal momentum | 15 | No open deals gives a neutral 60%. |
| **Total** | **≈30** | Red. |

**Fixes to work through:**
- **Grace period.** For a client's first 30 days, score any component with no history yet as neutral (60%) instead of 0, and label the score "Settling in" rather than showing a colour.
- **Tasks: judge overdue work, not completion.** Score the share of tasks that are *not overdue*, not done ÷ total. Fresh tasks that aren't due yet shouldn't count against anyone.
- **Activity: count the client's own signals too:** portal logins, emails linked to the client, meeting summaries, activity-feed entries, and onboarding-wizard completion. Not only `activities` rows.
- **Wider bands.** Today good is 75+, watch 55–74, at risk below 55. Consider good 65+, watch 40–64, at risk below 40.
- **Smoothing.** Use a rolling average of the last 3 nightly scores, so one missed task doesn't swing the trend arrow.
- **Explainability.** Store a short reason with each component (e.g. "2 tasks overdue", "no activity in 34 days") so the profile can say why a score is low.

## 2. Email triage linked to clients

Wanted: if someone emails max@grayhorizon.nz from an address linked to a client, the email shows up in Email Triage under that client, and Max can reply from there.

- The pieces exist already: the `emails` table (Gmail message/thread IDs, contact/deal links), per-client extra addresses (`email-triage/clients`), and Gmail OAuth for campaigns.
- **Needed:**
  - A Gmail sync (push via Pub/Sub watch, or a cron poll) that matches the sender's address against client contacts, team members and the extra addresses, then writes `emails` rows.
  - Triage folders: Needs reply, Clients, Leads, FYI.
  - Reply from the portal using the Gmail API `threadId`, so replies stay in the same Gmail thread.
  - Unmatched mail stays in Gmail, and isn't pulled into the portal.

## 3. Website inquiries alert

- `/api/leads` already writes website-form submissions through `createLead()`.
- **Add:**
  - An `acknowledged_at` column on leads.
  - An "Inquiries" button in the header with an unread count. It glows gold while any lead is unacknowledged.
  - A dropdown listing recent submissions. Clicking one opens a pop-up with the submitted fields (company, name, email, phone, website, message) and sets `acknowledged_at`.
- This is a backstop for when the notification email doesn't arrive.

## 4. Finance

- **One-off and setup payments are recorded on the client profile** (Commercial tab) and listed read-only on Finance with a link back. They can't be created from the Finance page.
- **No manual "mark received".** The Xero invoice status is the only source of truth.
- **One-off expenses / purchases** (e.g. the iPhone) need their own log, separate from the recurring expenses table. Fields: date, item, amount, GST, category, a write-off flag and notes.
- **CSV export:**
  - One file each for the recurring expenses, the one-off purchases, and income (recurring plus one-off) for a chosen tax year.
  - Plus an "Export all for tax" option that writes all three.

## 5. Pricing

- Keep the current module-tile layout.
- Remove the item ID line (e.g. `ao-integration-map`) under each title.
- Show Suggested prices only inside the expanded Edit panel.

## 6. Client portal

- Rename "View client portal" to "Access client portal" and keep it prominent on the profile header.
- Tasks stay a client-portal feature (the `tasks` portal toggle).
