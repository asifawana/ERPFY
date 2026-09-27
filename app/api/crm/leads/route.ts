import { database, failure, json, body } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { authorize } from '@/lib/core/authorization';
import { requireCompanyAccess } from '@/lib/core/company';
import { listLeads, createLead } from '@/plugins/erpfy.contacts_crm/src/services/crm-pipeline-service';
import type { LeadStatus } from '@/plugins/erpfy.contacts_crm/src/contracts/types';

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
      const auth = await authorize(db, viewer.accountId, companyId, 'crm.leads.view');
      if (!auth.allowed) {
        return json({ error: 'Permission denied: crm.leads.view required.' }, 403);
      }
    }

    const status = (url.searchParams.get('status') as LeadStatus) || undefined;
    const search = url.searchParams.get('search') || undefined;

    const leads = await listLeads(db, companyId, { status, search });
    return json({ success: true, leads });
  } catch (error) {
    return failure(error);
  }
}

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
      const auth = await authorize(db, viewer.accountId, companyId, 'crm.leads.manage');
      if (!auth.allowed) {
        return json({ error: 'Permission denied: crm.leads.manage required.' }, 403);
      }
    }

    const title = typeof data.title === 'string' ? data.title.trim() : '';
    if (!title) {
      return json({ error: 'title is required.' }, 400);
    }

    const lead = await createLead(db, companyId, {
      title,
      partyId: typeof data.partyId === 'string' ? data.partyId : undefined,
      source: typeof data.source === 'string' ? data.source : undefined,
      estimatedValue: typeof data.estimatedValue === 'number' ? data.estimatedValue : undefined,
      assignedUserId: typeof data.assignedUserId === 'string' ? data.assignedUserId : undefined,
    });

    return json({ success: true, lead });
  } catch (error) {
    return failure(error);
  }
}
