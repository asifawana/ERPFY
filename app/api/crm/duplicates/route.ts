import { database, failure, json, body } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { authorize } from '@/lib/core/authorization';
import { requireCompanyAccess } from '@/lib/core/company';
import { findDuplicates } from '@/plugins/erpfy.contacts_crm/src/services/duplicate-service';

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
      const auth = await authorize(db, viewer.accountId, companyId, 'contacts.view');
      if (!auth.allowed) {
        return json({ error: 'Permission denied: contacts.view required.' }, 403);
      }
    }

    const candidates = await findDuplicates(db, companyId, {
      email: typeof data.email === 'string' ? data.email : undefined,
      phone: typeof data.phone === 'string' ? data.phone : undefined,
      mobile: typeof data.mobile === 'string' ? data.mobile : undefined,
      taxIdentifier: typeof data.taxIdentifier === 'string' ? data.taxIdentifier : undefined,
      excludePartyId: typeof data.excludePartyId === 'string' ? data.excludePartyId : undefined,
    });

    return json({ success: true, candidates });
  } catch (error) {
    return failure(error);
  }
}
