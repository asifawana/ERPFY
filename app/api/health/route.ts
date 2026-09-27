import { json } from '@/lib/core/server';
import { checkDatabaseHealth } from '@/lib/database/index';
import { getStorageProvider } from '@/lib/storage/index';
import { getJobQueue } from '@/lib/jobs/index';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbHealth = await checkDatabaseHealth();
  const storage = getStorageProvider();
  const queue = getJobQueue();
  const queueHealth = queue.healthCheck ? await queue.healthCheck() : { ok: true, latencyMs: 0 };

  const isHealthy = dbHealth.ok && queueHealth.ok;

  return json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      version: '1.0.0-rc',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.ok ? 'up' : 'down',
          latencyMs: dbHealth.latencyMs,
        },
        storage: {
          provider: storage.name,
          status: 'ready',
        },
        queue: {
          driver: queue.name,
          status: queueHealth.ok ? 'up' : 'down',
          latencyMs: queueHealth.latencyMs,
        },
      },
    },
    isHealthy ? 200 : 503,
  );
}
