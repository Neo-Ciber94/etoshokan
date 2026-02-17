import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
	return createHash('sha256').update(secret).digest();
}

export function encryptAes(value: string, secret: string): string {
	const key = deriveKey(secret);
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	const encrypted = Buffer.concat([cipher.update(value, 'utf-8'), cipher.final()]);
	const tag = cipher.getAuthTag();

	return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptAes(encoded: string, secret: string): string | null {
	try {
		const buf = Buffer.from(encoded, 'base64url');

		if (buf.length < IV_LENGTH + TAG_LENGTH) {
			return null;
		}

		const iv = buf.subarray(0, IV_LENGTH);
		const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
		const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);

		const key = deriveKey(secret);
		const decipher = createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(tag);

		const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
		return decrypted.toString('utf-8');
	} catch {
		return null;
	}
}
