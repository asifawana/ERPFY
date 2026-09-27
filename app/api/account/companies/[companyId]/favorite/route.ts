import { toggleFavorite } from '@/lib/core/company';
import { body, database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

export async function POST(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const db = database();
    await body(request);
    const viewer = await requireViewer(db, request.headers);
    const { companyId } = await context.params;
    const result = await toggleFavorite(db, viewer.accountId, companyId);
    return json(result);
  } catch (error) {
    return failure(error);
  }
}
