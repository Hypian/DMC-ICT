/**
 * GenericPayerAdapter
 * Coordinator that routes insurance inquiries to the appropriate payer gateway
 * (SHA/NHIF, Smart EDI, or internal contract tariffs).
 */

const ShaPayerAdapter = require("./ShaPayerAdapter");
const SmartEdiPayerAdapter = require("./SmartEdiPayerAdapter");

class GenericPayerAdapter {
  constructor(config = {}) {
    this.shaAdapter = new ShaPayerAdapter(config.sha);
    this.smartEdiAdapter = new SmartEdiPayerAdapter(config.smartEdi);
    this.tariffs = config.tariffs || {
      "Consultation - General": 3000,
      "Consultation - Specialist": 4000,
      "CT scan – abdomen": 12800,
      "MRI – Lumbar Spine": 28000,
      "Comprehensive Metabolic Panel": 8000,
      "Full Hemogram & ESR": 3200,
    };
  }

  /**
   * Verifies member and scheme details
   */
  async verifyMember(payer, memberId, patientName = "") {
    if (payer.toUpperCase().includes("SHA") || payer.toUpperCase().includes("NHIF")) {
      return this.shaAdapter.verifyEligibility(memberId, patientName);
    }
    return this.smartEdiAdapter.verifyMember(payer, memberId);
  }

  /**
   * Checks pre-authorization status for an item
   */
  async checkPreAuthorization(payer, memberId, item) {
    const code = `${item.code || ""} ${item.desc || ""}`;
    return this.smartEdiAdapter.checkPreAuthorization(payer, memberId, code, item.preAuthId);
  }

  /**
   * Checks if an item price complies with the tariff cap
   */
  checkTariff(serviceDesc, billedAmount) {
    const matchKey = Object.keys(this.tariffs).find((k) =>
      serviceDesc.toLowerCase().includes(k.toLowerCase())
    );

    if (matchKey) {
      const cap = this.tariffs[matchKey];
      if (billedAmount > cap) {
        return {
          compliant: false,
          cap,
          excess: billedAmount - cap,
          reason: `Billed ${billedAmount} exceeds contracted tariff cap of ${cap}.`,
        };
      }
    }

    return { compliant: true };
  }
}

module.exports = GenericPayerAdapter;
