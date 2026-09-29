/* =========================================================
   DMC Claims Assurance — Frontend & EMR Widget System
   ---------------------------------------------------------
   - Iconography: Boxicons (bx / bxs)
   - Live EMR Widget View (Receipt / Ledger Audit Card)
   - Standalone Embed Mode (?widget=1 or ?embed=1)
   ========================================================= */

const MOCK_CLAIMS = [
  {
    id: "CLM-1048",
    patient: "A. Wanjiru",
    visitId: "VISIT #48211",
    scheme: "Outpatient · Corporate scheme B",
    payer: "Jubilee",
    severity: "low",
    currency: "RWF",
    rule: "Pre-bill audit complete",
    whatsWrong: "No audit discrepancies detected.",
    whyItMatters: "Clean claims have 98.4% first-pass payment rate without queries.",
    whatToDo: "Proceed with submission batch.",
    owner: "Dr. Achieng",
    status: "clean",
    stage: 3,
    items: [
      { desc: "Consultation – Dr. Achieng · A09", amount: 3500 },
      { desc: "CT scan – abdomen", amount: 12800 },
      { desc: "Rx – Amoxicillin 500mg", amount: 2150 }
    ],
    invoiceTotal: 18450,
    checklist: [
      { label: "Member eligible", value: "verified", status: "pass" },
      { label: "Balance covers visit", value: "RWF 84,000", status: "pass" },
      { label: "CT scan – pre-auth", value: "approved", status: "pass" },
      { label: "CT added to bill", value: "+ 12,800", status: "pass" },
      { label: "Rx – no pre-auth needed", value: "added · + 2,150", status: "pass" },
      { label: "Amounts within tariffs", value: "all items valid", status: "pass" },
      { label: "Stamp & signatures", value: "doctor + patient", status: "pass" },
      { label: "Claim form", value: "complete & valid", status: "pass" }
    ],
    createdAt: "2026-09-22T08:15:00Z"
  },
  {
    id: "CLM-1042",
    patient: "A. Uwase",
    visitId: "VISIT #10492",
    scheme: "Outpatient · Jubilee Premier",
    payer: "Jubilee",
    severity: "high",
    currency: "RWF",
    rule: "Missing pre-authorization",
    whatsWrong: "MRI request lacks a documented clinical rationale.",
    whyItMatters: "Jubilee requires a documented clinical indication before an MRI claim will be accepted.",
    whatToDo: "Add the clinical indication to the consult note, then resubmit for pre-auth.",
    owner: "Dr. Njeri",
    status: "flagged",
    stage: 2,
    items: [
      { desc: "Consultation – Dr. Njeri · N04", amount: 3500 },
      { desc: "MRI – Lumbar Spine with contrast", amount: 28000 },
      { desc: "Rx – Celecoxib 200mg", amount: 1850 }
    ],
    invoiceTotal: 33350,
    checklist: [
      { label: "Member eligible", value: "verified", status: "pass" },
      { label: "Balance covers visit", value: "RWF 95,000", status: "pass" },
      { label: "MRI scan – pre-auth", value: "missing indication", status: "fail" },
      { label: "MRI added to bill", value: "+ 28,000", status: "pass" },
      { label: "Rx – no pre-auth needed", value: "added · + 1,850", status: "pass" },
      { label: "Amounts within tariffs", value: "all items valid", status: "pass" },
      { label: "Stamp & signatures", value: "pending note", status: "warning" },
      { label: "Claim form", value: "draft incomplete", status: "warning" }
    ],
    createdAt: "2026-09-21T08:14:00Z"
  },
  {
    id: "CLM-1043",
    patient: "E. Mugisha",
    visitId: "VISIT #10501",
    scheme: "Outpatient · SHA Scheme Standard",
    payer: "SHA",
    severity: "high",
    currency: "RWF",
    rule: "Insurance ID mismatch",
    whatsWrong: "Member ID on file doesn't match the format SHA expects for this scheme.",
    whyItMatters: "Claims with an invalid member ID are rejected outright, not queried — no recovery path.",
    whatToDo: "Confirm the correct SHA ID at the front desk and update the visit record.",
    owner: "Front Desk",
    status: "flagged",
    stage: 2,
    items: [
      { desc: "Specialist Consult – Internal Med", amount: 4000 },
      { desc: "Full Hemogram & ESR", amount: 3200 },
      { desc: "Rx – Azithromycin 500mg", amount: 1950 }
    ],
    invoiceTotal: 9150,
    checklist: [
      { label: "Member eligible", value: "format mismatch", status: "fail" },
      { label: "Balance covers visit", value: "RWF 50,000", status: "pass" },
      { label: "Lab panel – pre-auth", value: "covered tier", status: "pass" },
      { label: "Amounts within tariffs", value: "all items valid", status: "pass" },
      { label: "Claim form", value: "pending ID update", status: "warning" }
    ],
    createdAt: "2026-09-21T09:02:00Z"
  },
  {
    id: "CLM-1038",
    patient: "P. Kagame",
    visitId: "VISIT #10467",
    scheme: "Outpatient · Britam Care Plus",
    payer: "Britam",
    severity: "medium",
    currency: "RWF",
    rule: "Diagnosis / procedure mismatch",
    whatsWrong: "Billed procedure code doesn't correspond to the recorded ICD-10 diagnosis.",
    whyItMatters: "Payer systems auto-flag coding mismatches, which usually means a full resubmission cycle.",
    whatToDo: "Have the attending confirm the correct diagnosis code for this procedure.",
    owner: "Dr. Habimana",
    status: "resolved",
    stage: 3,
    items: [
      { desc: "Consultation – General Practice", amount: 3000 },
      { desc: "Joint Infiltration Therapy", amount: 7500 },
      { desc: "Rx – Methylprednisolone 40mg", amount: 1600 }
    ],
    invoiceTotal: 12100,
    checklist: [
      { label: "Member eligible", value: "verified", status: "pass" },
      { label: "Balance covers visit", value: "RWF 60,000", status: "pass" },
      { label: "ICD-10 coding", value: "re-aligned M25.5", status: "pass" },
      { label: "Tariff compliance", value: "all items valid", status: "pass" },
      { label: "Claim form", value: "complete & valid", status: "pass" }
    ],
    createdAt: "2026-09-19T14:20:00Z",
    resolvedAt: "2026-09-19T16:40:00Z"
  },
  {
    id: "CLM-1035",
    patient: "S. Ingabire",
    visitId: "VISIT #10440",
    scheme: "Outpatient · AAR Executive Tier",
    payer: "AAR",
    severity: "low",
    currency: "RWF",
    rule: "Member share not collected",
    whatsWrong: "Co-pay of RWF 1,000 was not collected at the point of service.",
    whyItMatters: "Uncollected member shares become write-offs once the visit closes.",
    whatToDo: "Route to credit control for follow-up before month-end reconciliation.",
    owner: "Credit Control",
    status: "flagged",
    stage: 2,
    items: [
      { desc: "Pediatric Consultation", amount: 3500 },
      { desc: "Nebulization Session", amount: 2000 },
      { desc: "Rx – Salbutamol Inhaler", amount: 1200 }
    ],
    invoiceTotal: 6700,
    checklist: [
      { label: "Member eligible", value: "verified", status: "pass" },
      { label: "Balance covers visit", value: "RWF 72,000", status: "pass" },
      { label: "Co-pay collection", value: "pending RWF 1,000", status: "fail" },
      { label: "Tariff compliance", value: "all items valid", status: "pass" },
      { label: "Claim form", value: "held for receipt", status: "warning" }
    ],
    createdAt: "2026-09-20T11:05:00Z"
  },
  {
    id: "CLM-1031",
    patient: "J. Niyonsenga",
    visitId: "VISIT #2204",
    scheme: "Inpatient · CIC Comprehensive",
    payer: "CIC",
    severity: "high",
    currency: "RWF",
    rule: "Waiting period not yet met",
    whatsWrong: "Admission falls inside the scheme's 90-day waiting period for inpatient cover.",
    whyItMatters: "Claims filed before the waiting period ends are excluded, not delayed — this one won't pay.",
    whatToDo: "Flag to billing for a direct-pay conversation with the patient before discharge.",
    owner: "Billing",
    status: "rejected",
    stage: 2,
    items: [
      { desc: "Inpatient Ward (2 nights)", amount: 16000 },
      { desc: "Surgical Prep & Monitoring", amount: 18500 }
    ],
    invoiceTotal: 34500,
    checklist: [
      { label: "Member eligible", value: "waiting period active", status: "fail" },
      { label: "Balance covers visit", value: "excluded policy", status: "fail" },
      { label: "Direct-pay transition", value: "patient notified", status: "warning" }
    ],
    createdAt: "2026-09-18T10:00:00Z",
    resolvedAt: "2026-09-18T15:12:00Z",
    rejectionReason: "Confirmed with the scheme — waiting period genuinely not met. Converted to direct pay."
  },
  {
    id: "CLM-1029",
    patient: "M. Uwimana",
    visitId: "VISIT #10388",
    scheme: "Outpatient · OM/UAP Silver",
    payer: "OM/UAP",
    severity: "medium",
    currency: "RWF",
    rule: "Tariff limit exceeded",
    whatsWrong: "Lab panel billed above the contracted tariff cap for this scheme tier.",
    whyItMatters: "Amounts above the tariff cap are typically rejected on that line item, not the whole claim.",
    whatToDo: "Split the claim line and confirm which tests fall within the covered tariff.",
    owner: "Billing",
    status: "flagged",
    stage: 2,
    items: [
      { desc: "Consultation – General", amount: 3000 },
      { desc: "Comprehensive Metabolic Panel", amount: 9800 }
    ],
    invoiceTotal: 12800,
    checklist: [
      { label: "Member eligible", value: "verified", status: "pass" },
      { label: "CMP tariff limit", value: "exceeds by 1,800", status: "fail" },
      { label: "Tariff adjustment", value: "pending split line", status: "warning" }
    ],
    createdAt: "2026-09-21T07:40:00Z"
  }
];

const STORAGE_KEY = "dmc_claims_overrides_v3";

/* ---------- Data layer ---------- */

async function loadClaims() {
  try {
    const res = await fetch("/api/claims");
    if (!res.ok) throw new Error("API not ready");
    return await res.json();
  } catch (err) {
    return structuredClone(MOCK_CLAIMS);
  }
}

function getOverrides() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveOverride(claimId, patch) {
  const overrides = getOverrides();
  overrides[claimId] = { ...(overrides[claimId] || {}), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function applyOverrides(claims) {
  const overrides = getOverrides();
  return claims.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c));
}

/* ---------- App state ---------- */

let allClaims = [];
let activeClaimId = null;
let currentWidgetClaimId = "CLM-1048";
let currentView = "dashboard";

const els = {
  stats: document.getElementById("stats"),
  tbody: document.getElementById("claims-tbody"),
  emptyState: document.getElementById("empty-state"),
  search: document.getElementById("search-input"),
  statusFilter: document.getElementById("status-filter"),
  payerFilter: document.getElementById("payer-filter"),
  overlay: document.getElementById("overlay"),
  panel: document.getElementById("detail-panel"),
  panelContent: document.getElementById("panel-content"),
  panelClose: document.getElementById("panel-close"),
  toast: document.getElementById("toast"),
  lastSync: document.getElementById("last-sync"),
  dashboardView: document.getElementById("dashboard-view"),
  widgetView: document.getElementById("widget-view"),
  btnViewDashboard: document.getElementById("btn-view-dashboard"),
  btnViewWidget: document.getElementById("btn-view-widget"),
  widgetVisitSelect: document.getElementById("widget-visit-select"),
  assuranceWidgetRoot: document.getElementById("assurance-widget-root"),
  btnCopyEmbed: document.getElementById("btn-copy-embed"),
  btnOpenStandalone: document.getElementById("btn-open-standalone"),
  btnSyncAll: document.getElementById("btn-sync-all"),
};

/* ---------- Init ---------- */

async function init() {
  const raw = await loadClaims();
  allClaims = applyOverrides(raw);

  const urlParams = new URLSearchParams(window.location.search);
  const isWidgetMode = urlParams.get("widget") === "1" || urlParams.get("embed") === "1";
  const requestedVisit = urlParams.get("visit");

  if (requestedVisit && allClaims.some((c) => c.id === requestedVisit || c.visitId.includes(requestedVisit))) {
    const found = allClaims.find((c) => c.id === requestedVisit || c.visitId.includes(requestedVisit));
    currentWidgetClaimId = found.id;
  }

  populatePayerFilter(allClaims);
  populateWidgetVisitSelect(allClaims);

  if (isWidgetMode) {
    document.body.classList.add("standalone-mode");
    switchView("widget");
  } else {
    render();
  }

  els.lastSync.innerHTML = "<i class='bx bx-check-circle'></i> Synced just now";

  // Event Listeners
  if (els.search) els.search.addEventListener("input", render);
  if (els.statusFilter) els.statusFilter.addEventListener("change", render);
  if (els.payerFilter) els.payerFilter.addEventListener("change", render);
  if (els.panelClose) els.panelClose.addEventListener("click", closePanel);
  if (els.overlay) els.overlay.addEventListener("click", closePanel);

  if (els.btnSyncAll) {
    els.btnSyncAll.addEventListener("click", triggerHmisSync);
  }

  if (els.btnViewDashboard) {
    els.btnViewDashboard.addEventListener("click", () => switchView("dashboard"));
  }
  if (els.btnViewWidget) {
    els.btnViewWidget.addEventListener("click", () => switchView("widget"));
  }

  if (els.widgetVisitSelect) {
    els.widgetVisitSelect.addEventListener("change", (e) => {
      currentWidgetClaimId = e.target.value;
      renderWidgetView();
    });
  }

  if (els.btnCopyEmbed) {
    els.btnCopyEmbed.addEventListener("click", copyEmbedCode);
  }

  if (els.btnOpenStandalone) {
    els.btnOpenStandalone.addEventListener("click", () => {
      const url = `${window.location.origin}${window.location.pathname}?widget=1&visit=${currentWidgetClaimId}`;
      window.open(url, "_blank", "width=520,height=720,menubar=no,toolbar=no");
    });
  }
}

async function triggerHmisSync() {
  if (!els.btnSyncAll) return;
  els.btnSyncAll.classList.add("syncing");
  els.btnSyncAll.disabled = true;
  els.btnSyncAll.innerHTML = "<i class='bx bx-refresh'></i> Syncing HMIS & Payers…";

  try {
    const res = await fetch("/api/sync", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      allClaims = applyOverrides(data.claims || []);
      populatePayerFilter(allClaims);
      populateWidgetVisitSelect(allClaims);
      render();
      if (currentView === "widget") renderWidgetView();
      els.lastSync.innerHTML = "<i class='bx bx-check-circle'></i> Synced just now";
      showToast(`HMIS & Payers synced: ${data.summary.total} visits pulled (${data.summary.clean} clean, ${data.summary.flagged} flagged).`);
    } else {
      throw new Error("Sync endpoint returned error");
    }
  } catch (err) {
    await new Promise((r) => setTimeout(r, 600));
    allClaims = applyOverrides(MOCK_CLAIMS);
    populatePayerFilter(allClaims);
    populateWidgetVisitSelect(allClaims);
    render();
    if (currentView === "widget") renderWidgetView();
    els.lastSync.innerHTML = "<i class='bx bx-check-circle'></i> Synced just now";
    showToast(`Pulled ${allClaims.length} visits from HMIS.`);
  } finally {
    els.btnSyncAll.classList.remove("syncing");
    els.btnSyncAll.disabled = false;
    els.btnSyncAll.innerHTML = "<i class='bx bx-refresh'></i> Sync HMIS & Payers";
  }
}

function switchView(viewName) {
  currentView = viewName;
  if (viewName === "dashboard") {
    els.dashboardView.hidden = false;
    els.widgetView.hidden = true;
    els.btnViewDashboard.classList.add("active");
    els.btnViewWidget.classList.remove("active");
    render();
  } else {
    els.dashboardView.hidden = true;
    els.widgetView.hidden = false;
    els.btnViewDashboard.classList.remove("active");
    els.btnViewWidget.classList.add("active");
    renderWidgetView();
  }
}

function populatePayerFilter(claims) {
  const payers = [...new Set(claims.map((c) => c.payer))].sort();
  payers.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    els.payerFilter.appendChild(opt);
  });
}

function populateWidgetVisitSelect(claims) {
  if (!els.widgetVisitSelect) return;
  els.widgetVisitSelect.innerHTML = claims
    .map(
      (c) => `
      <option value="${c.id}" ${c.id === currentWidgetClaimId ? "selected" : ""}>
        ${c.visitId} · ${c.patient} (${capitalize(c.status)})
      </option>
    `
    )
    .join("");
}

/* ---------- Rendering Dashboard ---------- */

function getFilteredClaims() {
  const q = els.search.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const payer = els.payerFilter.value;

  return allClaims.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (payer !== "all" && c.payer !== payer) return false;
    if (q) {
      const hay = `${c.patient} ${c.visitId} ${c.payer} ${c.rule}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function render() {
  renderStats();
  renderTable();
}

function renderStats() {
  const total = allClaims.length;
  const flagged = allClaims.filter((c) => c.status === "flagged").length;
  const resolved = allClaims.filter((c) => c.status === "resolved" || c.status === "clean").length;
  const highSeverity = allClaims.filter((c) => c.status === "flagged" && c.severity === "high").length;

  const cards = [
    { label: "Total claims tracked", value: total, accent: "", icon: "bx-receipt" },
    { label: "Flagged — needs action", value: flagged, accent: "accent-red", icon: "bx-error-alt" },
    { label: "Clean & Resolved", value: resolved, accent: "accent-green", icon: "bx-check-shield" },
    { label: "High severity, open", value: highSeverity, accent: "accent-amber", icon: "bx-alarm-exclamation" },
  ];

  els.stats.innerHTML = cards
    .map(
      (c) => `
      <div class="stat-card ${c.accent}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="value">${c.value}</div>
          <i class='bx ${c.icon}' style="font-size: 24px; opacity: 0.75;"></i>
        </div>
        <div class="label">${c.label}</div>
      </div>`
    )
    .join("");
}

function renderTable() {
  const claims = getFilteredClaims();
  els.emptyState.hidden = claims.length !== 0;

  els.tbody.innerHTML = claims
    .map(
      (c) => `
      <tr data-id="${c.id}">
        <td><strong>${c.patient}</strong></td>
        <td><code>${c.visitId}</code></td>
        <td>${c.payer}</td>
        <td>
          <span class="severity-dot ${c.severity || 'low'}"></span>${c.rule}
        </td>
        <td>${c.owner}</td>
        <td><span class="badge ${c.status}">${capitalize(c.status)}</span></td>
        <td class="chev"><i class='bx bx-chevron-right'></i></td>
      </tr>`
    )
    .join("");

  els.tbody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => openPanel(row.dataset.id));
  });
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatNumber(num) {
  return (num || 0).toLocaleString();
}

/* ---------- EMR Widget Card Component ---------- */

function generateAssuranceWidgetHtml(claim, options = { showBrand: true, showActions: true }) {
  if (!claim) return "";

  const isClean = claim.status === "resolved" || claim.status === "clean";
  const isRejected = claim.status === "rejected";
  const pillClass = isClean ? "clean" : isRejected ? "rejected" : "flagged";
  const pillText = isClean ? "CLEAN CLAIM" : isRejected ? "REJECTED" : "ACTION NEEDED";

  const billLinesHtml = (claim.items || [
    { desc: "General Consultation", amount: 3500 },
    { desc: "Diagnostic Services", amount: 12000 }
  ])
    .map(
      (item) => `
      <div class="bill-row">
        <span class="bill-desc">${item.desc}</span>
        <span class="bill-amount">${claim.currency || "RWF"} ${formatNumber(item.amount)}</span>
      </div>`
    )
    .join("");

  const checklistHtml = (claim.checklist || [])
    .map((chk) => {
      let iconHtml = "";
      if (chk.status === "pass") {
        iconHtml = `<i class='bx bxs-check-circle check-bx pass'></i>`;
      } else if (chk.status === "fail") {
        iconHtml = `<i class='bx bxs-x-circle check-bx fail'></i>`;
      } else {
        iconHtml = `<i class='bx bxs-error-circle check-bx warning'></i>`;
      }

      return `
        <div class="check-item-row">
          <div class="check-item-left">
            ${iconHtml}
            <span class="check-item-label">${chk.label}</span>
          </div>
          <span class="check-item-value ${chk.status}">${chk.value}</span>
        </div>`;
    })
    .join("");

  const currentStage = isClean ? 3 : isRejected ? 2 : 2;
  const progressPercent = ((currentStage - 1) / 4) * 100;
  const isAlert = !isClean;

  const steps = [
    { num: 1, label: "LIVE VISIT" },
    { num: 2, label: "CHECKED" },
    { num: 3, label: "CLEAN" },
    { num: 4, label: "SENT" },
    { num: 5, label: "SETTLED" },
  ];

  const stepperNodesHtml = steps
    .map((step) => {
      let nodeClass = "";
      if (step.num < currentStage) {
        nodeClass = "completed";
      } else if (step.num === currentStage) {
        nodeClass = isAlert ? "alert" : "active";
      }
      return `<div class="stepper-node ${nodeClass}"></div>`;
    })
    .join("");

  const stepperLabelsHtml = steps
    .map((step) => {
      let labelClass = "";
      if (step.num < currentStage) {
        labelClass = "completed";
      } else if (step.num === currentStage) {
        labelClass = isAlert ? "alert" : "active";
      }
      return `<div class="stepper-label ${labelClass}">${step.label}</div>`;
    })
    .join("");

  return `
    <div class="dmc-assurance-card" id="widget-card-${claim.id}">
      ${
        options.showBrand
          ? `
        <div class="widget-brand-badge">
          <img src="dmc-logo.png" alt="DMC Hospital">
          <span>DMC Claims Assurance &middot; EMR Widget</span>
        </div>`
          : ""
      }

      <div class="widget-header-row">
        <div class="widget-title-area">
          <h2 class="widget-visit-title">${claim.visitId} &middot; ${claim.patient.toUpperCase()}</h2>
          <p class="widget-visit-scheme">${claim.scheme || "Outpatient · General Scheme"}</p>
        </div>
        <div class="widget-status-pill ${pillClass}">
          ${pillText}
        </div>
      </div>

      <hr class="widget-dashed-line">

      <div class="bill-items-list">
        ${billLinesHtml}
      </div>

      <hr class="widget-dashed-line">

      <div class="invoice-draft-row">
        <span>Invoice draft</span>
        <span>${claim.currency || "RWF"} ${formatNumber(claim.invoiceTotal)}</span>
      </div>

      <hr class="widget-solid-line">

      <div class="assurance-checklist">
        ${checklistHtml}
      </div>

      <hr class="widget-solid-line">

      <div class="widget-stepper">
        <div class="stepper-track-wrap">
          <div class="stepper-bg-bar"></div>
          <div class="stepper-progress-bar" style="width: calc(${progressPercent}% - 6px); ${isAlert ? "background: var(--red);" : ""}"></div>
          ${stepperNodesHtml}
        </div>
        <div class="stepper-labels">
          ${stepperLabelsHtml}
        </div>
      </div>

      ${
        options.showActions && !isClean && !isRejected
          ? `
        <div class="widget-action-footer">
          <button class="btn-widget-action resolve" onclick="window.resolveFromWidget('${claim.id}')">
            <i class='bx bx-check-double'></i>
            Fix & Clean Claim
          </button>
          <button class="btn-widget-action details" onclick="window.openDetailFromWidget('${claim.id}')">
            Audit Details <i class='bx bx-right-arrow-alt'></i>
          </button>
        </div>`
          : ""
      }
    </div>
  `;
}

function renderWidgetView() {
  const claim = allClaims.find((c) => c.id === currentWidgetClaimId) || allClaims[0];
  if (!claim) return;
  els.assuranceWidgetRoot.innerHTML = generateAssuranceWidgetHtml(claim, { showBrand: true, showActions: true });
}

window.resolveFromWidget = function (claimId) {
  const claim = allClaims.find((c) => c.id === claimId);
  if (!claim) return;

  const updatedChecklist = (claim.checklist || []).map((item) => {
    if (item.status === "fail" || item.status === "warning") {
      return { ...item, value: "verified & cleared", status: "pass" };
    }
    return item;
  });

  const patch = {
    status: "clean",
    stage: 3,
    checklist: updatedChecklist,
    resolvedAt: new Date().toISOString()
  };

  saveOverride(claimId, patch);
  allClaims = allClaims.map((c) => (c.id === claimId ? { ...c, ...patch } : c));

  populateWidgetVisitSelect(allClaims);
  render();
  renderWidgetView();
  showToast(`${claim.visitId} verified clean.`);
};

window.openDetailFromWidget = function (claimId) {
  openPanel(claimId);
};

function copyEmbedCode() {
  const iframeCode = `<iframe src="${window.location.origin}${window.location.pathname}?widget=1&visit=${currentWidgetClaimId}" width="480" height="660" frameborder="0" style="border-radius:18px; box-shadow:0 8px 30px rgba(0,0,0,0.08);"></iframe>`;
  navigator.clipboard.writeText(iframeCode).then(() => {
    showToast("Embed code copied to clipboard!");
  }).catch(() => {
    showToast("Clipboard copy failed. Try Standalone view.");
  });
}

/* ---------- Detail panel ---------- */

function openPanel(claimId) {
  activeClaimId = claimId;
  const c = allClaims.find((x) => x.id === claimId);
  if (!c) return;

  const isOpen = c.status === "flagged";

  els.panelContent.innerHTML = `
    <!-- Top Embedded Assurance Widget in detail panel -->
    <div style="margin-bottom: 22px;">
      ${generateAssuranceWidgetHtml(c, { showBrand: false, showActions: false })}
    </div>

    <div class="panel-tag">
      <span class="severity-dot ${c.severity || 'low'}"></span>${capitalize(c.severity || 'normal')} severity &middot; ${c.rule}
    </div>
    <h2>${c.patient}</h2>
    <p class="sub">${c.visitId} &middot; ${c.payer}</p>

    <div class="panel-block">
      <h4>What's wrong</h4>
      <p>${c.whatsWrong}</p>
    </div>
    <div class="panel-block">
      <h4>Why it matters</h4>
      <p>${c.whyItMatters}</p>
    </div>
    <div class="panel-block">
      <h4>What to do</h4>
      <p>${c.whatToDo}</p>
    </div>
    <div class="panel-block">
      <h4>Owner</h4>
      <span class="owner-chip">${c.owner}</span>
    </div>

    ${
      isOpen
        ? `
      <div class="panel-actions">
        <button class="btn btn-done" id="btn-done"><i class='bx bx-check'></i> Mark Done</button>
        <button class="btn btn-reject" id="btn-reject"><i class='bx bx-x'></i> Reject</button>
      </div>
      <div class="reject-box" id="reject-box">
        <textarea id="reject-reason" placeholder="Reason for rejecting this flag…"></textarea>
        <button class="btn confirm" id="btn-confirm-reject"><i class='bx bx-check'></i> Confirm rejection</button>
      </div>`
        : `
      <div class="resolution-note">
        ${
          c.status === "resolved" || c.status === "clean"
            ? `Marked clean ${formatDate(c.resolvedAt)}.`
            : `Rejected ${formatDate(c.resolvedAt)} — ${c.rejectionReason || "no reason logged."}`
        }
      </div>`
    }
  `;

  if (isOpen) {
    document.getElementById("btn-done").addEventListener("click", () => resolveClaim(claimId, "resolved"));
    document.getElementById("btn-reject").addEventListener("click", () => {
      document.getElementById("reject-box").classList.add("open");
    });
    document.getElementById("btn-confirm-reject").addEventListener("click", () => {
      const reason = document.getElementById("reject-reason").value.trim();
      if (!reason) {
        document.getElementById("reject-reason").focus();
        return;
      }
      resolveClaim(claimId, "rejected", reason);
    });
  }

  els.overlay.classList.add("open");
  els.panel.classList.add("open");
}

function closePanel() {
  els.overlay.classList.remove("open");
  els.panel.classList.remove("open");
  activeClaimId = null;
}

function resolveClaim(claimId, status, rejectionReason) {
  const now = new Date().toISOString();
  const claim = allClaims.find((c) => c.id === claimId);

  const updatedChecklist = (claim.checklist || []).map((item) => {
    if (status === "resolved" && (item.status === "fail" || item.status === "warning")) {
      return { ...item, value: "verified & cleared", status: "pass" };
    }
    return item;
  });

  const patch = {
    status,
    stage: status === "resolved" ? 3 : 2,
    checklist: updatedChecklist,
    resolvedAt: now
  };
  if (rejectionReason) patch.rejectionReason = rejectionReason;

  saveOverride(claimId, patch);
  allClaims = allClaims.map((c) => (c.id === claimId ? { ...c, ...patch } : c));

  populateWidgetVisitSelect(allClaims);
  render();
  if (currentView === "widget") renderWidgetView();
  closePanel();
  showToast(status === "resolved" ? "Claim marked clean." : "Claim rejected — reason logged.");
}

/* ---------- Utilities ---------- */

function formatDate(iso) {
  if (!iso) return "just now";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

let toastTimer;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}

init();
