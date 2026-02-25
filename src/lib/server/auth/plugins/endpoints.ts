import { createAuthEndpoint } from 'better-auth/api';
import { dev } from '$app/environment';
import { createHandoffToken, decryptHandoffToken } from '../handoff';
import { GOOGLE_REFRESH_TOKEN_COOKIE, MAX_COOKIE_AGE_SECONDS } from '../constants';
import { SESSION_DURATION_SECONDS } from '$lib/constants';

export const deeplinkHandoff = createAuthEndpoint(
	'/deeplink-handoff',
	{ method: 'GET' },
	async (ctx) => {
		const { sessionToken, sessionData } = ctx.context.authCookies;

		const handoffToken = await createHandoffToken({
			sessionToken: ctx.getCookie(sessionToken.name) ?? undefined,
			sessionData: ctx.getCookie(sessionData.name) ?? undefined,
			googleRefreshToken: ctx.getCookie(GOOGLE_REFRESH_TOKEN_COOKIE) ?? undefined
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
	{ method: 'GET' },
	async (ctx) => {
		const token = ctx.query?.token;

		if (!token) {
			console.error('Token to exchange not found');
			throw ctx.redirect('/');
		}

		const data = await decryptHandoffToken(token);

		if (!data) {
			console.error('Failed to decrypt handoff token');
			throw ctx.redirect('/');
		}

		const { sessionToken, sessionData } = ctx.context.authCookies;

		ctx.setCookie(sessionToken.name, data.sessionToken, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge: SESSION_DURATION_SECONDS
		});

		if (data.sessionData) {
			ctx.setCookie(sessionData.name, data.sessionData, {
				path: '/',
				httpOnly: true,
				secure: !dev,
				sameSite: 'lax',
				maxAge: SESSION_DURATION_SECONDS
			});
		}

		if (data.googleRefreshToken) {
			ctx.setCookie(GOOGLE_REFRESH_TOKEN_COOKIE, data.googleRefreshToken, {
				path: '/',
				httpOnly: true,
				secure: !dev,
				sameSite: 'lax',
				maxAge: MAX_COOKIE_AGE_SECONDS
			});
		}

		throw ctx.redirect('/');
	}
);
