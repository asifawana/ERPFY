import { completeSecondFactor } from '@/lib/core/auth';
import { body, database, failure, field, json } from '@/lib/core/server';
import { sessionCookie, SESSION_ABSOLUTE_MS } from '@/lib/core/session';

export async function POST(request: Request) {
  try {
    const db = database();
    const data = await body(request);

    const result = await completeSecondFactor(db, request, {
      challengeToken: field(data, 'challengeToken', {
        max: 200,
        label: 'sign-in request',
      }),
      code: field(data, 'code', { max: 32, label: 'code' }),
      useRecoveryCode: data.useRecoveryCode === true,
      trustDevice: data.trustDevice === true,
    });

    const response = json({ signedIn: true });
    response.headers.append(
      'Set-Cookie',
      sessionCookie(
        request,
        result.token,
        Math.floor(SESSION_ABSOLUTE_MS / 1000),
      ),
    );
    return response;
  } catch (error) {
    return failure(error);
  }
}
