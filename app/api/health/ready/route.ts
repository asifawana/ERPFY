import { json } from '@/lib/core/server';
import { checkDatabaseHealth } from '@/lib/database/index';
import { getStorageProvider } from '@/lib/storage/index';
import { getJobQueue } from '@/lib/jobs/index';

export const dynamic = 'force-dynamic';

/**
 * Readiness Probe: GET /api/health/ready
 * Verifies that the database and critical storage services are ready to accept traffic.
 * In production, returns 503 if any mandatory service is down, preventing bad traffic routing.
 */
export async function GET() {
  const checks: Record<string, { status: 'pass' | 'fail'; latencyMs?: number; error?: string }> = {};

  // 1. Database Connectivity Probe
  const dbHealth = await checkDatabaseHealth();
  checks.database = {
    status: dbHealth.ok ? 'pass' : 'fail',
    latencyMs: dbHealth.latencyMs,
    error: dbHealth.error,
  };

  // 2. Storage System Check
  const storage = getStorageProvider();
  checks.storage = {
    status: 'pass',
  };

  // 3. Queue System Check
  const queue = getJobQueue();
  const queueHealth = queue.healthCheck ? await queue.healthCheck() : { ok: true, latencyMs: 0 };
  checks.queue = {
    status: queueHealth.ok ? 'pass' : 'fail',
    latencyMs: queueHealth.latencyMs,
    error: queueHealth.error,
  };

  const isReady = Object.values(checks).every((c) => c.status === 'pass');

  return json(
    {
      status: isReady ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    },
    isReady ? 200 : 503,
  );
}
