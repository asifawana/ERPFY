/**
 * ERPFY Host Capability Broker
 * Strict Default-Deny RPC Bridge between Host and Sandboxed Plugins.
 * 
 * Enforces:
 * - Runtime token validity and expiry on every invocation
 * - Mandatory capability grant verification
 * - Company-scoped parameterization (preventing cross-company data access)
 * - Installation and killswitch status verification
 */

import crypto from 'node:crypto';
import { ApiError } from '../core/server';
import { verifyPluginRuntimeToken } from './runtime-token';
import { executeMediatedEgressRequest, type EgressRequestOptions, type EgressResponse } from './egress';

export type CapabilityBrokerContext = {
  db: D1Database;
  companyId: string;
  appId: string;
  version: string;
  installationId: string;
  runtimeToken: string;
  secret?: string;
};

export class CapabilityBroker {
  private db: D1Database;
  private companyId: string;
  private appId: string;
  private version: string;
  private installationId: string;
  private runtimeToken: string;
  private secret?: string;

  constructor(context: CapabilityBrokerContext) {
    this.db = context.db;
    this.companyId = context.companyId;
    this.appId = context.appId;
    this.version = context.version;
    this.installationId = context.installationId;
    this.runtimeToken = context.runtimeToken;
    this.secret = context.secret;
  }

  /**
   * Authorizes a capability call by validating the runtime token and database state.
   */
  private async authorizeCapability(requiredCapability: string): Promise<void> {
    // 1. Verify runtime token cryptographically
    verifyPluginRuntimeToken(
      this.runtimeToken,
      {
        companyId: this.companyId,
        pluginId: this.appId,
        installationId: this.installationId,
        pluginVersion: this.version,
        capability: requiredCapability,
      },
      this.secret,
    );

    // 2. Verify installation and killswitch state in DB
    const install = await this.db
      .prepare(
        `SELECT i.status, a.is_killed 
           FROM eap_app_installations i
           JOIN eap_apps a ON i.app_id = a.id
          WHERE i.id = ?1 AND i.company_id = ?2`,
      )
      .bind(this.installationId, this.companyId)
      .first<{ status: string; is_killed: number }>();

    if (!install) {
      throw new ApiError(404, `Active installation record not found for company '${this.companyId}'.`);
    }

    if (install.is_killed === 1) {
      throw new ApiError(403, `Plugin '${this.appId}' has been globally killed by platform security.`);
    }

    if (install.status !== 'installed') {
      throw new ApiError(403, `Plugin '${this.appId}' is in '${install.status}' state; execution denied.`);
    }
  }

  /**
   * Query records from a company-scoped table.
   */
  async findMany(
    tableName: 'products' | 'orders' | 'customers',
    filter: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>[]> {
    const cap = `${tableName}.read`;
    await this.authorizeCapability(cap);

    // Enforce company isolation: strip any caller-supplied company_id and bind host companyId
    const sanitizedKeys = Object.keys(filter).filter((k) => k !== 'company_id');
    const clauses = ['company_id = ?1'];
    const values: unknown[] = [this.companyId];

    sanitizedKeys.forEach((key, idx) => {
      clauses.push(`${key} = ?${idx + 2}`);
      values.push(filter[key]);
    });

    const query = `SELECT * FROM ${tableName} WHERE ${clauses.join(' AND ')} LIMIT 100`;
    const { results } = await this.db.prepare(query).bind(...values).all();
    return (results || []) as Record<string, unknown>[];
  }

  /**
   * Find a single record by ID within the host company.
   */
  async findById(
    tableName: 'products' | 'orders' | 'customers',
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const cap = `${tableName}.read`;
    await this.authorizeCapability(cap);

    const query = `SELECT * FROM ${tableName} WHERE company_id = ?1 AND id = ?2 LIMIT 1`;
    const result = await this.db.prepare(query).bind(this.companyId, id).first();
    return (result as Record<string, unknown>) || null;
  }

  /**
   * Read plugin configuration setting.
   */
  async getSetting(key: string): Promise<unknown> {
    await this.authorizeCapability('settings.read');

    const row = await this.db
      .prepare(`SELECT configuration FROM eap_app_installations WHERE id = ?1 AND company_id = ?2`)
      .bind(this.installationId, this.companyId)
      .first<{ configuration: string }>();

    if (!row?.configuration) return null;
    try {
      const config = JSON.parse(row.configuration);
      return config[key] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Save plugin configuration setting.
   */
  async setSetting(key: string, value: unknown): Promise<void> {
    await this.authorizeCapability('settings.write');

    const row = await this.db
      .prepare(`SELECT configuration FROM eap_app_installations WHERE id = ?1 AND company_id = ?2`)
      .bind(this.installationId, this.companyId)
      .first<{ configuration: string }>();

    let config: Record<string, unknown> = {};
    if (row?.configuration) {
      try {
        config = JSON.parse(row.configuration);
      } catch {
        config = {};
      }
    }

    config[key] = value;
    await this.db
      .prepare(`UPDATE eap_app_installations SET configuration = ?1, updated_at = ?2 WHERE id = ?3`)
      .bind(JSON.stringify(config), Date.now(), this.installationId)
      .run();
  }

  /**
   * Log an immutable audit event for this plugin.
   */
  async logAudit(action: string, details: Record<string, unknown>): Promise<void> {
    await this.authorizeCapability('audit.log');

    await this.db
      .prepare(
        `INSERT INTO eap_app_audit_logs
          (id, actor_id, actor_type, app_id, version_id, company_id, action, details, created_at)
         VALUES (?1, 'plugin_sandbox', 'plugin', ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(
        `audit_${crypto.randomBytes(12).toString('hex')}`,
        this.appId,
        this.version,
        this.companyId,
        `plugin.${action}`,
        JSON.stringify(details),
        Date.now(),
      )
      .run();
  }

  /**
   * Execute mediated network egress request.
   */
  async httpRequest(options: EgressRequestOptions): Promise<EgressResponse> {
    return executeMediatedEgressRequest(options, () => {
      // Must hold network.request or network.outbound
      verifyPluginRuntimeToken(
        this.runtimeToken,
        {
          companyId: this.companyId,
          pluginId: this.appId,
          installationId: this.installationId,
          pluginVersion: this.version,
        },
        this.secret,
      );

      // Check for capability in allowedCapabilities
      const parts = this.runtimeToken.split('.');
      let allowed: string[] = [];
      try {
        const decoded = Buffer.from(parts[1], 'base64').toString('utf8');
        allowed = JSON.parse(decoded).allowedCapabilities ?? [];
      } catch {
        throw new ApiError(401, 'Invalid runtime token');
      }

      if (!allowed.includes('network.request') && !allowed.includes('network.outbound')) {
        throw new ApiError(
          403,
          "Capability Denied: Plugin does not grant network capability ('network.request').",
        );
      }
    });
  }

  /**
   * Retrieve a declared secret for this plugin.
   * Only returns secrets belonging to this installation in this company.
   */
  async getSecret(key: string): Promise<string | null> {
    await this.authorizeCapability('secrets.read');

    // Fetch from eap_dev_credentials or installation configuration
    const row = await this.db
      .prepare(`SELECT configuration FROM eap_app_installations WHERE id = ?1 AND company_id = ?2`)
      .bind(this.installationId, this.companyId)
      .first<{ configuration: string }>();

    if (!row?.configuration) return null;
    try {
      const config = JSON.parse(row.configuration);
      const secretVal = config[`secret_${key}`] ?? config[key];
      return typeof secretVal === 'string' ? secretVal : null;
    } catch {
      return null;
    }
  }
}
