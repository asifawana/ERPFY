import { database, failure, json, body } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { authorize } from '@/lib/core/authorization';
import { requireCompanyAccess } from '@/lib/core/company';
import { convertLead } from '@/plugins/erpfy.contacts_crm/src/services/crm-pipeline-service';
import type { PartyRoleKey, PartyType } from '@/plugins/erpfy.contacts_crm/src/contracts/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const assignRoles = Array.isArray(data.assignRoles)
      ? (data.assignRoles as PartyRoleKey[])
      : ['customer'];

    const partyType = (data.partyType as PartyType) || 'person';

    const result = await convertLead(
      db,
      companyId,
      id,
      {
        partyType,
        displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
        primaryEmail: typeof data.primaryEmail === 'string' ? data.primaryEmail : undefined,
        primaryPhone: typeof data.primaryPhone === 'string' ? data.primaryPhone : undefined,
        assignRoles,
        createOpportunity:
          data.createOpportunity && typeof data.createOpportunity === 'object'
            ? {
                name: String(
                  (data.createOpportunity as Record<string, unknown>).name || 'Initial Opportunity',
                ),
                amount: Number((data.createOpportunity as Record<string, unknown>).amount || 0),
              }
            : undefined,
      },
      viewer.accountId,
    );

    return json({ success: true, ...result });
  } catch (error) {
    return failure(error);
  }
}
