import { encryptAes, decryptAes } from '$lib/server/utils';
import { env } from '$env/dynamic/private';
import z from 'zod';

const HANDOFF_TTL_MS = 60 * 1000; // 1min

const handoffSchema = z.object({
	sessionToken: z.string(),
	sessionData: z.string(),
	accountData: z.string(),
	expiresAt: z.number()
});

type HandoffData = z.output<typeof handoffSchema>;

type HandOffTokenParams = {
	sessionToken: string | undefined;
	sessionData: string | undefined;
	accountData: string | undefined;
};

export async function createHandoffToken({
	sessionToken,
	sessionData,
	accountData
}: HandOffTokenParams): Promise<string | null> {
	if (!sessionToken || !sessionData || !accountData) {
		return null;
	}

	const data: HandoffData = {
		sessionToken,
		sessionData,
		accountData,
		expiresAt: Date.now() + HANDOFF_TTL_MS
	};

	return encryptAes(JSON.stringify(data), env.BETTER_AUTH_SECRET);
}

export async function decryptHandoffToken(token: string): Promise<HandoffData | null> {
	const json = await decryptAes(token, env.BETTER_AUTH_SECRET);

	if (!json) {
		return null;
	}

	try {
		const result = handoffSchema.safeParse(JSON.parse(json));

		if (!result.success) {
			console.error(z.prettifyError(result.error));
			return null;
		}

		const data = result.data;

		if (data.expiresAt < Date.now()) {
			return null;
		}

		return data;
	} catch {
		return null;
	}
}
