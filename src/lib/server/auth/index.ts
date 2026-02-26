import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { SESSION_DURATION_SECONDS } from '$lib/constants';
import { refreshGoogleAccessToken } from './googleAuth';
import { logger } from '$lib/logging/logger';
import { SESSION_COOKIE_NAME } from './session-cookie';

export const { handle, signIn, signOut } = SvelteKitAuth({
  basePath: '/api/auth',
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          access_type: 'offline',
          prompt: 'select_account consent',
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file'
        }
      }
    })
  ],
  secret: env.AUTH_SECRET,
  trustHost: true,
  session: {
    maxAge: SESSION_DURATION_SECONDS
  },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: !dev
      }
    }
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          access_token_expires_at: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 3600 * 1000
        };
      }

      if (Date.now() < (token.access_token_expires_at as number) - 60_000) {
        return token;
      }

      try {
        const refreshed = await refreshGoogleAccessToken(token.refresh_token as string);
        return {
          ...token,
          access_token: refreshed.access_token,
          access_token_expires_at: Date.now() + refreshed.expires_in * 1000
        };
      } catch (err) {
        logger.error('Failed to refresh Google access token', err);
        return { ...token, error: 'RefreshAccessTokenError' };
      }
    },
    async session({ session, token }) {
      return {
        ...session,
        access_token: token.access_token as string,
        error: token.error as string | undefined
      };
    }
  }
});
