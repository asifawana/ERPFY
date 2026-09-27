import { getStorageProvider } from '@/lib/storage';
import { failure, ApiError } from '@/lib/core/server';

/**
 * GET /api/storage/tenants/:companyId/:namespace/:filename
 * Safely serves stored tenant assets.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path: segments } = await context.params;
    if (!segments || segments.length < 4 || segments[0] !== 'tenants') {
      throw new ApiError(404, 'File not found or invalid storage path.');
    }

    const [, companyId, namespace, filename] = segments;
    if (!companyId || !namespace || !filename) {
      throw new ApiError(404, 'Incomplete storage route.');
    }

    const storage = getStorageProvider();
    const file = await storage.getFile({ companyId, namespace, filename });

    if (!file) {
      throw new ApiError(404, 'File does not exist in tenant storage.');
    }

    return new Response(new Uint8Array(file.content), {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return failure(error);
  }
}
