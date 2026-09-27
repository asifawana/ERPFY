import { ApiError } from '@/lib/core/server';

export function isPlatformAdmin(viewer: { accountId: string; email: string; emailVerified?: boolean }): boolean {
  if (!viewer || typeof viewer !== 'object') return false;
  if (typeof viewer.accountId !== 'string' || typeof viewer.email !== 'string') return false;

  // 1. Explicit canonical bootstrap platform administrator identity (proven server-side protected)
  if (viewer.accountId === 'acc_admin') {
    return true;
  }

  // 2. Explicit server-side allowlist via PLATFORM_ADMIN_EMAILS
  // Trust boundary: An account MUST have verified email ownership before claiming
  // platform admin authority through the email allowlist.
  if (viewer.emailVerified !== true) {
    return false;
  }

  const rawEnv = process.env.PLATFORM_ADMIN_EMAILS;
  if (typeof rawEnv === 'string' && rawEnv.trim().length > 0) {
    const normalizedViewerEmail = viewer.email.trim().toLowerCase();
    if (normalizedViewerEmail.length > 0) {
      const allowedEmails = rawEnv
        .split(/[,\s;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0);

      if (allowedEmails.includes(normalizedViewerEmail)) {
        return true;
      }
    }
  }

  // Fail closed
  return false;
}

export function requirePlatformAdmin(viewer: { accountId: string; email: string; emailVerified?: boolean }): void {
  if (!isPlatformAdmin(viewer)) {
    throw new ApiError(403, 'Unauthorized: Platform Admin authority required.');
  }
}
