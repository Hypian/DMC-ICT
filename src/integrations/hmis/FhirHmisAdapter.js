/**
 * FhirHmisAdapter
 * Integrates with HL7 FHIR R4 compliant EMRs (OpenMRS FHIR, Bahmni, KenyaEMR).
 * Extracts Encounter, Patient, Condition, ServiceRequest, and MedicationRequest resources.
 */

class FhirHmisAdapter {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || "https://emr.dmc-hospital.org/fhir/R4";
    this.timeoutMs = config.timeoutMs || 5000;
  }

  /**
   * Transforms a FHIR R4 Bundle into standardized ClinicalVisit objects
   * @param {Object} bundle - FHIR R4 Bundle of Encounters, Patients, etc.
   * @returns {Array<Object>} Normalized visits
   */
  normalizeBundle(bundle) {
    if (!bundle || !bundle.entry || !Array.isArray(bundle.entry)) {
      return [];
    }

    const encounters = [];
    const resourceMap = new Map();

    // Index resources by reference ID (e.g. 'Patient/123')
    for (const entry of bundle.entry) {
      const res = entry.resource;
      if (!res) continue;
      const ref = `${res.resourceType}/${res.id}`;
      resourceMap.set(ref, res);
      if (res.resourceType === "Encounter") {
        encounters.push(res);
      }
    }

    return encounters.map((enc) => this.normalizeEncounter(enc, resourceMap));
  }

  /**
   * Normalizes a single FHIR Encounter into our ClinicalVisit format
   */
  normalizeEncounter(encounter, resourceMap = new Map()) {
    const visitId = encounter.identifier?.[0]?.value || `VISIT #${encounter.id}`;
    
    // Resolve patient
    let patientName = "Unknown Patient";
    const patientRef = encounter.subject?.reference;
    if (patientRef && resourceMap.has(patientRef)) {
      const pat = resourceMap.get(patientRef);
      const nameObj = pat.name?.[0];
      if (nameObj) {
        const given = nameObj.given ? nameObj.given.join(" ") : "";
        const family = nameObj.family || "";
        patientName = `${given ? given.charAt(0) + ". " : ""}${family}`.trim();
      }
    } else if (encounter.subject?.display) {
      patientName = encounter.subject.display;
    }

    // Resolve coverage / insurance scheme
    let payer = "Direct Pay";
    let scheme = "Self Pay / Cash";
    let memberId = "";
    if (encounter.serviceProvider?.display) {
      payer = encounter.serviceProvider.display;
    }
    const coverageRef = encounter.extension?.find((e) => e.url?.includes("coverage"))?.valueReference?.reference;
    if (coverageRef && resourceMap.has(coverageRef)) {
      const cov = resourceMap.get(coverageRef);
      payer = cov.payor?.[0]?.display || payer;
      scheme = cov.type?.text || `${encounter.class?.display || "Outpatient"} · ${payer} Corporate`;
      memberId = cov.subscriberId || "";
    }

    // Diagnoses (ICD-10)
    const diagnoses = (encounter.diagnosis || []).map((d) => {
      const conditionRef = d.condition?.reference;
      const cond = conditionRef ? resourceMap.get(conditionRef) : null;
      return {
        code: cond?.code?.coding?.[0]?.code || "R69",
        display: cond?.code?.coding?.[0]?.display || cond?.code?.text || "General Condition",
      };
    });

    // Clinical items (consultations, lab, radiology, rx)
    const items = [];
    
    // Add encounter class consultation
    const doctorDisplay = encounter.participant?.[0]?.individual?.display || "Attending Physician";
    items.push({
      desc: `Consultation – ${doctorDisplay}`,
      code: "A09",
      category: "consultation",
      amount: 3500,
    });

    // Extract procedures/orders linked to this encounter
    for (const [ref, res] of resourceMap.entries()) {
      if (res.resourceType === "ServiceRequest" && res.encounter?.reference?.includes(encounter.id)) {
        items.push({
          desc: res.code?.coding?.[0]?.display || res.code?.text || "Diagnostic Service",
          code: res.code?.coding?.[0]?.code || "SRV-01",
          category: "radiology-lab",
          amount: res.extension?.find((e) => e.url?.includes("amount"))?.valueMoney?.value || 12800,
          preAuthId: res.extension?.find((e) => e.url?.includes("preAuth"))?.valueString || null,
        });
      }
      if (res.resourceType === "MedicationRequest" && res.encounter?.reference?.includes(encounter.id)) {
        items.push({
          desc: `Rx – ${res.medicationCodeableConcept?.text || "Prescription Item"}`,
          code: "MED-01",
          category: "pharmacy",
          amount: res.extension?.find((e) => e.url?.includes("amount"))?.valueMoney?.value || 2150,
        });
      }
    }

    const invoiceTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);

    return {
      source: "FHIR_R4",
      visitId,
      encounterId: encounter.id,
      patient: patientName,
      payer,
      scheme: scheme || "Outpatient · General Scheme",
      memberId,
      diagnoses,
      items,
      invoiceTotal,
      currency: "KES",
      attendingDoctor: doctorDisplay,
      date: encounter.period?.start || new Date().toISOString(),
    };
  }

  /**
   * Pulls visits from FHIR server or simulation
   */
  async fetchVisits() {
    // In production: fetch(`${this.baseUrl}/Encounter?_include=Encounter:subject&_include=Encounter:diagnosis`)
    // Simulated realistic FHIR R4 Bundle:
    return this.normalizeBundle(this.getMockFhirBundle());
  }

  getMockFhirBundle() {
    return {
      resourceType: "Bundle",
      type: "searchset",
      entry: [
        {
          resource: {
            resourceType: "Patient",
            id: "pat-48211",
            name: [{ given: ["Alice"], family: "Wanjiru" }],
          },
        },
        {
          resource: {
            resourceType: "Coverage",
            id: "cov-48211",
            subscriberId: "JUB-882910-B",
            type: { text: "Outpatient · Corporate scheme B" },
            payor: [{ display: "Jubilee" }],
          },
        },
        {
          resource: {
            resourceType: "Encounter",
            id: "48211",
            identifier: [{ value: "VISIT #48211" }],
            status: "finished",
            class: { display: "Outpatient" },
            subject: { reference: "Patient/pat-48211", display: "A. Wanjiru" },
            participant: [{ individual: { display: "Dr. Achieng · A09" } }],
            extension: [{ url: "http://dmc.org/fhir/ext/coverage", valueReference: { reference: "Coverage/cov-48211" } }],
          },
        },
        {
          resource: {
            resourceType: "ServiceRequest",
            id: "sr-48211",
            encounter: { reference: "Encounter/48211" },
            code: { coding: [{ code: "CT-ABD", display: "CT scan – abdomen" }] },
            extension: [
              { url: "http://dmc.org/fhir/ext/amount", valueMoney: { value: 12800 } },
              { url: "http://dmc.org/fhir/ext/preAuth", valueString: "PA-JUB-9942" },
            ],
          },
        },
        {
          resource: {
            resourceType: "MedicationRequest",
            id: "mr-48211",
            encounter: { reference: "Encounter/48211" },
            medicationCodeableConcept: { text: "Amoxicillin 500mg" },
            extension: [{ url: "http://dmc.org/fhir/ext/amount", valueMoney: { value: 2150 } }],
          },
        },
      ],
    };
  }
}

module.exports = FhirHmisAdapter;
