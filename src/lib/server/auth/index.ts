import { betterAuth } from 'better-auth';
// import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { SESSION_DURATION_SECONDS } from '$lib/constants';
// import { db } from '$lib/server/db';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	//database: drizzleAdapter(db, { provider: 'sqlite' }),
	//emailAndPassword: { enabled: true },
	session: {
		cookieCache: {
			enabled: true,
			maxAge: SESSION_DURATION_SECONDS,
			version: '1' // change this to invalidate sessions
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
	}
});
