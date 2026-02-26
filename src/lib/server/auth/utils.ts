import { accountSchema, type GenericEndpointContext } from 'better-auth';
import { symmetricDecodeJWT } from 'better-auth/crypto';

export async function getAccountFromCtx(ctx: GenericEndpointContext) {
	const accountCookie = ctx.getCookie(ctx.context.authCookies.accountData.name);

	if (accountCookie == null) {
		return null;
	}

	const accountData = await symmetricDecodeJWT(
		accountCookie,
		ctx.context.secret,
		'better-auth-account'
	);

	const result = accountSchema.safeParse(accountData);

	if (!result.success) {
		console.error(result.error);
		return null;
	}

	return result.data;
}
