import { database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { getAuthorizedTenantAppNavigation } from '@/lib/eap/installation';

function queryParam(request: Request, key: string): string | null {
  const value = new URL(request.url).searchParams.get(key);
  return value && value.length <= 128 ? value : null;
}

export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const companyId = queryParam(request, 'companyId');

    if (!companyId) {
      return json({ navigation: [] });
    }

    const navigation = await getAuthorizedTenantAppNavigation(
      db,
      viewer.accountId,
      companyId,
    );

    return json({ navigation });
  } catch (error) {
    return failure(error);
  }
}
