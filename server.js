/**
 * DMC Claims Assurance Server
 * Lightweight, zero-dependency Node.js HTTP server.
 * Serves REST endpoints for HMIS/Insurance sync and static assets for the EMR Widget & Dashboard.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const claimsService = require("./src/services/ClaimsSyncService");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // ---------- REST API Endpoints ----------

  if (pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, { status: "ok", service: "DMC Claims Assurance API", timestamp: new Date().toISOString() });
  }

  if (pathname === "/api/claims" && req.method === "GET") {
    try {
      const claims = await claimsService.getClaims();
      return sendJson(res, 200, claims);
    } catch (err) {
      return sendJson(res, 500, { error: "Failed to fetch claims", message: err.message });
    }
  }

  if (pathname === "/api/sync" && req.method === "POST") {
    try {
      const result = await claimsService.syncAll();
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { error: "Sync failed", message: err.message });
    }
  }

  if (pathname.startsWith("/api/claims/") && pathname.endsWith("/resolve") && req.method === "POST") {
    const parts = pathname.split("/");
    const claimId = parts[3];
    try {
      const body = await parseJsonBody(req);
      const updated = await claimsService.resolveClaim(claimId, body.status || "clean", body.reason);
      if (!updated) {
        return sendJson(res, 404, { error: "Claim not found" });
      }
      return sendJson(res, 200, updated);
    } catch (err) {
      return sendJson(res, 400, { error: "Failed to resolve claim", message: err.message });
    }
  }

  if (pathname.startsWith("/api/claims/") && req.method === "GET") {
    const claimId = pathname.replace("/api/claims/", "");
    try {
      const claim = await claimsService.getClaimById(claimId);
      if (!claim) {
        return sendJson(res, 404, { error: "Claim not found" });
      }
      return sendJson(res, 200, claim);
    } catch (err) {
      return sendJson(res, 500, { error: "Error fetching claim", message: err.message });
    }
  }

  // ---------- Static File Serving ----------

  let filePath = path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);
  
  // Security check to avoid directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("File Not Found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`DMC Claims Assurance server running on http://localhost:${PORT}`);
  });
}

module.exports = server;
