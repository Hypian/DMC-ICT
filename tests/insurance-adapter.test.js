const test = require("node:test");
const assert = require("node:assert/strict");
const ShaPayerAdapter = require("../src/integrations/insurance/ShaPayerAdapter");
const SmartEdiPayerAdapter = require("../src/integrations/insurance/SmartEdiPayerAdapter");
const GenericPayerAdapter = require("../src/integrations/insurance/GenericPayerAdapter");

test("ShaPayerAdapter - validates valid vs invalid SHA IDs", async () => {
  const sha = new ShaPayerAdapter();

  const valid = await sha.verifyEligibility("SHA-109283", "A. Wanjiru");
  assert.equal(valid.eligible, true);
  assert.equal(valid.status, "active");
  assert.equal(valid.benefitBalance, 50000);

  const invalid = await sha.verifyEligibility("INVALID-123", "E. Mugisha");
  assert.equal(invalid.eligible, false);
  assert.equal(invalid.status, "fail");
  assert.match(invalid.reason, /format SHA expects/);

  const waiting = await sha.verifyEligibility("SHA-WAITING-99", "J. Niyonsenga");
  assert.equal(waiting.eligible, false);
  assert.equal(waiting.status, "waiting_period");
});

test("SmartEdiPayerAdapter - verifies pre-authorizations and balances", async () => {
  const edi = new SmartEdiPayerAdapter();

  // With approved pre-auth number
  const approved = await edi.checkPreAuthorization("Jubilee", "JUB-123", "CT-ABD", "PA-9942");
  assert.equal(approved.preAuthStatus, "approved");

  // Missing pre-auth on high-cost CT scan
  const missing = await edi.checkPreAuthorization("Jubilee", "JUB-123", "CT-ABD", null);
  assert.equal(missing.preAuthStatus, "missing");
  assert.match(missing.reason, /clinical indication/);

  // General service that does not require pre-auth
  const notRequired = await edi.checkPreAuthorization("Jubilee", "JUB-123", "CONSULT", null);
  assert.equal(notRequired.preAuthStatus, "not_required");

  // Member eligibility check
  const member = await edi.verifyMember("Jubilee", "JUB-882910-B");
  assert.equal(member.eligible, true);
  assert.equal(member.balance, 84000);
});

test("GenericPayerAdapter - routes to appropriate adapter and checks tariffs", async () => {
  const generic = new GenericPayerAdapter();

  // Tariff within limit
  const okTariff = generic.checkTariff("CT scan – abdomen", 12800);
  assert.equal(okTariff.compliant, true);

  // Tariff exceeding cap
  const highTariff = generic.checkTariff("Comprehensive Metabolic Panel", 9800);
  assert.equal(highTariff.compliant, false);
  assert.equal(highTariff.excess, 1800);
});
