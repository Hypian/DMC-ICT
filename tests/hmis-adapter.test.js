const test = require("node:test");
const assert = require("node:assert/strict");
const FhirHmisAdapter = require("../src/integrations/hmis/FhirHmisAdapter");
const RestHmisAdapter = require("../src/integrations/hmis/RestHmisAdapter");

test("FhirHmisAdapter - correctly normalizes FHIR R4 Bundle", async () => {
  const adapter = new FhirHmisAdapter();
  const visits = await adapter.fetchVisits();

  assert.ok(Array.isArray(visits));
  assert.equal(visits.length, 1);

  const visit = visits[0];
  assert.equal(visit.patient, "A. Wanjiru");
  assert.equal(visit.visitId, "VISIT #48211");
  assert.equal(visit.payer, "Jubilee");
  assert.equal(visit.scheme, "Outpatient · Corporate scheme B");
  assert.equal(visit.memberId, "JUB-882910-B");
  assert.equal(visit.currency, "RWF");
  assert.equal(visit.source, "FHIR_R4");

  // Validate items
  assert.equal(visit.items.length, 3);
  assert.equal(visit.items[0].desc, "Consultation – Dr. Achieng · A09");
  assert.equal(visit.items[0].amount, 3500);

  assert.equal(visit.items[1].desc, "CT scan – abdomen");
  assert.equal(visit.items[1].amount, 12800);
  assert.equal(visit.items[1].preAuthId, "PA-JUB-9942");

  assert.equal(visit.items[2].desc, "Rx – Amoxicillin 500mg");
  assert.equal(visit.items[2].amount, 2150);

  // Total should be 3500 + 12800 + 2150 = 18450
  assert.equal(visit.invoiceTotal, 18450);
});

test("RestHmisAdapter - normalizes hospital REST encounters", async () => {
  const adapter = new RestHmisAdapter();
  const visits = await adapter.fetchVisits();

  assert.ok(Array.isArray(visits));
  assert.equal(visits.length, 2);

  const uwase = visits.find((v) => v.patient === "A. Uwase");
  assert.ok(uwase);
  assert.equal(uwase.visitId, "VISIT #10492");
  assert.equal(uwase.payer, "Jubilee");
  assert.equal(uwase.items.length, 3);
  assert.equal(uwase.invoiceTotal, 33350);

  const mugisha = visits.find((v) => v.patient === "E. Mugisha");
  assert.ok(mugisha);
  assert.equal(mugisha.visitId, "VISIT #10501");
  assert.equal(mugisha.payer, "SHA");
  assert.equal(mugisha.memberId, "INVALID-SHA-99");
});
