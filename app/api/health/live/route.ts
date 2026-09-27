import { json } from '@/lib/core/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness Probe: GET /api/health/live
 * Fast, lightweight endpoint for container orchestrators (Kubernetes, Docker, Cloudflare)
 * to verify the HTTP server process is running and accepting connections.
 */
export async function GET() {
  return json({ status: 'alive', uptime: process.uptime ? Math.round(process.uptime()) : 0 }, 200);
}
