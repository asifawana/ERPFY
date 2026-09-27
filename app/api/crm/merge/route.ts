import { database, failure, json, body } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { authorize } from '@/lib/core/authorization';
import { requireCompanyAccess } from '@/lib/core/company';
import { mergeParties } from '@/plugins/erpfy.contacts_crm/src/services/duplicate-service';

export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request);
    const companyId = typeof data.companyId === 'string' ? data.companyId.trim() : '';

    if (!companyId) {
      return json({ error: 'Company ID is required.' }, 400);
    }

    const access = await requireCompanyAccess(db, viewer.accountId, companyId);
    if (access.role !== 'owner') {
      const auth = await authorize(db, viewer.accountId, companyId, 'contacts.update');
      if (!auth.allowed) {
        return json({ error: 'Permission denied: contacts.update required.' }, 403);
      }
    }

    const primaryPartyId = typeof data.primaryPartyId === 'string' ? data.primaryPartyId.trim() : '';
    const duplicatePartyIds = Array.isArray(data.duplicatePartyIds)
      ? (data.duplicatePartyIds as string[])
      : [];

    if (!primaryPartyId || duplicatePartyIds.length === 0) {
      return json({ error: 'primaryPartyId and duplicatePartyIds array are required.' }, 400);
    }

    const result = await mergeParties(
      db,
      companyId,
      {
        primaryPartyId,
        duplicatePartyIds,
      },
      viewer.accountId,
    );

    return json({ success: true, ...result });
  } catch (error) {
    return failure(error);
  }
}
