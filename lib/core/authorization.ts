import { requireCompanyAccess, type CompanyAccess } from './company';
import { ApiError } from './server';

export type DataScope = 'OWN' | 'BRANCH' | 'COMPANY' | 'TENANT';
export type PermissionEffect = 'allow' | 'deny';

export type Authorization = {
  allowed: boolean;
  permission: string;
  scope: DataScope | null;
  branchIds: string[];
  access: CompanyAccess;
  source: 'override' | 'role' | 'legacy' | 'default-deny';
};

type GrantRow = { effect: PermissionEffect; scope: DataScope };

const SCOPE_RANK: Record<DataScope, number> = {
  OWN: 1,
  BRANCH: 2,
  COMPANY: 3,
  TENANT: 3,
};

/**
 * Compatibility grants for memberships created before relational roles shipped.
 * They are deliberately narrow and disappear for a member as soon as a relational role is
 * assigned. New capabilities must be registered in the database and never added here.
 */
const LEGACY_GRANTS: Record<string, Record<string, DataScope>> = {
  owner: {
    'settings.view': 'COMPANY',
    'settings.manage': 'COMPANY',
    'integrations.manage': 'COMPANY',
  },
  administrator: {
    'settings.view': 'COMPANY',
    'settings.manage': 'COMPANY',
    'integrations.manage': 'COMPANY',
  },
  billing_manager: { 'settings.view': 'COMPANY' },
  member: { 'settings.view': 'COMPANY' },
  auditor: { 'settings.view': 'COMPANY' },
};

function validatePermission(permission: string) {
  if (!/^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$/.test(permission)) {
    throw new ApiError(500, 'Invalid permission configuration.');
  }
}

function strongestScope(rows: GrantRow[]): DataScope | null {
  if (rows.some((row) => row.effect === 'deny')) return null;
  const allows = rows.filter((row) => row.effect === 'allow');
  return (
    allows.sort((a, b) => SCOPE_RANK[b.scope] - SCOPE_RANK[a.scope])[0]
      ?.scope ?? null
  );
}

async function branchAssignments(
  db: D1Database,
  accountId: string,
  companyId: string,
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT mb.branch_id
         FROM core_membership_branches mb
         JOIN core_branches b
           ON b.id = mb.branch_id AND b.company_id = mb.company_id
        WHERE mb.account_id = ?1 AND mb.company_id = ?2 AND b.status = 'active'
        ORDER BY mb.branch_id`,
    )
    .bind(accountId, companyId)
    .all<{ branch_id: string }>();
  return (results ?? []).map((row) => row.branch_id);
}

/** Resolves explicit deny > explicit allow > role grant > narrow legacy grant > deny. */
export async function authorize(
  db: D1Database,
  accountId: string,
  companyId: string,
  permission: string,
): Promise<Authorization> {
  validatePermission(permission);
  const access = await requireCompanyAccess(db, accountId, companyId);

  const override = await db
    .prepare(
      `SELECT effect, scope
         FROM core_permission_overrides
        WHERE company_id = ?1 AND account_id = ?2 AND permission_key = ?3
        LIMIT 1`,
    )
    .bind(companyId, accountId, permission)
    .first<GrantRow>();

  if (override) {
    const scope = override.effect === 'allow' ? override.scope : null;
    const branchIds = scope === 'BRANCH'
      ? await branchAssignments(db, accountId, companyId)
      : [];
    return {
      allowed: scope !== null && (scope !== 'BRANCH' || branchIds.length > 0),
      permission,
      scope,
      branchIds,
      access,
      source: 'override',
    };
  }

  const { results: grants } = await db
    .prepare(
      `SELECT rp.effect, rp.scope
         FROM core_membership_roles mr
         JOIN core_roles r ON r.id = mr.role_id AND r.company_id = mr.company_id
         JOIN core_role_permissions rp ON rp.role_id = r.id
        WHERE mr.company_id = ?1 AND mr.account_id = ?2
          AND rp.permission_key = ?3`,
    )
    .bind(companyId, accountId, permission)
    .all<GrantRow>();

  if (grants.length > 0) {
    const scope = strongestScope(grants);
    const branchIds = scope === 'BRANCH'
      ? await branchAssignments(db, accountId, companyId)
      : [];
    return {
      allowed: scope !== null && (scope !== 'BRANCH' || branchIds.length > 0),
      permission,
      scope,
      branchIds,
      access,
      source: 'role',
    };
  }

  const assignedRole = await db
    .prepare(
      'SELECT 1 AS assigned FROM core_membership_roles WHERE company_id = ?1 AND account_id = ?2 LIMIT 1',
    )
    .bind(companyId, accountId)
    .first<{ assigned: number }>();
  const legacyScope = assignedRole
    ? null
    : (LEGACY_GRANTS[access.role]?.[permission] ?? null);

  return {
    allowed: legacyScope !== null,
    permission,
    scope: legacyScope,
    branchIds: [],
    access,
    source: legacyScope ? 'legacy' : 'default-deny',
  };
}

export async function requirePermission(
  db: D1Database,
  accountId: string,
  companyId: string,
  permission: string,
): Promise<Authorization> {
  const result = await authorize(db, accountId, companyId, permission);
  if (!result.allowed) {
    throw new ApiError(403, 'You do not have permission to perform this action.');
  }
  return result;
}
