import { database, failure, json, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requirePlatformAdmin } from '@/lib/core/admin';
import { getStorageProvider } from '@/lib/storage';
import { getDomainProvider } from '@/lib/domains/providers';
import { getPaymentProvider } from '@/lib/billing/providers';
import { getJobQueue } from '@/lib/jobs';

/**
 * GET /api/admin/platform
 * Comprehensive system health, driver statuses, and usage metrics.
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    requirePlatformAdmin(viewer);

    // Aggregate key counts
    const companiesCount = await db.prepare('SELECT count(*) as count FROM core_companies').first<{ count: number }>();
    const usersCount = await db.prepare('SELECT count(*) as count FROM core_accounts').first<{ count: number }>();
    const appsCount = await db.prepare('SELECT count(*) as count FROM eap_apps').first<{ count: number }>();

    // Audit logs
    const auditRows = await db
      .prepare(
        `SELECT id, actor_id, actor_type, action, details, created_at
         FROM eap_app_audit_logs
         ORDER BY created_at DESC LIMIT 20`,
      )
      .all<{
        id: string;
        actor_id: string;
        actor_type: string;
        action: string;
        details: string;
        created_at: number;
      }>();

    const storage = getStorageProvider();
    const domainProvider = getDomainProvider();
    const paymentProvider = getPaymentProvider();
    const queue = getJobQueue();

    return json({
      ok: true,
      status: 'healthy',
      version: '1.0.0-PROD-READY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime ? Math.floor(process.uptime()) : 0,
      subsystems: {
        database: { driver: 'sqlite_d1', status: 'connected' },
        storage: { provider: storage.name, isProduction: storage.isProduction },
        domains: { provider: domainProvider.name, isProduction: domainProvider.isProduction },
        billing: { provider: paymentProvider.name, isLiveMode: paymentProvider.isLiveMode },
        queue: { driver: queue.name, isProduction: queue.isProduction },
      },
      stats: {
        totalCompanies: companiesCount?.count || 0,
        totalUsers: usersCount?.count || 0,
        totalApps: appsCount?.count || 0,
      },
      recentAuditLogs: (auditRows.results || []).map((row) => ({
        ...row,
        details: row.details ? JSON.parse(row.details) : {},
      })),
    });
  } catch (error) {
    return failure(error);
  }
}
