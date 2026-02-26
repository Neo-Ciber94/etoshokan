import type { RequestEvent } from '@sveltejs/kit';
import { type Account, type GenericEndpointContext } from 'better-auth';
import { symmetricDecodeJWT } from 'better-auth/crypto';
import { auth } from '.';
import { z } from 'zod/v4';

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
