import { type BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { deeplinkHandoff, exchangeToken } from './endpoints';
import { getAccountFromCtx } from '../utils';

const IGNORE_ROUTES = [
	'/callback/:id',
	'/sign-in',
	'/sign-out',
	'/deeplink-handoff',
	'/exchange-token'
];

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
					matcher: (ctx) => {
						const pathname = ctx.path || '';
						return !IGNORE_ROUTES.some((r) => pathname.startsWith(r));
					},
					handler: handleCheckGoogleTokens()
				}
			]
		}
	};
}

function handleCheckGoogleTokens() {
	return createAuthMiddleware(async (ctx) => {
		const accountData = await getAccountFromCtx(ctx);

		if (accountData) {
			return;
		}

		// Logout if cannot get account data, we remove all the auth cookies
		for (const cookie of Object.values(ctx.context.authCookies)) {
			ctx.setCookie(cookie.name, '', {
				...cookie.attributes,
				expires: new Date(),
				maxAge: 0
			});
		}
	});
}
