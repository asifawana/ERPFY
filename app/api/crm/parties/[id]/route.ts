import { database, failure, json, body } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { authorize } from '@/lib/core/authorization';
import { requireCompanyAccess } from '@/lib/core/company';
import {
  getPartyProfile,
  updatePartyRecord,
  archivePartyRecord,
  assignPartyRole,
  addContactPerson,
  addPartyAddress,
} from '@/plugins/erpfy.contacts_crm/src/services/party-service';
import type { PartyRoleKey, AddressType } from '@/plugins/erpfy.contacts_crm/src/contracts/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');

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

    const party = await getPartyProfile(db, companyId, id);
    if (!party) {
      return json({ error: 'Party not found.' }, 404);
    }

    return json({ success: true, party });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(
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
      const auth = await authorize(db, viewer.accountId, companyId, 'contacts.update');
      if (!auth.allowed) {
        return json({ error: 'Permission denied: contacts.update required.' }, 403);
      }
    }

    const updated = await updatePartyRecord(
      db,
      companyId,
      id,
      {
        displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
        legalName: typeof data.legalName === 'string' ? data.legalName : undefined,
        firstName: typeof data.firstName === 'string' ? data.firstName : undefined,
        lastName: typeof data.lastName === 'string' ? data.lastName : undefined,
        primaryEmail: typeof data.primaryEmail === 'string' ? data.primaryEmail : undefined,
        primaryPhone: typeof data.primaryPhone === 'string' ? data.primaryPhone : undefined,
        primaryMobile: typeof data.primaryMobile === 'string' ? data.primaryMobile : undefined,
        website: typeof data.website === 'string' ? data.website : undefined,
        taxIdentifier: typeof data.taxIdentifier === 'string' ? data.taxIdentifier : undefined,
      },
      viewer.accountId,
    );

    if (!updated) {
      return json({ error: 'Party not found.' }, 404);
    }

    // Role assignment if supplied
    if (typeof data.assignRole === 'string' && data.assignRole.trim()) {
      await assignPartyRole(db, companyId, id, data.assignRole.trim() as PartyRoleKey);
    }

    // Contact person addition if supplied
    if (data.newContact && typeof data.newContact === 'object') {
      const c = data.newContact as Record<string, unknown>;
      await addContactPerson(db, companyId, id, {
        firstName: typeof c.firstName === 'string' ? c.firstName : '',
        lastName: typeof c.lastName === 'string' ? c.lastName : '',
        jobTitle: typeof c.jobTitle === 'string' ? c.jobTitle : '',
        email: typeof c.email === 'string' ? c.email : '',
        phone: typeof c.phone === 'string' ? c.phone : '',
        mobile: typeof c.mobile === 'string' ? c.mobile : '',
        isPrimary: Boolean(c.isPrimary),
      });
    }

    // Address addition if supplied
    if (data.newAddress && typeof data.newAddress === 'object') {
      const a = data.newAddress as Record<string, unknown>;
      if (typeof a.line1 === 'string' && typeof a.city === 'string' && typeof a.countryCode === 'string') {
        await addPartyAddress(db, companyId, id, {
          type: (a.type as AddressType) || 'billing',
          line1: a.line1,
          line2: typeof a.line2 === 'string' ? a.line2 : '',
          city: a.city,
          state: typeof a.state === 'string' ? a.state : '',
          postalCode: typeof a.postalCode === 'string' ? a.postalCode : '',
          countryCode: a.countryCode,
          isDefault: Boolean(a.isDefault),
        });
      }
    }

    const full = await getPartyProfile(db, companyId, id);
    return json({ success: true, party: full });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');

    if (!companyId) {
      return json({ error: 'Company ID is required.' }, 400);
    }

    const access = await requireCompanyAccess(db, viewer.accountId, companyId);
    if (access.role !== 'owner') {
      const auth = await authorize(db, viewer.accountId, companyId, 'contacts.archive');
      if (!auth.allowed) {
        return json({ error: 'Permission denied: contacts.archive required.' }, 403);
      }
    }

    const archived = await archivePartyRecord(db, companyId, id, viewer.accountId);
    if (!archived) {
      return json({ error: 'Party not found or already archived.' }, 404);
    }

    return json({ success: true, message: 'Party archived successfully.' });
  } catch (error) {
    return failure(error);
  }
}
