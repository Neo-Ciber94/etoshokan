import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { googleAuthPlugin } from './plugins';

const MAX_SESSION_DURATION = 60 * 60 * 24 * 365; // 1 year
const SESSION_REFRESH = 60 * 5; //5 min

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	session: {
		expiresIn: MAX_SESSION_DURATION,
		updateAge: SESSION_REFRESH,
		freshAge: 0,
		cookieCache: {
			enabled: true,
			refreshCache: true,
			maxAge: MAX_SESSION_DURATION,
			version: '1'
		}
	},
	plugins: [googleAuthPlugin(), sveltekitCookies(getRequestEvent)],
	account: {
		storeAccountCookie: true,
		storeStateStrategy: 'cookie'
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
