/**
 * ClaimsDataService
 * Service-owned data layer for the DMC Claims Integration AI prototype.
 * Keeps the MIS data separate from the service's own claim snapshots and audit log.
 */

const fs = require("fs");
const path = require("path");

class ClaimsDataService {
  constructor(config = {}) {
    this.config = config || {};
    this.memoryClaims = [];
    this.memoryAuditLog = [];
    this.dbClient = null;
    this.dbReady = false;

    const { Client } = this.safeRequire("pg");
    if (Client && (this.config.connectionString || this.config.host || this.config.database)) {
      this.dbClient = new Client({
        connectionString: this.config.connectionString || undefined,
        host: this.config.host || "localhost",
        port: this.config.port || 5432,
        database: this.config.database || "dmc_claims_service",
        user: this.config.user || "dmc_reader",
        password: this.config.password || "",
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      });
    }
  }

  safeRequire(moduleName) {
    try {
      return require(moduleName);
    } catch (error) {
      return {};
    }
  }

  async connect() {
    if (!this.dbClient || this.dbReady) return;
    try {
      await this.dbClient.connect();
      await this.ensureSchema();
      this.dbReady = true;
    } catch (error) {
      if (this.dbClient) {
        try { await this.dbClient.end(); } catch (_) {}
      }
      this.dbClient = null;
      this.dbReady = false;
    }
  }

  async ensureSchema() {
    if (!this.dbClient) return;
    const schemaPath = this.config.schemaPath || path.join(process.cwd(), "db", "schema.sql");
    const schemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, "utf8") : "";
    if (!schemaSql) return;
    await this.dbClient.query(schemaSql);
  }

  async upsertClaim(claim) {
    await this.connect();
    if (this.dbClient) {
      const payload = {
        id: claim.id,
        mis_claim_id: claim.visitId || claim.id,
        patient_ref: claim.patient || "unknown",
        insurer_id: claim.payer || "unknown",
        service_date: claim.createdAt || new Date().toISOString(),
        service_codes: JSON.stringify(claim.items?.map((item) => item.code || item.desc || "") || []),
        diagnosis_codes: JSON.stringify(claim.diagnoses?.map((d) => d.code || "") || []),
        amount: Number(claim.invoiceTotal || 0),
        pre_auth_ref: claim.preAuthRef || null,
        pulled_at: new Date().toISOString(),
        status: claim.status || "clean",
        metadata: JSON.stringify({
          source: claim.source || "mock_hmis",
          payer: claim.payer,
          visitId: claim.visitId,
          scheme: claim.scheme,
          rule: claim.rule,
          severity: claim.severity,
          checklist: claim.checklist || [],
        }),
      };

      await this.dbClient.query(
        `INSERT INTO claims (id, mis_claim_id, patient_ref, insurer_id, service_date, service_codes, diagnosis_codes, amount, pre_auth_ref, pulled_at, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           mis_claim_id = EXCLUDED.mis_claim_id,
           patient_ref = EXCLUDED.patient_ref,
           insurer_id = EXCLUDED.insurer_id,
           service_date = EXCLUDED.service_date,
           service_codes = EXCLUDED.service_codes,
           diagnosis_codes = EXCLUDED.diagnosis_codes,
           amount = EXCLUDED.amount,
           pre_auth_ref = EXCLUDED.pre_auth_ref,
           pulled_at = EXCLUDED.pulled_at,
           status = EXCLUDED.status,
           metadata = EXCLUDED.metadata`,
        [
          payload.id,
          payload.mis_claim_id,
          payload.patient_ref,
          payload.insurer_id,
          payload.service_date,
          payload.service_codes,
          payload.diagnosis_codes,
          payload.amount,
          payload.pre_auth_ref,
          payload.pulled_at,
          payload.status,
          payload.metadata,
        ]
      );

      const auditLog = await this.getAuditLog(claim.id);
      return { ...claim, auditLog };
    }

    const index = this.memoryClaims.findIndex((item) => item.id === claim.id);
    const auditLog = await this.getAuditLog(claim.id);
    const record = { ...claim, auditLog };
    if (index >= 0) {
      this.memoryClaims[index] = record;
      return record;
    }

    this.memoryClaims.push(record);
    return record;
  }

  async appendAuditLog(entry) {
    await this.connect();
    const auditEntry = {
      id: entry.id || `AUD-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      claimId: entry.claimId,
      ruleId: entry.ruleId || null,
      field: entry.field || null,
      reason: entry.reason || entry.details || "",
      severity: entry.severity || "info",
      action: entry.action || "system_event",
      status: entry.status || null,
      staffId: entry.staffId || null,
      createdAt: entry.createdAt || new Date().toISOString(),
      details: entry.details || "",
    };

    if (this.dbClient) {
      await this.dbClient.query(
        `INSERT INTO audit_log (id, claim_id, rule_id, field, reason, severity, action, status, staff_id, created_at, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          auditEntry.id,
          auditEntry.claimId,
          auditEntry.ruleId,
          auditEntry.field,
          auditEntry.reason,
          auditEntry.severity,
          auditEntry.action,
          auditEntry.status,
          auditEntry.staffId,
          auditEntry.createdAt,
          auditEntry.details,
        ]
      );
      return auditEntry;
    }

    this.memoryAuditLog.push(auditEntry);
    return auditEntry;
  }

  async getAuditLog(claimId = null) {
    await this.connect();
    if (this.dbClient) {
      const query = claimId
        ? "SELECT * FROM audit_log WHERE claim_id = $1 ORDER BY created_at DESC"
        : "SELECT * FROM audit_log ORDER BY created_at DESC";
      const params = claimId ? [claimId] : [];
      const result = await this.dbClient.query(query, params);
      return result.rows.map((row) => ({
        id: row.id,
        claimId: row.claim_id,
        ruleId: row.rule_id,
        field: row.field,
        reason: row.reason,
        severity: row.severity,
        action: row.action,
        status: row.status,
        staffId: row.staff_id,
        createdAt: row.created_at,
        details: row.details,
      }));
    }

    if (!claimId) return [...this.memoryAuditLog].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return this.memoryAuditLog.filter((entry) => entry.claimId === claimId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getClaims() {
    await this.connect();
    if (this.dbClient) {
      const result = await this.dbClient.query(
        `SELECT c.*, json_agg(a.* ORDER BY a.created_at DESC) AS audit_log
         FROM claims c
         LEFT JOIN audit_log a ON a.claim_id = c.id
         GROUP BY c.id
         ORDER BY c.pulled_at DESC`
      );
      return result.rows.map((row) => ({
        id: row.id,
        visitId: row.mis_claim_id,
        patient: row.patient_ref,
        payer: row.insurer_id,
        status: row.status,
        invoiceTotal: Number(row.amount || 0),
        createdAt: row.service_date,
        auditLog: (row.audit_log || []).map((log) => ({
          id: log.id,
          claimId: log.claim_id,
          action: log.action,
          reason: log.reason,
          status: log.status,
          staffId: log.staff_id,
          createdAt: log.created_at,
        })),
      }));
    }

    const claims = await Promise.all(
      this.memoryClaims.map(async (claim) => ({
        ...claim,
        auditLog: await this.getAuditLog(claim.id),
      }))
    );
    return claims;
  }
}

module.exports = ClaimsDataService;
