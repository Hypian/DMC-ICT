/**
 * ClaimsSyncService
 * Orchestrates pulling from all registered HMIS systems,
 * running the Pre-Bill Assurance Rules Engine, and maintaining the active claims cache.
 */

const FhirHmisAdapter = require("../integrations/hmis/FhirHmisAdapter");
const RestHmisAdapter = require("../integrations/hmis/RestHmisAdapter");
const ClaimsRulesEngine = require("../engine/ClaimsRulesEngine");
const config = require("../../config/integrations.json");

class ClaimsSyncService {
  constructor() {
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
    this.claimsCache = auditedClaims;
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
    return this.claimsCache;
  }

  /**
   * Finds a specific claim by ID or visit ID
   */
  async getClaimById(id) {
    const claims = await this.getClaims();
    return claims.find((c) => c.id === id || c.visitId.includes(id));
  }

  /**
   * Resolves a claim issue
   */
  async resolveClaim(id, status = "clean", reason = "") {
    const claim = await this.getClaimById(id);
    if (!claim) return null;

    claim.status = status;
    claim.stage = status === "clean" ? 3 : 2;
    claim.resolvedAt = new Date().toISOString();
    if (reason) claim.rejectionReason = reason;

    if (status === "clean") {
      claim.checklist = claim.checklist.map((item) => {
        if (item.status === "fail" || item.status === "warning") {
          return { ...item, value: "verified & cleared", status: "pass" };
        }
        return item;
      });
      claim.severity = "low";
      claim.rule = "Pre-bill audit complete (resolved)";
    }

    return claim;
  }
}

module.exports = new ClaimsSyncService();
