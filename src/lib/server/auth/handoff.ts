import { encryptAes, decryptAes } from '$lib/server/utils';
import { env } from '$env/dynamic/private';

const HANDOFF_TTL_MS = 60 * 1000; // 1min

function getSecret(): string {
  if (!env.AUTH_SECRET) throw new Error('AUTH_SECRET is not set');
  return env.AUTH_SECRET;
}

type HandoffData = {
  sessionToken: string;
  expiresAt: number;
};

export async function createHandoffToken(sessionToken: string | undefined): Promise<string | null> {
  if (!sessionToken) {
    return null;
  }

  const data: HandoffData = {
    sessionToken,
    expiresAt: Date.now() + HANDOFF_TTL_MS
  };

  return encryptAes(JSON.stringify(data), getSecret());
}

export async function decryptHandoffToken(token: string): Promise<HandoffData | null> {
  const json = await decryptAes(token, getSecret());
  if (!json) {
    return null;
  }

  try {
    const data = JSON.parse(json) as HandoffData;
    if (data.expiresAt < Date.now()) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
