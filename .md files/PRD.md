# PRD — DMC Claims Integration AI (Claim Rejection Checker)

**Owner:** Brian, IT, Dream Medical Center (DMC), Kigali
**Status:** Draft v1
**Target:** Working prototype in ~4 weeks

## 1. Problem

DMC submits insurance claims from its hospital MIS to multiple insurers (some
integrated, some — e.g. MMI, RSSB — routed through external portals). Claims
get rejected after the fact for avoidable reasons: missing pre-authorization,
mismatched patient/policy data, invalid or expired coverage, incorrect
coding, duplicate submissions, or missing required documentation. Rejections
are discovered late, cost staff time to rework, and delay revenue.

There is no step where a claim is checked against payer rules *before* it
leaves DMC. Reference products like Lamu (Ginja AI) show real-time claims
validation is the right shape of solution, but DMC needs something scoped to
its own MIS, insurers, and LAN environment rather than a bought platform.

## 2. Goal

Build a system that pulls claim-relevant data out of DMC's hospital MIS,
runs a rule-based (and later smarter) check against known payer requirements,
and flags likely-to-be-rejected claims *before* submission — so staff can fix
them while the patient encounter is still fresh.

## 3. Non-goals (v1)

- Not replacing the hospital MIS or becoming the system of record.
- Not automating submission to insurer portals (MMI/RSSB external-portal
  insurers stay manual for now — flagged as a future integration).
- Not a full RCM (revenue cycle management) suite — scope is pre-submission
  rejection checking only.
- Not a public/multi-tenant product yet — DMC-internal tool first, with
  possible external sale later if it proves out.

## 4. Users

| User | Need |
|---|---|
| Billing/claims staff | See which claims are flagged, why, and what to fix, before submitting |
| Hospital administration | Trust that fewer claims bounce; visibility into rejection-reason trends |
| Brian (builder/maintainer) | A system he can extend rule-by-rule as new rejection patterns show up |

## 5. Core user flow

1. A claim-relevant encounter is recorded in the MIS (patient, insurer,
   service codes, diagnosis, pre-auth status, etc.).
2. The system pulls that record (poll or trigger — see Architecture doc).
3. It runs the record through a rules engine: required-field checks,
   coverage/eligibility checks, coding sanity checks, duplicate-claim checks,
   payer-specific rules (per insurer).
4. Each claim gets a status: **Clean**, **Needs review** (with reasons), or
   **Blocked** (hard failure, e.g. no active coverage).
5. Staff see a queue of flagged claims with plain-language reasons and the
   specific field(s) to fix.
6. Staff fix in the MIS or mark as "submit anyway" (with a reason, logged for
   audit) and the claim moves on.

## 6. Functional requirements

### Must-have (v1 prototype)
- Read-only connection into the DMC MIS database (LAN-hosted) to pull claim
  records.
- A rules engine covering at minimum: required fields present, active
  coverage/policy validity, duplicate submission detection, basic
  code-format validation.
- A simple review queue UI: list of flagged claims, reason(s), link back to
  the source record.
- Per-insurer rule sets, starting with DMC's top 3–5 insurers by claim
  volume.
- Audit log: who reviewed/overrode a flagged claim, and when.
- Runs on DMC's existing infra (LAN server / Node.js / PostgreSQL, per
  current stack).

### Should-have
- Basic dashboard: rejection-risk trends by insurer, by reason, over time.
- Manual "recheck" trigger for a single claim.
- CSV export of flagged claims for offline review.

### Could-have (later)
- Integration with MMI/RSSB external portals (API or scraping, TBD per
  insurer).
- Smarter matching (fuzzy patient/policy matching, anomaly detection) beyond
  static rules.
- Notifications (LAN messenger / email) when a claim is blocked.
- External productization for other Rwandan hospitals.

### Out of scope (v1)
- Auto-submission to any insurer.
- Patient-facing anything.

## 7. Success criteria

- Prototype correctly flags a representative sample of historically
  rejected claims (measured against DMC's existing rejection records) with
  low false-negative rate.
- Staff can act on a flagged claim (understand + fix) without needing to ask
  Brian what it means.
- Runs reliably against the live MIS without degrading its performance.
- Demonstrable in the 4-week / biweekly-checkpoint plan already scoped with
  supervisors.

## 8. Risks / open questions

- **MIS access pattern**: direct DB read vs. an export/API layer — depends
  on how much load the MIS can take and how current the data needs to be.
- **Rule sourcing**: DMC's actual payer rules aren't fully documented
  anywhere yet — will need to be built up from past rejection cases + payer
  contracts, and will keep evolving.
- **External-portal insurers (MMI, RSSB)**: may need separate, later
  integration work; v1 rules for them will be based on known requirements
  even without a live data feed.
- **Single-maintainer risk**: Brian is building and running this — v1 should
  favor simplicity and maintainability over cleverness.

## 9. Rough timeline

- Week 1: MIS data access + schema mapping; rule set for top insurers drafted.
- Week 2: Rules engine + review queue UI (prototype).
- Week 3: Test against historical rejected claims; refine rules; audit log.
- Week 4: Internal pilot with billing staff; checkpoint demo to supervisors.
