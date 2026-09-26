# Architecture — DMC Claims Integration AI

## 1. Context

DMC's hospital MIS runs on the hospital LAN (Node.js/Express backends,
PostgreSQL, per DMC's existing infra work). This system sits alongside it as
a **read-mostly satellite service**: it pulls claim-relevant data, evaluates
it, and surfaces results — it does not become the system of record and does
not write back into clinical/MIS tables.

Most insurers' data lives inside the MIS already. A subset (e.g. MMI, RSSB)
are handled through external insurer portals outside the MIS, so those are
architected as a separate, later integration rather than blocking v1.

## 2. High-level components

```
 ┌─────────────────┐      ┌──────────────────────┐      ┌────────────────────┐
 │  Hospital MIS     │      │  Claims Integration   │      │  Review Queue UI    │
 │  (PostgreSQL,      │─────▶│  AI service            │─────▶│  (staff-facing)      │
 │  LAN-hosted)        │ read │  - Extractor           │ API  │                      │
 └─────────────────┘      │  - Rules engine        │      └────────────────────┘
                            │  - Claims DB (own)     │
                            │  - Audit log           │
                            └──────────────────────┘
                                     │
                                     ▼ (later)
                            ┌──────────────────────┐
                            │  External insurer      │
                            │  portals (MMI, RSSB…)  │
                            │  — future integration   │
                            └──────────────────────┘
```

## 3. Components in detail

### 3.1 Extractor
- Pulls claim-relevant records from the MIS PostgreSQL database.
- **Access pattern (open question, pick one for v1):**
  - Direct read-only DB user against MIS tables (simplest, fastest to
    build; risk: coupling to MIS schema, and query load on a live system).
  - Scheduled export/view (MIS exposes a claims-relevant view or nightly
    export; safer for MIS load, adds latency).
  - Recommendation for prototype: start with a **read-only DB role + scoped
    views**, poll on an interval (e.g. every few minutes) rather than
    real-time triggers, to keep it simple and low-risk against the live
    MIS.
- Normalizes MIS records into the service's own `claims` schema (see §4).

### 3.2 Rules engine
- Runs each claim through a set of checks. Two layers:
  - **Generic checks** (apply to all insurers): required fields present,
    valid date ranges, duplicate-claim detection (same patient + service +
    date already submitted), basic code-format validation.
  - **Payer-specific rule sets** (per insurer, data-driven — not hardcoded
    per insurer in code): coverage/eligibility rules, pre-authorization
    requirements, insurer-specific documentation requirements.
- Rule sets stored as data (config table or JSON/YAML per insurer) so new
  rules can be added without redeploying code — important since payer rules
  aren't fully documented yet and will be discovered incrementally from past
  rejections.
- Output per claim: `clean` / `needs_review` / `blocked`, plus a list of
  `(rule_id, field, plain_language_reason)` for anything that fired.

### 3.3 Claims DB (service-owned)
- Separate PostgreSQL database (or schema) owned by this service — not the
  MIS's own tables. Holds: normalized claim snapshots, rule evaluation
  results, review/override history, audit log.
- Keeping this separate from the MIS means the checker can be rebuilt,
  re-run, or reset without any risk to clinical data.

### 3.4 Review Queue UI
- Talks only to the service's own API/DB, never directly to the MIS.
- Renders the queue and claim detail (see Design System doc).
- Override action writes to the audit log with staff ID, timestamp, reason.

### 3.5 Audit log
- Append-only table: every rule evaluation, every staff review/override,
  timestamped. This is what makes "submit anyway" safe to allow — it's
  visible after the fact, not silently bypassed.

## 4. Data model (starting point)

```
claims
  id, mis_claim_id, patient_ref, insurer_id, service_date,
  service_codes[], diagnosis_codes[], amount, pre_auth_ref (nullable),
  pulled_at, status  -- clean | needs_review | blocked

claim_flags
  id, claim_id, rule_id, field, reason_text, severity, created_at

insurers
  id, name, integration_type  -- 'mis' | 'external_portal'

rules
  id, insurer_id (nullable = generic), rule_type, config (jsonb), active

review_actions
  id, claim_id, staff_id, action, reason, created_at
```

## 5. Deployment

- Matches DMC's existing stack: Node.js/Express service, PostgreSQL,
  runs on the LAN alongside the MIS (or on the same server class already
  used for other DMC internal tools).
- No external hosting needed for v1 (this is internal-only) — keeps it
  inside DMC's network, which also sidesteps data-sensitivity concerns
  around patient/claims data leaving the LAN.
- Deploy/rollback kept simple (matches Brian's preference for minimal,
  immediately-runnable setups) — a single service process + migrations,
  not a multi-service orchestration.

## 6. Non-functional constraints

- **Do not degrade the MIS.** Read-only access, bounded/scheduled polling,
  no long-running queries against live MIS tables.
- **Data sensitivity.** Patient and claims data stays on the LAN; no
  external API calls with patient data unless/until external-portal
  integrations are explicitly scoped and approved.
- **Extensibility over cleverness.** Rule sets must be addable/editable
  without code changes, since the actual payer rules will be discovered
  incrementally, not fully known up front.

## 7. Future extensions (not v1)

- External-portal integrations for MMI, RSSB, etc. (API where available,
  otherwise a scoped automation/scraping approach — TBD per insurer, and
  likely per-insurer bespoke work).
- Smarter checks beyond static rules (pattern/anomaly detection over
  historical rejection data).
- Multi-tenant version if this is ever offered to other hospitals.
