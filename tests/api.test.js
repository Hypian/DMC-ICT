const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const server = require("../server");

function makeRequest(port, path, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test("API Server - endpoints operate correctly", async (t) => {
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  t.after(() => {
    server.close();
  });

  // 1. Health check
  const health = await makeRequest(port, "/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.data.status, "ok");

  // 2. Initial sync
  const sync = await makeRequest(port, "/api/sync", "POST");
  assert.equal(sync.status, 200);
  assert.ok(sync.data.claims);
  assert.ok(sync.data.summary.total >= 3);

  // 3. Get claims list
  const claimsRes = await makeRequest(port, "/api/claims");
  assert.equal(claimsRes.status, 200);
  assert.ok(Array.isArray(claimsRes.data));
  assert.ok(claimsRes.data.length >= 3);

  // 4. Resolve a flagged claim
  const flagged = claimsRes.data.find((c) => c.status === "flagged");
  assert.ok(flagged);

  const resolveRes = await makeRequest(port, `/api/claims/${flagged.id}/resolve`, "POST", {
    status: "clean",
    reason: "Pre-auth obtained from Jubilee portal",
  });
  assert.equal(resolveRes.status, 200);
  assert.equal(resolveRes.data.status, "clean");
  assert.equal(resolveRes.data.stage, 3);
});
