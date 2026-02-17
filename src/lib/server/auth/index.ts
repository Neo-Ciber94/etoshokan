import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { SESSION_DURATION_SECONDS } from '$lib/constants';
import type { Account } from 'better-auth';
import { setGoogleTokenCookies } from './googleAuth';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	session: {
		cookieCache: {
			enabled: true,
			maxAge: SESSION_DURATION_SECONDS
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)],
	socialProviders: {
		google: {
			accessType: 'offline',
			prompt: 'select_account+consent',
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
			scope: ['https://www.googleapis.com/auth/drive.file']
		}
	},
	databaseHooks: {
		account: {
			create: {
				after: async (account) => {
					storeTokenCookies(account);
				}
			},
			update: {
				after: async (account) => {
					storeTokenCookies(account);
				}
			}
		}
	}
});

function storeTokenCookies(account: Account | Partial<Account>) {
	if (!account.accessToken) {
		return;
	}
	try {
		const event = getRequestEvent();
		const secret = env.BETTER_AUTH_SECRET;
		const accessTokenExpiresIn = account.accessTokenExpiresAt
			? Math.floor((new Date(account.accessTokenExpiresAt).getTime() - Date.now()) / 1000)
			: 3600;

		setGoogleTokenCookies({
			event,
			secret,
			accessToken: account.accessToken,
			accessTokenExpiresIn: accessTokenExpiresIn,
			refreshToken: account.refreshToken ?? ''
		});
	} catch (err) {
		console.error(err);
	}
}
