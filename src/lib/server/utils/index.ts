const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;

async function deriveKey(secret: string): Promise<CryptoKey> {
	const encoded = new TextEncoder().encode(secret);
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);

	return crypto.subtle.importKey('raw', hashBuffer, { name: ALGORITHM }, false, [
		'encrypt',
		'decrypt'
	]);
}

export async function encryptAes(value: string, secret: string): Promise<string> {
	const key = await deriveKey(secret);
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const encoded = new TextEncoder().encode(value);

	// AES-GCM in Web Crypto appends the 16-byte auth tag automatically
	const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);

	const result = new Uint8Array(IV_LENGTH + encrypted.byteLength);
	result.set(iv, 0);
	result.set(new Uint8Array(encrypted), IV_LENGTH);

	return btoa(String.fromCharCode(...result))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

export async function decryptAes(encoded: string, secret: string): Promise<string | null> {
	try {
		const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
		const buf = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

		// IV (12) + tag (16) minimum
		if (buf.length < IV_LENGTH + 16) {
			return null;
		}

		const iv = buf.subarray(0, IV_LENGTH);
		const encrypted = buf.subarray(IV_LENGTH); // tag is already appended inside

		const key = await deriveKey(secret);

		const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, encrypted);

		return new TextDecoder().decode(decrypted);
	} catch {
		return null;
	}
}
