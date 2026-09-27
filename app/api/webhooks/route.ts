import { database, failure, json, body, queryParam, ApiError } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { requireCompanyAccess } from '@/lib/core/company';
import {
  getCompanyWebhooks,
  registerWebhook,
  deleteWebhook,
  dispatchWebhook,
} from '@/lib/webhooks/dispatcher';

/**
 * GET /api/webhooks?companyId=xxx
 * Lists registered webhooks for a company.
 */
export async function GET(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const companyId = queryParam(request, 'companyId');

    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    await requireCompanyAccess(db, viewer.accountId, companyId);
    const webhooks = await getCompanyWebhooks(db, companyId);

    return json({ ok: true, webhooks });
  } catch (error) {
    return failure(error);
  }
}

/**
 * POST /api/webhooks
 * Registers, deletes, or tests a webhook endpoint.
 */
export async function POST(request: Request) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const payload = await body(request);

    const companyId = typeof payload.companyId === 'string' ? payload.companyId.trim() : '';
    const action = typeof payload.action === 'string' ? payload.action.trim() : '';

    if (!companyId) {
      throw new ApiError(400, 'Company ID is required.');
    }

    await requireCompanyAccess(db, viewer.accountId, companyId);

    if (action === 'register') {
      const url = typeof payload.url === 'string' ? payload.url.trim() : '';
      if (!url) {
        throw new ApiError(400, 'Webhook payload URL is required.');
      }
      const events = Array.isArray(payload.events)
        ? (payload.events as string[])
        : ['*'];
      const result = await registerWebhook(db, companyId, url, events);
      if (!result.success) {
        throw new ApiError(400, result.error || 'Failed to register webhook.');
      }
      return json({ ok: true, webhook: result.webhook }, 201);
    }

    if (action === 'delete') {
      const webhookId = typeof payload.webhookId === 'string' ? payload.webhookId.trim() : '';
      if (!webhookId) {
        throw new ApiError(400, 'Webhook ID is required.');
      }
      const result = await deleteWebhook(db, companyId, webhookId);
      return json({ ok: true, success: result.success });
    }

    if (action === 'test') {
      const testEvent = typeof payload.testEvent === 'string' ? payload.testEvent : 'test.ping';
      const testPayload = payload.testPayload || {
        message: 'Hello from ERPfy Webhook Engine!',
        timestamp: new Date().toISOString(),
      };
      const logs = await dispatchWebhook(db, companyId, testEvent, testPayload);
      return json({ ok: true, logs });
    }

    throw new ApiError(400, `Unknown action: ${action}`);
  } catch (error) {
    return failure(error);
  }
}
