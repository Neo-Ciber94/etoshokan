import { getRequestEvent } from '$app/server';
import { logger, type BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { setGoogleTokenCookies, validateGoogleTokens } from './googleAuth';
import { env } from '$env/dynamic/private';
import { auth } from '.';

export function googleAuthPlugin(): BetterAuthPlugin {
	return {
		id: 'google-auth',
		hooks: {
			before: [
				{
					matcher: () => true,
					handler: handleCheckGoogleTokens()
				}
			],
			after: [
				{
					matcher: (ctx) => ctx.path.startsWith('/callback/:id'),
					handler: handleGoogleCallback()
				}
			]
		}
	};
}

function handleGoogleCallback() {
	return createAuthMiddleware(async (ctx) => {
		if (ctx.path === '/callback/:id') {
			const userId = ctx.context.newSession?.user.id;

			if (userId == null) {
				throw new Error('Failed to get user id');
			}

			const accounts = await ctx.context.internalAdapter.findAccountByUserId(userId);
			const account = accounts[0]; // Cannot be null

			if (accounts.length == 0 || account == null) {
				throw new Error('Failed to get account');
			}

			if (!account.accessToken || !account.refreshToken || !account.accessTokenExpiresAt) {
				throw new Error('Missing google auth tokens');
			}

			setGoogleTokenCookies({
				authContext: ctx,
				secret: env.BETTER_AUTH_SECRET,
				accessToken: account.accessToken,
				accessTokenExpiresIn: expiresAtToSeconds(account.accessTokenExpiresAt),
				refreshToken: account.refreshToken
			});
		}
	});
}

function handleCheckGoogleTokens() {
	return createAuthMiddleware(async (ctx) => {
		const IGNORE_PATHS = ['/callback/:id', '/sign-in', '/logout'];

		if (IGNORE_PATHS.some((p) => ctx.path.startsWith(p))) {
			return;
		}

		const session = await getSessionFromCtx(ctx);
		const userId = session?.user.id;

		if (userId == null) {
			return;
		}

		const event = getRequestEvent();

		if (validateGoogleTokens(event)) {
			return;
		}

		logger.warn('Invalid google tokens, login out user');
		const headers = event.request.headers;
		await auth.api.signOut({ headers });
	});
}

function expiresAtToSeconds(expiresAt: Date): number {
	return Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
}
