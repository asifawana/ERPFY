import { signIn } from '@/lib/core/auth';
import {
  ApiError,
  body,
  database,
  emailField,
  failure,
  json,
} from '@/lib/core/server';
import { sessionCookie, SESSION_ABSOLUTE_MS } from '@/lib/core/session';

export async function POST(request: Request) {
  try {
    const db = database();
    const data = await body(request);
    const password = data.password;
    // Keep existing shorter passwords usable, but never trim or coerce a secret.
    if (typeof password !== 'string' || !password || password.length > 200) {
      throw new ApiError(400, 'Please enter a valid password.');
    }

    const result = await signIn(db, request, {
      email: emailField(data, 'email'),
      password,
    });

    if (result.outcome === 'second-factor') {
      // The challenge token is returned to the page rather than set as a cookie: it is not
      // a session, and it must not survive a refresh as though it were one.
      return json({
        signedIn: false,
        secondFactorRequired: true,
        challengeToken: result.challengeToken,
        expiresAt: result.expiresAt,
      });
    }

    const response = json({ signedIn: true, secondFactorRequired: false });
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
