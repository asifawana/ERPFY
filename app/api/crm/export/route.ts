import { database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { authorize } from '@/lib/core/authorization';
import { requireCompanyAccess } from '@/lib/core/company';
import { exportPartiesCsv } from '@/plugins/erpfy.contacts_crm/src/services/import-export-service';

export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');

    if (!companyId) {
      return json({ error: 'Company ID is required.' }, 400);
    }

    const access = await requireCompanyAccess(db, viewer.accountId, companyId);
    if (access.role !== 'owner') {
      const auth = await authorize(db, viewer.accountId, companyId, 'contacts.export');
      if (!auth.allowed) {
        return json({ error: 'Permission denied: contacts.export required.' }, 403);
      }
    }

    const roleKey = url.searchParams.get('roleKey') || undefined;
    const csv = await exportPartiesCsv(db, companyId, { roleKey });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="crm-parties-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    return failure(error);
  }
}
