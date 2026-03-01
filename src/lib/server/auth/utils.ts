import type { RequestEvent } from '@sveltejs/kit';
import { type Account, type GenericEndpointContext } from 'better-auth';
import { symmetricDecodeJWT, symmetricEncodeJWT } from 'better-auth/crypto';
import { auth } from '.';
import { z } from 'zod/v4';
import { env } from '$env/dynamic/private';

export async function getGoogleAccessToken(event: RequestEvent) {
	const context = await auth.$context;
	const cookieName = context.authCookies.accountData.name;
	const accountCookie = event.cookies.get(cookieName);

	if (accountCookie == null) {
		return null;
	}

	const accountData = await getAccountFromCookie(accountCookie);

	if (accountData == null) {
		return null;
	}

	return accountData.accessToken;
}

export async function getAccountFromCtx(ctx: GenericEndpointContext) {
	const accountCookie = ctx.getCookie(ctx.context.authCookies.accountData.name);

	if (accountCookie == null) {
		return null;
	}

	const secret = ctx.context.secret;
	return decodeAccountCookie(accountCookie, secret);
}

export async function validateAccountData(
	accountData: Account,
	ctx: GenericEndpointContext
): Promise<boolean> {
	if (accountData.accessTokenExpiresAt == null) {
		console.warn("Access token don't have an expiration date");
		return false;
	}

	const isExpired = new Date(accountData.accessTokenExpiresAt).getTime() <= Date.now();

	if (!isExpired) {
		return true;
	}

	try {
		// const newToken = await refreshToken({
		// 	headers: ctx.headers,
		// 	body: {
		// 		userId: accountData.userId,
		// 		providerId: 'google'
		// 	}
		// });

		const newToken = await refreshGoogleAccessToken(accountData.refreshToken || '');
		const expiresAt = new Date(Date.now() + newToken.expires_in * 1000);

		const accountDataCookie = ctx.context.authCookies.accountData;
		accountData.accessToken = newToken.access_token;
		accountData.accessTokenExpiresAt = expiresAt;
		const jwt = await symmetricEncodeJWT(accountData, ctx.context.secret, 'better-auth-account');
		ctx.setCookie(accountDataCookie.name, jwt, accountDataCookie.attributes);
		console.log('Refresh account data');
		return true;
	} catch (err) {
		console.error('Failed to refresh account token', err);
		return false;
	}
}

export async function getAccountFromCookie(accountCookie: string) {
	const context = await auth.$context;
	const secret = context.secret;
	return decodeAccountCookie(accountCookie, secret);
}

// copied from: https://github.com/better-auth/better-auth/blob/074478e928624ca038a579817b47174ac15ef56a/packages/core/src/db/schema/account.ts
const accountSchema = z.object({
	id: z.string(),
	providerId: z.string(),
	accountId: z.string(),
	userId: z.coerce.string(),
	accessToken: z.string().nullish(),
	refreshToken: z.string().nullish(),
	idToken: z.string().nullish(),
	createdAt: z.iso
		.datetime()
		.transform((x) => new Date(x))
		.default(() => new Date()),
	updatedAt: z.iso
		.datetime()
		.transform((x) => new Date(x))
		.default(() => new Date()),

	/**
	 * Access token expires at
	 */
	accessTokenExpiresAt: z.iso
		.datetime()
		.transform((x) => new Date(x))
		.nullish(),
	/**
	 * Refresh token expires at
	 */
	refreshTokenExpiresAt: z.iso
		.datetime()
		.transform((x) => new Date(x))
		.nullish(),
	/**
	 * The scopes that the user has authorized
	 */
	scope: z.string().nullish(),
	/**
	 * Password is only stored in the credential provider
	 */
	password: z.string().nullish()
});

async function decodeAccountCookie(accountCookie: string, secret: string) {
	const accountData: Account | null = await symmetricDecodeJWT(
		accountCookie,
		secret,
		'better-auth-account'
	);

	const result = accountSchema.safeParse(accountData);

	if (!result.success) {
		console.error(result.error);
		return null;
	}

	return result.data;
}

type GoogleTokenResponse = {
	access_token: string;
	expires_in: number;
	token_type: string;
	scope?: string;
};

async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			refresh_token: refreshToken,
			grant_type: 'refresh_token'
		})
	});

	if (!res.ok) {
		const errorText = await res.text();
		throw new Error(`Failed to refresh Google token: ${errorText}`);
	}

	return res.json();
}
