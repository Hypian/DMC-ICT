/**
 * RestHmisAdapter
 * Integrates with REST-based HMIS and Hospital EMR systems (e.g. OpenMRS REST API, ClinicMaster, Bahmni).
 */

class RestHmisAdapter {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || "https://emr.dmc-hospital.org/api/v1";
    this.timeoutMs = config.timeoutMs || 5000;
  }

  /**
   * Normalizes a REST JSON payload from hospital EMR into standardized ClinicalVisit objects
   * @param {Array<Object>} rawVisits
   * @returns {Array<Object>}
   */
  normalizeVisits(rawVisits = []) {
    if (!Array.isArray(rawVisits)) return [];

    return rawVisits.map((v) => {
      const items = (v.billItems || v.orders || []).map((item) => ({
        desc: item.description || item.name || "Clinical Service",
        code: item.code || "SRV-GEN",
        category: item.category || "general",
        amount: Number(item.amount || item.unitPrice || 0),
        preAuthId: item.preAuthNumber || item.preAuthId || null,
      }));

      const invoiceTotal = items.reduce((sum, it) => sum + it.amount, 0);

      return {
        source: "REST_HMIS",
        visitId: v.visitNumber ? `VISIT #${v.visitNumber}` : v.visitId || `VISIT #${v.id}`,
        encounterId: String(v.id || v.visitNumber),
        patient: v.patientName || `${v.patientFirstName || ""} ${v.patientLastName || ""}`.trim() || "Patient",
        payer: v.insuranceProvider || v.payer || "Direct Pay",
        scheme: v.schemeName || `${v.visitType || "Outpatient"} · ${v.insuranceProvider || "Direct"}`,
        memberId: v.memberNumber || v.policyNumber || "",
        diagnoses: (v.diagnoses || []).map((d) => (typeof d === "string" ? { code: "ICD-10", display: d } : d)),
        items,
        invoiceTotal: v.totalBill ? Number(v.totalBill) : invoiceTotal,
        currency: v.currency || "RWF",
        attendingDoctor: v.doctorName || "Attending Physician",
        date: v.admissionDate || v.visitDate || new Date().toISOString(),
      };
    });
  }

  /**
   * Pulls visits from hospital REST API or simulation
   */
  async fetchVisits() {
    return this.normalizeVisits(this.getMockRestVisits());
  }

  getMockRestVisits() {
    return [
      {
        id: "10492",
        visitNumber: "10492",
        patientName: "A. Uwase",
        insuranceProvider: "Jubilee",
        schemeName: "Outpatient · Jubilee Premier",
        memberNumber: "JUB-90412",
        visitType: "Outpatient",
        doctorName: "Dr. Njeri · N04",
        diagnoses: [{ code: "M54.5", display: "Low back pain with radiculopathy" }],
        billItems: [
          { name: "Consultation – Dr. Njeri · N04", amount: 3500, category: "consultation" },
          { name: "MRI – Lumbar Spine with contrast", amount: 28000, category: "radiology", preAuthNumber: null },
          { name: "Rx – Celecoxib 200mg", amount: 1850, category: "pharmacy" },
        ],
      },
      {
        id: "10501",
        visitNumber: "10501",
        patientName: "E. Mugisha",
        insuranceProvider: "SHA",
        schemeName: "Outpatient · SHA Scheme Standard",
        memberNumber: "INVALID-SHA-99", // Intentional format mismatch for rule engine test
        visitType: "Outpatient",
        doctorName: "Dr. Kamanzi · K02",
        diagnoses: [{ code: "A09", display: "Infectious gastroenteritis" }],
        billItems: [
          { name: "Specialist Consult – Internal Med", amount: 4000, category: "consultation" },
          { name: "Full Hemogram & ESR", amount: 3200, category: "lab" },
          { name: "Rx – Azithromycin 500mg", amount: 1950, category: "pharmacy" },
        ],
      },
    ];
  }
}

module.exports = RestHmisAdapter;
