import { getRequestEvent } from '$app/server';
import { logger, type BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware, getSessionFromCtx, signOut } from 'better-auth/api';
import { setGoogleTokenCookies, validateGoogleTokens } from './googleAuth';

export function googleAuthPlugin(): BetterAuthPlugin {
	return {
		id: 'google-auth',
		hooks: {
			after: [
				{
					matcher: (ctx) => ctx.path.startsWith('/callback/:id'),
					handler: handleGoogleCallback()
				},
				{
					matcher: () => true,
					handler: handleCheckGoogleTokens()
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
				throw ctx.error('UNAUTHORIZED', {
					message: 'Failed to get user id'
				});
			}

			const accounts = await ctx.context.internalAdapter.findAccountByUserId(userId);
			const account = accounts[0]; // Cannot be null

			if (accounts.length == 0 || account == null) {
				throw ctx.error('UNAUTHORIZED', {
					message: 'Failed to get account'
				});
			}

			if (!account.accessToken || !account.refreshToken || !account.accessTokenExpiresAt) {
				throw ctx.error('UNAUTHORIZED', {
					message: 'Missing google auth tokens'
				});
			}

			setGoogleTokenCookies({
				authContext: ctx,
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
		const isTokenValid = await validateGoogleTokens(event, ctx);

		if (isTokenValid) {
			return;
		}

		logger.warn('Invalid google tokens, login out user');
		const headers = event.request.headers;
		await signOut({ headers });
	});
}

function expiresAtToSeconds(expiresAt: Date): number {
	return Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
}
