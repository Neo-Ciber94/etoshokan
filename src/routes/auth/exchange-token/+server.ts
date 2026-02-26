import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { decryptHandoffToken } from '$lib/server/auth/handoff';
import { SESSION_DURATION_SECONDS } from '$lib/constants';
import { SESSION_COOKIE_NAME } from '$lib/server/auth/session-cookie';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const token = url.searchParams.get('token');

  if (!token) {
    console.error('Token to exchange not found');
    redirect(302, '/');
  }

  const data = await decryptHandoffToken(token);

  if (!data) {
    console.error('Failed to decrypt handoff token');
    redirect(302, '/');
  }

  cookies.set(SESSION_COOKIE_NAME, data.sessionToken, {
    path: '/',
    httpOnly: true,
    secure: !dev,
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS
  });

  redirect(302, '/');
};
