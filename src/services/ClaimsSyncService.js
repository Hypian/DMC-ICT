/**
 * ClaimsSyncService
 * Orchestrates pulling from all registered HMIS systems,
 * running the Pre-Bill Assurance Rules Engine, and maintaining the service-owned claims cache.
 */

const FhirHmisAdapter = require("../integrations/hmis/FhirHmisAdapter");
const RestHmisAdapter = require("../integrations/hmis/RestHmisAdapter");
const ClaimsRulesEngine = require("../engine/ClaimsRulesEngine");
const ClaimsDataService = require("./ClaimsDataService");
const config = require("../../config/integrations.json");

class ClaimsSyncService {
  constructor() {
    this.dataService = new ClaimsDataService(config.database || {});
    this.fhirAdapter = new FhirHmisAdapter(config.hmis.fhir);
    this.restAdapter = new RestHmisAdapter(config.hmis.rest);
    this.rulesEngine = new ClaimsRulesEngine(config.rules);
    this.claimsCache = [];
    this.lastSync = null;
  }

  /**
   * Pulls visits from all HMIS adapters and evaluates them through the rules engine
   */
  async syncAll() {
    const fhirVisits = await this.fhirAdapter.fetchVisits();
    const restVisits = await this.restAdapter.fetchVisits();
    const allVisits = [...fhirVisits, ...restVisits];

    const auditedClaims = await this.rulesEngine.evaluateBatch(allVisits);
    const savedClaims = [];

    for (const claim of auditedClaims) {
      const storedClaim = await this.dataService.upsertClaim(claim);
      storedClaim.auditLog = await this.dataService.getAuditLog(claim.id);
      savedClaims.push(storedClaim);
    }

    this.claimsCache = savedClaims;
    this.lastSync = new Date().toISOString();

    return {
      syncedAt: this.lastSync,
      totalVisitsPulled: allVisits.length,
      claims: this.claimsCache,
      summary: {
        total: this.claimsCache.length,
        clean: this.claimsCache.filter((c) => c.status === "clean").length,
        flagged: this.claimsCache.filter((c) => c.status === "flagged").length,
        rejected: this.claimsCache.filter((c) => c.status === "rejected").length,
      },
    };
  }

  /**
   * Gets all claims from cache (or runs initial sync if empty)
   */
  async getClaims() {
    if (this.claimsCache.length === 0) {
      await this.syncAll();
    }
    return this.dataService.getClaims();
  }

  /**
   * Finds a specific claim by ID or visit ID
   */
  async getClaimById(id) {
    const claims = await this.getClaims();
    return claims.find((c) => c.id === id || c.visitId.includes(id));
  }

  async getAuditLog(claimId) {
    return this.dataService.getAuditLog(claimId);
  }

  /**
   * Resolves a claim issue and writes the staff override to the audit log.
   */
  async resolveClaim(id, status = "clean", reason = "", staffId = "unknown") {
    const claim = await this.getClaimById(id);
    if (!claim) return null;

    const resolvedClaim = { ...claim, status, stage: status === "clean" ? 3 : 2, resolvedAt: new Date().toISOString() };

    if (reason) {
      resolvedClaim.rejectionReason = reason;
    }

    if (status === "clean") {
      resolvedClaim.checklist = (claim.checklist || []).map((item) => {
        if (item.status === "fail" || item.status === "warning") {
          return { ...item, value: "verified & cleared", status: "pass" };
        }
        return item;
      });
      resolvedClaim.severity = "low";
      resolvedClaim.rule = "Pre-bill audit complete (resolved)";
    }

    const storedClaim = await this.dataService.upsertClaim(resolvedClaim);
    const auditEntry = await this.dataService.appendAuditLog({
      claimId: storedClaim.id,
      action: "claim_resolved",
      status,
      reason,
      staffId,
      createdAt: new Date().toISOString(),
      details: "Claim reviewed and resolved by staff override.",
    });

    storedClaim.auditLog = await this.dataService.getAuditLog(storedClaim.id);
    if (!storedClaim.auditLog.some((entry) => entry.id === auditEntry.id)) {
      storedClaim.auditLog.unshift(auditEntry);
    }

    const index = this.claimsCache.findIndex((c) => c.id === storedClaim.id);
    if (index >= 0) {
      this.claimsCache[index] = storedClaim;
    }

    return storedClaim;
  }
}

module.exports = new ClaimsSyncService();
