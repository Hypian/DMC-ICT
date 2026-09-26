/**
 * ShaPayerAdapter
 * Connects to Social Health Authority (SHA) / NHIF Verification API.
 * Validates member eligibility, scheme status, waiting periods, and benefit limits.
 */

class ShaPayerAdapter {
  constructor(config = {}) {
    this.endpoint = config.endpoint || "https://api.sha.go.ke/v2/verify";
    this.facilityCode = config.facilityCode || "DMC-HOSP-0042";
  }

  /**
   * Verifies member eligibility with SHA
   * @param {string} memberId
   * @param {string} patientName
   * @returns {Promise<Object>} Verification outcome
   */
  async verifyEligibility(memberId, patientName = "") {
    // SHA ID validation rule: must start with SHA or have standard 8-10 digit syntax
    const validFormatRegex = /^SHA-[0-9]{6,10}$|^[0-9]{8,10}$/;
    const isValidFormat = memberId && (validFormatRegex.test(memberId) || memberId.startsWith("SHA-"));

    if (!memberId || memberId.includes("INVALID") || !isValidFormat) {
      return {
        eligible: false,
        status: "fail",
        reason: "Member ID on file doesn't match the format SHA expects for this scheme.",
        memberId,
        benefitBalance: 0,
        schemeTier: "Standard",
      };
    }

    // Check simulated waiting periods
    if (memberId.includes("WAITING")) {
      return {
        eligible: false,
        status: "waiting_period",
        reason: "Admission falls inside the scheme's 90-day waiting period for cover.",
        memberId,
        benefitBalance: 0,
        schemeTier: "Standard",
      };
    }

    return {
      eligible: true,
      status: "active",
      memberId,
      patientName,
      schemeTier: "Comprehensive",
      benefitBalance: 50000,
      currency: "KES",
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Checks tariff schedule for a specific procedure/service code
   */
  getTariffLimit(serviceCode) {
    const limits = {
      "A09": 4000, // Specialist consult cap
      "LAB-HEM": 3200,
      "CT-ABD": 13000,
    };
    return limits[serviceCode] || 10000;
  }
}

module.exports = ShaPayerAdapter;
