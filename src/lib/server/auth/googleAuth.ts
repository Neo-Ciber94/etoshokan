import { encryptAes, decryptAes } from '$lib/server/utils';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';
import type { AuthContext, MiddlewareContext, MiddlewareOptions } from 'better-auth';
import { logger } from '$lib/logging/logger';
import { dev } from '$app/environment';

const GOOGLE_ACCESS_TOKEN_COOKIE = 'google_access_token';
const GOOGLE_REFRESH_TOKEN_COOKIE = 'google_refresh_token';
const ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 60;
const MAX_COOKIE_AGE_SECONDS = 60 * 60 * 24 * 355; // 1 year
const SECRET = env.BETTER_AUTH_SECRET;

type GoogleTokenResponse = {
	access_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
	id_token?: string;
};

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
	const params = new URLSearchParams({
		client_id: process.env.GOOGLE_CLIENT_ID!,
		client_secret: process.env.GOOGLE_CLIENT_SECRET!,
		refresh_token: refreshToken,
		grant_type: 'refresh_token'
	});

	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: params.toString()
	});

	if (!res.ok) {
		const error = await res.text();
		throw new Error(`Failed to refresh access token: ${error}`);
	}

	const data = (await res.json()) as GoogleTokenResponse;
	return data;
}

export async function revokeGoogleToken(refreshOrAccessToken: string) {
	const res = await fetch(`https://oauth2.googleapis.com/revoke?token=${refreshOrAccessToken}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	});

	if (!res.ok) {
		const error = await res.text();
		throw new Error(`Failed to revoke token: ${error}`);
	}
}

type SetGoogleTokenCookieArgs = {
	authContext: MiddlewareContext<MiddlewareOptions, AuthContext>;
	accessToken: string;
	accessTokenExpiresIn: number;
	refreshToken?: string;
};

export function setGoogleTokenCookies(args: SetGoogleTokenCookieArgs) {
	const { accessToken, accessTokenExpiresIn, authContext, refreshToken } = args;

	console.log('set google tokens');
	authContext.setCookie(GOOGLE_ACCESS_TOKEN_COOKIE, encryptAes(accessToken, SECRET), {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'Lax',
		maxAge: accessTokenExpiresIn - ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS
	});

	if (refreshToken) {
		authContext.setCookie(GOOGLE_REFRESH_TOKEN_COOKIE, encryptAes(refreshToken, SECRET), {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'Lax',
			maxAge: MAX_COOKIE_AGE_SECONDS
		});
	}
}

export function getGoogleAccessToken(event: RequestEvent): string | null {
	const encoded = event.cookies.get(GOOGLE_ACCESS_TOKEN_COOKIE);
	if (!encoded) {
		return null;
	}
	return decryptAes(encoded, SECRET);
}

export function getGoogleRefreshToken(event: RequestEvent): string | null {
	const encoded = event.cookies.get(GOOGLE_REFRESH_TOKEN_COOKIE);
	if (!encoded) {
		return null;
	}
	return decryptAes(encoded, SECRET);
}

export function deleteGoogleTokenCookies(event: RequestEvent) {
	event.cookies.delete(GOOGLE_ACCESS_TOKEN_COOKIE, { path: '/' });
	event.cookies.delete(GOOGLE_REFRESH_TOKEN_COOKIE, { path: '/' });
}

export async function validateGoogleTokens(
	event: RequestEvent,
	authContext: MiddlewareContext<MiddlewareOptions, AuthContext>
) {
	const accessToken = getGoogleAccessToken(event);

	if (accessToken) {
		return true;
	}

	const refreshToken = getGoogleRefreshToken(event);

	if (refreshToken == null) {
		return false;
	}

	try {
		const authTokens = await refreshGoogleAccessToken(refreshToken);

		setGoogleTokenCookies({
			accessToken: authTokens.access_token,
			accessTokenExpiresIn: authTokens.expires_in,
			authContext
		});
		return true;
	} catch (err) {
		logger.error('Failed to refresh access token', err);
		return false;
	}
}
