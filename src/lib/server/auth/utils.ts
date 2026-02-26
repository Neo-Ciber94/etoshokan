import type { RequestEvent } from '@sveltejs/kit';
import { accountSchema, type Account, type GenericEndpointContext } from 'better-auth';
import { symmetricDecodeJWT } from 'better-auth/crypto';
import { auth } from '.';

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

async function decodeAccountCookie(accountCookie: string, secret: string) {
	const accountData: Account | null = await symmetricDecodeJWT(
		accountCookie,
		secret,
		'better-auth-account'
	);

	console.log({ accountData });

	// Convert date strings to date
	if (accountData) {
		if (accountData.createdAt) {
			accountData.createdAt = new Date(accountData.createdAt);
		}

		if (accountData.updatedAt) {
			accountData.updatedAt = new Date(accountData.updatedAt);
		}

		if (accountData.accessTokenExpiresAt) {
			accountData.accessTokenExpiresAt = new Date(accountData.accessTokenExpiresAt);
		}
	}

	console.log({ accountData });
	const result = accountSchema.safeParse(accountData);

	if (!result.success) {
		console.error(result.error);
		return null;
	}

	return result.data;
}
