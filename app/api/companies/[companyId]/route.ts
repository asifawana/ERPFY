import { requireCompanyAccess } from '@/lib/core/company';
import { database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

export async function GET(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const { companyId } = await context.params;
    return json({
      company: await requireCompanyAccess(db, viewer.accountId, companyId),
    });
  } catch (error) {
    return failure(error);
  }
}
