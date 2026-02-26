import { createAuthEndpoint } from 'better-auth/api';
import { createHandoffToken, decryptHandoffToken } from '../handoff';

export const deeplinkHandoff = createAuthEndpoint(
	'/deeplink-handoff',
	{ method: 'GET' },
	async (ctx) => {
		const { sessionToken, sessionData, accountData } = ctx.context.authCookies;

		const handoffToken = await createHandoffToken({
			sessionToken: ctx.getCookie(sessionToken.name) ?? undefined,
			sessionData: ctx.getCookie(sessionData.name) ?? undefined,
			accountData: ctx.getCookie(accountData.name) ?? undefined
		});

		if (!handoffToken) {
			console.error('Failed to create handoff token');
			throw ctx.redirect('/');
		}

		throw ctx.redirect(`etoshokan://auth/callback?token=${handoffToken}`);
	}
);

export const exchangeToken = createAuthEndpoint(
	'/exchange-token',
	{ method: 'POST' },
	async (ctx) => {
		const token = ctx.body?.token;

		if (!token) {
			console.error('Token to exchange not found');
			return new Response(null, { status: 403 });
		}

		try {
			const data = await decryptHandoffToken(token);

			if (!data) {
				console.error('Failed to decrypt handoff token');
				return new Response(null, { status: 403 });
			}

			const { sessionToken, sessionData, accountData } = ctx.context.authCookies;

			ctx.setCookie(sessionToken.name, data.sessionToken, {
				...sessionToken.attributes
			});

			ctx.setCookie(sessionData.name, data.sessionData, {
				...sessionData.attributes
			});

			ctx.setCookie(accountData.name, data.accountData, {
				...accountData.attributes
			});
		} catch (err) {
			console.error('Failed to exchange token', err);
			return new Response(null, { status: 500 });
		}
	}
);
