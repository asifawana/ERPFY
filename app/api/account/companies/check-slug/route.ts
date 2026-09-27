import { checkSlugAvailability } from '@/lib/core/company';
import { database, failure, json } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';

export async function GET(request: Request) {
  try {
    const db = database();
    await requireViewer(db, request.headers);
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') || '';
    const result = await checkSlugAvailability(db, slug);
    return json(result);
  } catch (error) {
    return failure(error);
  }
}
