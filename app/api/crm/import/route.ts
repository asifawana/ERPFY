import { database, failure, json, body } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { authorize } from '@/lib/core/authorization';
import { requireCompanyAccess } from '@/lib/core/company';
import {
  parseCsvContent,
  previewPartyImport,
  executePartyImport,
  type ImportPreviewRow,
} from '@/plugins/erpfy.contacts_crm/src/services/import-export-service';

export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const data = await body(request, 5 * 1024 * 1024);
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

    const action = typeof data.action === 'string' ? data.action : 'preview';

    if (action === 'preview') {
      const csvString = typeof data.csv === 'string' ? data.csv : '';
      if (!csvString) {
        return json({ error: 'CSV content is required.' }, 400);
      }

      const { rows } = parseCsvContent(csvString);
      const rawMap = (data.columnMap && typeof data.columnMap === 'object' && !Array.isArray(data.columnMap)
        ? (data.columnMap as Record<string, string>)
        : {}) as Record<string, string>;

      const columnMap = {
        displayName: rawMap.displayName || 'Display Name',
        partyType: rawMap.partyType || 'Type',
        legalName: rawMap.legalName || 'Legal Name',
        email: rawMap.email || 'Email',
        phone: rawMap.phone || 'Phone',
        mobile: rawMap.mobile || 'Mobile',
        taxId: rawMap.taxId || 'Tax ID',
        roleKey: rawMap.roleKey || 'Roles',
      };

      const preview = await previewPartyImport(db, companyId, rows, columnMap);
      return json({ success: true, preview });
    }

    if (action === 'execute') {
      const previewRows = Array.isArray(data.previewRows)
        ? (data.previewRows as ImportPreviewRow[])
        : [];

      if (previewRows.length === 0) {
        return json({ error: 'previewRows is required.' }, 400);
      }

      const skipDuplicates = data.skipDuplicates !== false;
      const result = await executePartyImport(
        db,
        companyId,
        previewRows,
        viewer.accountId,
        skipDuplicates,
      );

      return json({ success: true, ...result });
    }

    return json({ error: 'Invalid action.' }, 400);
  } catch (error) {
    return failure(error);
  }
}
