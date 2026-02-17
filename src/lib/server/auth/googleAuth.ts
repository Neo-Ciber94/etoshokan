import { encryptAes, decryptAes } from '$lib/server/utils';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

const GOOGLE_ACCESS_TOKEN_COOKIE = 'google_access_token';
const GOOGLE_REFRESH_TOKEN_COOKIE = 'google_refresh_token';

type GoogleTokenResponse = {
	access_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
	id_token?: string;
};

export async function getGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
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

type SetCookieTokenCookiesArgs = {
	event: RequestEvent;
	accessToken: string;
	accessTokenExpiresIn: number;
	refreshToken: string;
	secret: string;
};

export function setGoogleTokenCookies(args: SetCookieTokenCookiesArgs) {
	const { accessToken, accessTokenExpiresIn, event, refreshToken, secret } = args;

	event.cookies.set(GOOGLE_ACCESS_TOKEN_COOKIE, encryptAes(accessToken, secret), {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: accessTokenExpiresIn
	});

	event.cookies.set(GOOGLE_REFRESH_TOKEN_COOKIE, encryptAes(refreshToken, secret), {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 365
	});
}

export function getGoogleAccessTokenFromRequest(event: RequestEvent): string | null {
	const encoded = event.cookies.get(GOOGLE_ACCESS_TOKEN_COOKIE);
	if (!encoded) {
		return null;
	}
	return decryptAes(encoded, env.BETTER_AUTH_SECRET!);
}

export function getGoogleRefreshTokenFromRequest(event: RequestEvent): string | null {
	const encoded = event.cookies.get(GOOGLE_REFRESH_TOKEN_COOKIE);
	if (!encoded) {
		return null;
	}
	return decryptAes(encoded, env.BETTER_AUTH_SECRET!);
}
