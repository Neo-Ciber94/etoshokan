import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { SESSION_DURATION_SECONDS } from '$lib/constants';
import { googleAuthPlugin } from './plugins';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	session: {
		cookieCache: {
			enabled: true,
			maxAge: SESSION_DURATION_SECONDS
		}
	},
	plugins: [googleAuthPlugin(), sveltekitCookies(getRequestEvent)],
	account: {
		storeStateStrategy: 'cookie',
		storeAccountCookie: true
	},
	socialProviders: {
		google: {
			accessType: 'offline',
			prompt: 'select_account consent',
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
			scope: ['https://www.googleapis.com/auth/drive.file']
		}
	}
});
