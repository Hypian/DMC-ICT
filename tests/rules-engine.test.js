const test = require("node:test");
const assert = require("node:assert/strict");
const ClaimsRulesEngine = require("../src/engine/ClaimsRulesEngine");
const FhirHmisAdapter = require("../src/integrations/hmis/FhirHmisAdapter");
const RestHmisAdapter = require("../src/integrations/hmis/RestHmisAdapter");

test("ClaimsRulesEngine - produces exact clean claim ledger for valid visit", async () => {
  const engine = new ClaimsRulesEngine();
  const fhir = new FhirHmisAdapter();
  const [validVisit] = await fhir.fetchVisits();

  const claim = await engine.evaluateVisit(validVisit);

  assert.equal(claim.status, "clean");
  assert.equal(claim.stage, 3); // CLEAN
  assert.equal(claim.patient, "A. Wanjiru");
  assert.equal(claim.visitId, "VISIT #48211");
  assert.equal(claim.invoiceTotal, 18450);

  // Validate checklist items
  assert.ok(Array.isArray(claim.checklist));
  assert.equal(claim.checklist.length, 8);

  const eligibleCheck = claim.checklist.find((c) => c.label === "Member eligible");
  assert.ok(eligibleCheck);
  assert.equal(eligibleCheck.status, "pass");

  const preAuthCheck = claim.checklist.find((c) => c.label.includes("pre-auth"));
  assert.ok(preAuthCheck);
  assert.equal(preAuthCheck.status, "pass");

  const allPassing = claim.checklist.every((c) => c.status === "pass");
  assert.equal(allPassing, true);
});

test("ClaimsRulesEngine - flags claim when high-cost procedure lacks pre-auth", async () => {
  const engine = new ClaimsRulesEngine();
  const rest = new RestHmisAdapter();
  const visits = await rest.fetchVisits();
  const uwaseVisit = visits.find((v) => v.patient === "A. Uwase");

  const claim = await engine.evaluateVisit(uwaseVisit);

  assert.equal(claim.status, "flagged");
  assert.equal(claim.stage, 2); // CHECKED (stopped before Clean)
  assert.equal(claim.rule, "Missing pre-authorization");
  assert.equal(claim.severity, "high");

  const failingCheck = claim.checklist.find((c) => c.status === "fail");
  assert.ok(failingCheck);
  assert.match(failingCheck.label, /pre-auth/);
  assert.equal(failingCheck.value, "missing indication");
});

test("ClaimsRulesEngine - flags ID mismatch on invalid SHA format", async () => {
  const engine = new ClaimsRulesEngine();
  const rest = new RestHmisAdapter();
  const visits = await rest.fetchVisits();
  const mugishaVisit = visits.find((v) => v.patient === "E. Mugisha");

  const claim = await engine.evaluateVisit(mugishaVisit);

  assert.equal(claim.status, "flagged");
  assert.equal(claim.rule, "Insurance ID mismatch");
  assert.equal(claim.owner, "Front Desk");
  assert.equal(claim.checklist[0].status, "fail");
});
