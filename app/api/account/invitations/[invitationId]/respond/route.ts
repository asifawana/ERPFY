import { database, failure, json, body } from '@/lib/core/server';
import { requireViewer } from '@/lib/core/viewer';
import { ApiError } from '@/lib/core/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ invitationId: string }> },
) {
  try {
    const db = database();
    const viewer = await requireViewer(db, request.headers);
    const { invitationId } = await context.params;
    const payload = await body(request);
    const action = (typeof payload.action === 'string' ? payload.action : '').trim().toLowerCase();

    if (action !== 'accept' && action !== 'decline') {
      throw new ApiError(400, "Action must be either 'accept' or 'decline'.");
    }

    // Verify invitation exists and belongs to this user's verified email
    const invitation = await db
      .prepare(
        `SELECT id, company_id, email, role, status, expires_at
           FROM core_invitations
          WHERE id = ?1 AND email = ?2 AND status = 'pending'
          LIMIT 1`,
      )
      .bind(invitationId, viewer.email)
      .first<{
        id: string;
        company_id: string;
        email: string;
        role: string;
        status: string;
        expires_at: number;
      }>();

    if (!invitation) {
      throw new ApiError(404, 'Invitation not found or no longer pending.');
    }

    if (invitation.expires_at <= Date.now()) {
      await db
        .prepare(`UPDATE core_invitations SET status = 'expired' WHERE id = ?1`)
        .bind(invitationId)
        .run();
      throw new ApiError(410, 'This invitation has expired.');
    }

    const now = Date.now();

    if (action === 'accept') {
      // Add membership and mark accepted in atomic batch
      await db.batch([
        db
          .prepare(
            `INSERT INTO core_memberships (company_id, account_id, role, status, branch_scope, joined_at)
             VALUES (?1, ?2, ?3, 'active', '', ?4)
             ON CONFLICT (company_id, account_id)
             DO UPDATE SET role = excluded.role, status = 'active'`,
          )
          .bind(invitation.company_id, viewer.accountId, invitation.role, now),
        db
          .prepare(
            `UPDATE core_invitations
                SET status = 'accepted', responded_at = ?2
              WHERE id = ?1`,
          )
          .bind(invitationId, now),
        db
          .prepare(
            `INSERT INTO core_company_visits (account_id, company_id, last_opened_at)
             VALUES (?1, ?2, ?3)
             ON CONFLICT (account_id, company_id)
             DO UPDATE SET last_opened_at = excluded.last_opened_at`,
          )
          .bind(viewer.accountId, invitation.company_id, now),
      ]);

      return json({ ok: true, action: 'accepted', companyId: invitation.company_id });
    } else {
      // Decline invitation
      await db
        .prepare(
          `UPDATE core_invitations
              SET status = 'declined', responded_at = ?2
            WHERE id = ?1`,
        )
        .bind(invitationId, now)
        .run();

      return json({ ok: true, action: 'declined' });
    }
  } catch (error) {
    return failure(error);
  }
}
