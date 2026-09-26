# Design System — DMC Claims Integration AI

Scope: the internal review-queue UI and dashboard used by DMC billing staff.
Built for a small internal tool — favors clarity and speed over visual
flourish, and stays consistent with Brian's usual single-file / minimal-
dependency build style (vanilla HTML/CSS/JS, easy to run on the LAN, no
heavy framework required).

## 1. Principles

1. **Scannable over decorative.** Staff triage a list of flagged claims all
   day — status must be readable at a glance (color + icon + text, never
   color alone).
2. **Explain, don't just flag.** Every flagged claim shows *why*, in plain
   language, not an error code.
3. **Low-friction on LAN hardware.** Assume older office PCs, small
   monitors, sometimes slow local network — keep the UI light (no heavy JS
   frameworks, minimal external requests).
4. **Boring is good.** This is a billing tool, not a product demo. Predictable
   layout, no surprises.

## 2. Color system

Use CSS variables so it's trivial to theme and to keep contrast consistent.

```css
:root {
  /* Neutrals */
  --color-bg: #f7f8fa;
  --color-surface: #ffffff;
  --color-border: #e2e5ea;
  --color-text: #1c2230;
  --color-text-muted: #5b6472;

  /* Status colors — status is always paired with an icon + label, never color alone */
  --color-clean: #1e7e42;       /* claim passed all checks */
  --color-clean-bg: #e9f7ee;
  --color-review: #b7791f;      /* needs human review */
  --color-review-bg: #fdf3e0;
  --color-blocked: #b42318;     /* hard failure, do not submit */
  --color-blocked-bg: #fdeceb;

  /* Accent (for primary actions/links) */
  --color-accent: #2054a6;
  --color-accent-hover: #163f80;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #12151b;
    --color-surface: #1a1f28;
    --color-border: #2b313d;
    --color-text: #e8eaee;
    --color-text-muted: #9aa3b2;
    --color-clean-bg: #123320;
    --color-review-bg: #3a2a10;
    --color-blocked-bg: #3a1512;
  }
}
```

## 3. Typography

- System font stack — no web-font dependency, loads instantly on LAN:
  `font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;`
- Scale: 12px (meta/labels) / 14px (body, table rows) / 16px (section
  headers) / 20px (page title). Nothing larger is needed for this tool.
- Numeric/claim-ID fields use a monospace font
  (`font-family: "SF Mono", Consolas, monospace;`) so IDs and codes align
  and are easy to compare.

## 4. Status pattern (core UI element)

Every claim status uses this triplet, consistently, everywhere it appears
(table row, detail view, dashboard chart legend):

| Status | Color token | Icon | Label |
|---|---|---|---|
| Clean | `--color-clean` | check | "Clean" |
| Needs review | `--color-review` | warning triangle | "Needs review" |
| Blocked | `--color-blocked` | stop/octagon | "Blocked" |

Badge shape: small rounded-rect pill, background = the `-bg` variant, text =
the solid color, 12px font, icon to the left of the label.

## 5. Layout

- **Review queue**: single-column table, one row per claim — Patient,
  Insurer, Claim ID, Status badge, Top reason (truncated), "Review" link.
  Sortable by status severity (Blocked → Needs review → Clean) by default.
- **Claim detail**: header (patient/insurer/claim ID), status badge, then a
  plain list of every reason the claim was flagged, each reason naming the
  specific field and what's wrong — not a stack trace.
- **Dashboard** (should-have): a small set of cards (rejection rate this
  week, top 3 rejection reasons, flagged-by-insurer breakdown) — charts kept
  simple (bar/line), no 3D or decorative chart junk.

## 6. Components

- **Badge** — status pattern above.
- **Reason list item** — icon + one-line plain-language explanation +
  optional "view field" link back to the MIS record.
- **Table row** — hover state, click-through to detail, no inline editing
  (edits happen in the MIS, not here, to avoid two sources of truth).
- **Override action** — a clearly secondary-styled button ("Submit anyway"),
  requires a reason before it's enabled, always logged.

## 7. Accessibility & practicality

- Minimum 14px body text, AA contrast on all status colors against their
  backgrounds.
- Keyboard-navigable table (arrow keys / tab) since staff will be using this
  for hours at a time.
- No animation beyond simple hover/focus states — nothing that costs
  render time on older hardware.
