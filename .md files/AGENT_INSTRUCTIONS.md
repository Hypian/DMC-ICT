# Agent Instructions — DMC Claims Integration AI

For any AI coding agent (Claude Code or similar) working in this repo.
Read `PRD.md`, `ARCHITECTURE.md`, and `DESIGN_SYSTEM.md` first — this file
tells you how to act on them, not what they say.

## 1. What this project is

An internal tool for Dream Medical Center (DMC), Kigali, that reads
claim-relevant data from the hospital MIS and flags claims likely to be
rejected by insurers, before submission. It is a satellite service, not a
rewrite of the MIS. Single maintainer (Brian) will own and extend this
after handoff — optimize for something one person can understand and run,
not for architectural cleverness.

## 2. Ground rules

- **Read-only against the MIS, always.** Never write to MIS tables. This
  service owns its own database/schema for everything it produces (claim
  snapshots, flags, audit log). If a task seems to require writing back to
  the MIS, stop and flag it rather than doing it.
- **Never fabricate payer rules.** Payer/insurer requirements are being
  discovered incrementally from real rejection cases and contracts. Don't
  invent plausible-sounding insurance rules to fill gaps — implement the
  rules engine so rules are data (config), and leave a rule set genuinely
  empty or clearly marked `// TODO: source from DMC billing` rather than
  guessing.
- **Patient data stays on the LAN.** No external API calls that send
  patient-identifiable or claims data anywhere outside DMC's network, unless
  a task explicitly says otherwise and names the destination.
- **Match the existing stack.** Vanilla HTML/CSS/JS on the frontend,
  Node.js/Express backend, PostgreSQL. Avoid introducing a new framework,
  ORM, or build toolchain unless asked — the goal is minimal dependencies
  and something that runs immediately on modest LAN hardware.
- **Prefer one runnable file/module over a scaffold.** When a task is small
  (a script, a single check, a small UI view), default to a self-contained
  implementation over generating boilerplate project structure.

## 3. Working style

- Implement against the data model in `ARCHITECTURE.md` §4 unless a task
  explicitly changes it — if you do change it, update that section in the
  same change.
- New rule types go into the rules engine as data-driven config (see
  Architecture §3.2), not as one-off hardcoded `if (insurer === 'X')`
  branches scattered through the codebase.
- UI work follows `DESIGN_SYSTEM.md` — status must always be color + icon +
  text (never color alone), and claim reasons must be written in plain
  language a billing staffer can act on without asking what it means.
- Every claim evaluation and every staff override must be written to the
  audit log — this isn't optional polish, it's what makes the "submit
  anyway" override safe to have at all.
- Keep the extractor's polling/query pattern bounded and scheduled (not
  tight-loop or unbounded), per Architecture §6 — this runs next to a live
  clinical system.

## 4. When something is ambiguous

This is a prototype being built against real, partially-undocumented payer
rules and a real hospital MIS. When a task is underspecified:
- Prefer the simplest correct interpretation that matches the PRD's stated
  v1 scope (§6 of `PRD.md`) — don't build "should-have" or "could-have"
  features into a "must-have" task unless asked.
- If a decision affects patient data handling, MIS load, or what counts as
  a hard "Blocked" vs. a "Needs review," don't guess — state the assumption
  you're making plainly rather than silently picking one.
- External-portal insurers (MMI, RSSB, etc.) are out of scope for direct
  integration in v1 — rule sets for them can still be defined (based on
  known requirements) even without a live data feed; don't build a portal
  integration unless a task explicitly asks for one.

## 5. Testing / validation

- Where historical rejected-claim data is available, validate new rules
  against it rather than only against synthetic test cases.
- Favor a low false-negative rate (missing a real rejection risk) over a
  low false-positive rate at this stage — staff can dismiss an over-eager
  flag, but a missed one defeats the point of the tool.

## 6. Don't

- Don't add authentication/hosting complexity beyond what an internal LAN
  tool needs (this is not a public product yet).
- Don't introduce a message queue, microservice split, or container
  orchestration for v1 — a single service process is the stated target.
- Don't silently drop the audit trail for the sake of a simpler code path.
