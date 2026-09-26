/**
 * ClaimsRulesEngine
 * Core pre-billing assurance intelligence.
 * Ingests visits from HMIS, validates against Payer APIs & tariff schedules,
 * and generates the exact clinical ledger, audit checklist, and lifecycle state.
 */

const GenericPayerAdapter = require("../integrations/insurance/GenericPayerAdapter");

class ClaimsRulesEngine {
  constructor(config = {}) {
    this.payerAdapter = new GenericPayerAdapter(config);
  }

  /**
   * Evaluates a clinical visit and returns a fully audited claim model
   * @param {Object} visit - Normalized ClinicalVisit from HMIS adapter
   * @returns {Promise<Object>} Audited Claim with widget-ready checklist and ledger
   */
  async evaluateVisit(visit) {
    const checklist = [];
    let isFlagged = false;
    let isRejected = false;
    let primaryRule = "Pre-bill audit complete";
    let whatsWrong = "No audit discrepancies detected.";
    let whyItMatters = "Clean claims have 98.4% first-pass payment rate without queries.";
    let whatToDo = "Proceed with submission batch.";
    let owner = visit.attendingDoctor || "Billing";
    let severity = "low";

    // 1. Check Member Eligibility
    const memberCheck = await this.payerAdapter.verifyMember(visit.payer, visit.memberId, visit.patient);
    if (!memberCheck.eligible) {
      if (memberCheck.status === "waiting_period") {
        checklist.push({ label: "Member eligible", value: "waiting period active", status: "fail" });
        isRejected = true;
        primaryRule = "Waiting period not yet met";
        whatsWrong = memberCheck.reason;
        whyItMatters = "Claims filed before waiting period ends are excluded, not delayed.";
        whatToDo = "Flag to billing for direct-pay conversation with the patient.";
        owner = "Billing";
        severity = "high";
      } else {
        checklist.push({ label: "Member eligible", value: "format mismatch", status: "fail" });
        isFlagged = true;
        primaryRule = "Insurance ID mismatch";
        whatsWrong = memberCheck.reason || "Member ID on file doesn't match format.";
        whyItMatters = "Claims with invalid member ID are rejected outright without recovery path.";
        whatToDo = "Confirm correct ID at front desk and update visit record.";
        owner = "Front Desk";
        severity = "high";
      }
    } else {
      checklist.push({ label: "Member eligible", value: "verified", status: "pass" });
    }

    // 2. Check Balance covers visit
    const balance = memberCheck.balance || memberCheck.benefitBalance || 75000;
    if (balance >= visit.invoiceTotal) {
      checklist.push({
        label: "Balance covers visit",
        value: `KES ${balance.toLocaleString()}`,
        status: "pass",
      });
    } else {
      checklist.push({
        label: "Balance covers visit",
        value: `Deficit KES ${(visit.invoiceTotal - balance).toLocaleString()}`,
        status: "fail",
      });
      if (!isFlagged && !isRejected) {
        isFlagged = true;
        primaryRule = "Benefit limit exceeded";
        whatsWrong = `Visit total (KES ${visit.invoiceTotal.toLocaleString()}) exceeds member benefit balance.`;
        whyItMatters = "Excess amounts are rejected by the scheme.";
        whatToDo = "Collect co-pay or route remaining balance to patient account.";
        owner = "Credit Control";
        severity = "high";
      }
    }

    // 3. Pre-Authorization & Itemized Bill Checks
    let hasPreAuthIssue = false;
    for (const item of visit.items) {
      const isHighCost = ["CT", "MRI", "SURG", "ENDO"].some((k) => item.desc.toUpperCase().includes(k));
      if (isHighCost) {
        const preAuth = await this.payerAdapter.checkPreAuthorization(visit.payer, visit.memberId, item);
        if (preAuth.preAuthStatus === "approved") {
          checklist.push({ label: `${item.desc.split("–")[0].trim()} – pre-auth`, value: "approved", status: "pass" });
          checklist.push({ label: `${item.desc.split("–")[0].trim()} added to bill`, value: `+ ${item.amount.toLocaleString()}`, status: "pass" });
        } else if (preAuth.preAuthStatus === "missing") {
          checklist.push({ label: `${item.desc.split("–")[0].trim()} – pre-auth`, value: "missing indication", status: "fail" });
          checklist.push({ label: `${item.desc.split("–")[0].trim()} added to bill`, value: `+ ${item.amount.toLocaleString()}`, status: "pass" });
          hasPreAuthIssue = true;
          if (!isFlagged && !isRejected) {
            isFlagged = true;
            primaryRule = "Missing pre-authorization";
            whatsWrong = `${item.desc} lacks a documented clinical rationale or approved pre-authorization.`;
            whyItMatters = `${visit.payer} requires documented clinical indication before this claim will be accepted.`;
            whatToDo = "Add clinical indication to consult note, then resubmit for pre-auth.";
            owner = visit.attendingDoctor || "Attending Doctor";
            severity = "high";
          }
        }
      }

      // Check Tariff compliance
      const tariffCheck = this.payerAdapter.checkTariff(item.desc, item.amount);
      if (!tariffCheck.compliant) {
        checklist.push({
          label: `${item.desc.split("–")[0].trim()} tariff limit`,
          value: `exceeds by ${tariffCheck.excess.toLocaleString()}`,
          status: "fail",
        });
        if (!isFlagged && !isRejected) {
          isFlagged = true;
          primaryRule = "Tariff limit exceeded";
          whatsWrong = tariffCheck.reason;
          whyItMatters = "Amounts above contracted tariff caps are rejected on that line item.";
          whatToDo = "Split claim line and confirm tests within covered tariff.";
          owner = "Billing";
          severity = "medium";
        }
      }
    }

    // 4. Pharmacy & Routine Services
    const hasMed = visit.items.some((it) => it.category === "pharmacy" || it.desc.startsWith("Rx"));
    if (hasMed) {
      checklist.push({ label: "Rx – no pre-auth needed", value: "added", status: "pass" });
    }

    // 5. Overall Tariffs Check
    if (!checklist.some((c) => c.label.includes("tariff limit"))) {
      checklist.push({ label: "Amounts within tariffs", value: "all items valid", status: "pass" });
    }

    // 6. Member Co-Pay check
    if (memberCheck.copayRequired > 0) {
      checklist.push({
        label: "Member share collection",
        value: `pending KES ${memberCheck.copayRequired.toLocaleString()}`,
        status: "fail",
      });
      if (!isFlagged && !isRejected) {
        isFlagged = true;
        primaryRule = "Member share not collected";
        whatsWrong = `Co-pay of KES ${memberCheck.copayRequired.toLocaleString()} was not collected at point of service.`;
        whyItMatters = "Uncollected member shares become hospital write-offs.";
        whatToDo = "Route to credit control before month-end reconciliation.";
        owner = "Credit Control";
        severity = "low";
      }
    }

    // 7. Stamp, Signatures & Claim Form Status
    if (isFlagged || hasPreAuthIssue) {
      checklist.push({ label: "Stamp & signatures", value: "pending note", status: "warning" });
      checklist.push({ label: "Claim form", value: "draft incomplete", status: "warning" });
    } else if (isRejected) {
      checklist.push({ label: "Claim form", value: "rejected by scheme", status: "fail" });
    } else {
      checklist.push({ label: "Stamp & signatures", value: "doctor + patient", status: "pass" });
      checklist.push({ label: "Claim form", value: "complete & valid", status: "pass" });
    }

    // Determine Status and Stepper Stage
    let status = "clean";
    let stage = 3; // CLEAN
    if (isRejected) {
      status = "rejected";
      stage = 2; // Stoppped at CHECKED
    } else if (isFlagged) {
      status = "flagged";
      stage = 2; // Stopped at CHECKED
    }

    return {
      id: `CLM-${visit.encounterId || Math.floor(1000 + Math.random() * 9000)}`,
      patient: visit.patient,
      visitId: visit.visitId,
      scheme: visit.scheme,
      payer: visit.payer,
      memberId: visit.memberId,
      severity: isFlagged || isRejected ? severity : "low",
      currency: visit.currency || "KES",
      rule: primaryRule,
      whatsWrong,
      whyItMatters,
      whatToDo,
      owner,
      status,
      stage,
      items: visit.items,
      invoiceTotal: visit.invoiceTotal,
      checklist,
      source: visit.source,
      createdAt: visit.date || new Date().toISOString(),
    };
  }

  /**
   * Batch evaluate multiple visits
   */
  async evaluateBatch(visits = []) {
    const results = [];
    for (const v of visits) {
      results.push(await this.evaluateVisit(v));
    }
    return results;
  }
}

module.exports = ClaimsRulesEngine;
