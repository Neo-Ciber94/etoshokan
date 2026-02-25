import { getRequestEvent } from '$app/server';
import { logger, type BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import {
	deleteGoogleTokenCookies,
	setGoogleTokenCookies,
	validateGoogleTokens
} from '../googleAuth';
import { deeplinkHandoff, exchangeToken } from './endpoints';

export function googleAuthPlugin(): BetterAuthPlugin {
	return {
		id: 'google-auth',
		endpoints: {
			deeplinkHandoff,
			exchangeToken
		},
		hooks: {
			after: [
				{
					matcher: (ctx) => ctx.path != null && ctx.path.startsWith('/callback/:id'),
					handler: handleGoogleCallback()
				},
				{
					matcher: (ctx) => {
						const pathname = ctx.path;
						//return true;

						if (!pathname) {
							return false;
						}
						return !['/callback/:id', '/sign-in', '/deeplink-handoff', '/exchange-token'].some(
							(p) => pathname.startsWith(p)
						);
					},
					handler: handleCheckGoogleTokens()
				}
			]
		}
	};
}

function handleGoogleCallback() {
	return createAuthMiddleware(async (ctx) => {
		if (ctx.path === '/callback/:id') {
			const userId = ctx.context.newSession?.user.id || ctx.context.session?.user?.id;

			if (userId == null) {
				// throw ctx.error('UNAUTHORIZED', {
				// 	message: 'Failed to get user id'
				// });
				console.error('Failed to get user id');
				return;
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

			const accessTokenExpiration = Math.floor(
				(new Date(account.accessTokenExpiresAt).getTime() - Date.now()) / 1000
			);

			await setGoogleTokenCookies({
				authContext: ctx,
				accessToken: account.accessToken,
				accessTokenExpiresIn: accessTokenExpiration,
				refreshToken: account.refreshToken
			});
		}
	});
}

function handleCheckGoogleTokens() {
	return createAuthMiddleware(async (ctx) => {
		const pathname = ctx.path;

		if (pathname.startsWith('/sign-out')) {
			deleteGoogleTokenCookies(ctx);
		} else {
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
			const authCookies = Object.values(ctx.context.authCookies);
			deleteGoogleTokenCookies(ctx);

			// For some reason signOut({ headers }) throw randomly an error
			for (const cookie of authCookies) {
				ctx.setCookie(cookie.name, '', {
					...cookie.attributes,
					maxAge: 0,
					expires: new Date(),
					path: '/'
				});
			}
		}
	});
}
