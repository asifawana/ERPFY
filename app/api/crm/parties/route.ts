import { database, failure, json, body } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { authorize } from '@/lib/core/authorization';
import { requireCompanyAccess } from '@/lib/core/company';
import {
  listParties,
  createPartyRecord,
} from '@/plugins/erpfy.contacts_crm/src/services/party-service';
import type { PartyType, PartyRoleKey } from '@/plugins/erpfy.contacts_crm/src/contracts/types';

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
      const auth = await authorize(db, viewer.accountId, companyId, 'contacts.view');
      if (!auth.allowed) {
        return json({ error: 'Permission denied: contacts.view required.' }, 403);
      }
    }

    const search = url.searchParams.get('search') || undefined;
    const partyType = (url.searchParams.get('partyType') as PartyType) || undefined;
    const roleKey = url.searchParams.get('roleKey') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 50;
    const offset = url.searchParams.get('offset') ? Number(url.searchParams.get('offset')) : 0;

    const result = await listParties(db, companyId, {
      search,
      partyType,
      roleKey,
      status,
      limit,
      offset,
    });

    return json({ success: true, ...result });
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
      const auth = await authorize(db, viewer.accountId, companyId, 'contacts.create');
      if (!auth.allowed) {
        return json({ error: 'Permission denied: contacts.create required.' }, 403);
      }
    }

    const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : '';
    if (!displayName) {
      return json({ error: 'displayName is required.' }, 400);
    }

    const rawType = typeof data.partyType === 'string' ? data.partyType.trim().toLowerCase() : 'person';
    const partyType: PartyType = rawType === 'organization' || rawType === 'household' ? rawType : 'person';

    const initialRoles = Array.isArray(data.initialRoles)
      ? (data.initialRoles as PartyRoleKey[])
      : undefined;

    const party = await createPartyRecord(
      db,
      companyId,
      {
        partyType,
        displayName,
        legalName: typeof data.legalName === 'string' ? data.legalName : undefined,
        firstName: typeof data.firstName === 'string' ? data.firstName : undefined,
        middleName: typeof data.middleName === 'string' ? data.middleName : undefined,
        lastName: typeof data.lastName === 'string' ? data.lastName : undefined,
        primaryEmail: typeof data.primaryEmail === 'string' ? data.primaryEmail : undefined,
        primaryPhone: typeof data.primaryPhone === 'string' ? data.primaryPhone : undefined,
        primaryMobile: typeof data.primaryMobile === 'string' ? data.primaryMobile : undefined,
        website: typeof data.website === 'string' ? data.website : undefined,
        taxIdentifier: typeof data.taxIdentifier === 'string' ? data.taxIdentifier : undefined,
        registrationIdentifier:
          typeof data.registrationIdentifier === 'string' ? data.registrationIdentifier : undefined,
        preferredLanguage:
          typeof data.preferredLanguage === 'string' ? data.preferredLanguage : undefined,
        preferredCurrency:
          typeof data.preferredCurrency === 'string' ? data.preferredCurrency : undefined,
        source: typeof data.source === 'string' ? data.source : undefined,
        ownerUserId: typeof data.ownerUserId === 'string' ? data.ownerUserId : undefined,
        customFields:
          data.customFields && typeof data.customFields === 'object' && !Array.isArray(data.customFields)
            ? (data.customFields as Record<string, unknown>)
            : undefined,
        initialRoles,
      },
      viewer.accountId,
    );

    return json({ success: true, party });
  } catch (error) {
    return failure(error);
  }
}
