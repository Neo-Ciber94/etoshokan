import { encryptAes, decryptAes } from '$lib/server/utils';
import { env } from '$env/dynamic/private';

const HANDOFF_TTL_MS = 60 * 1000; // 1min

type HandoffData = {
	sessionToken: string;
	sessionData: string | null;
	googleRefreshToken: string | null;
	expiresAt: number;
};

type HandOffTokenParams = {
	sessionToken: string | undefined;
	sessionData: string | undefined;
	googleRefreshToken: string | undefined;
};

export async function createHandoffToken({
	sessionToken,
	sessionData,
	googleRefreshToken
}: HandOffTokenParams): Promise<string | null> {
	if (!sessionToken) return null;

	const data: HandoffData = {
		sessionToken,
		sessionData: sessionData ?? null,
		googleRefreshToken: googleRefreshToken ?? null,
		expiresAt: Date.now() + HANDOFF_TTL_MS
	};

	return encryptAes(JSON.stringify(data), env.BETTER_AUTH_SECRET);
}

export async function decryptHandoffToken(token: string): Promise<HandoffData | null> {
	const json = await decryptAes(token, env.BETTER_AUTH_SECRET);
	if (!json) return null;

	try {
		const data = JSON.parse(json) as HandoffData;
		if (data.expiresAt < Date.now()) return null;
		return data;
	} catch {
		return null;
	}
}
