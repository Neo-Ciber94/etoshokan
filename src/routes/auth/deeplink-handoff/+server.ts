import { redirect } from '@sveltejs/kit';
import { createHandoffToken } from '$lib/server/auth/handoff';
import { SESSION_COOKIE_NAME } from '$lib/server/auth/session-cookie';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ cookies, locals }) => {
  const session = await locals.auth();

  if (!session) {
    console.error('No session found for deeplink handoff');
    redirect(302, '/');
  }

  const sessionToken = cookies.get(SESSION_COOKIE_NAME);

  if (!sessionToken) {
    console.error('Session token cookie not found');
    redirect(302, '/');
  }

  const handoffToken = await createHandoffToken(sessionToken);

  if (!handoffToken) {
    console.error('Failed to create handoff token');
    redirect(302, '/');
  }

  redirect(302, `etoshokan://auth/callback?token=${handoffToken}`);
};
