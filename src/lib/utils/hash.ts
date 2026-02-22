export async function hashSha1(value: ArrayBuffer) {
	const result = await crypto.subtle.digest('SHA-1', value);
	const hex = toHex(result);
	return btoa(hex);
}

export function hashBase64(values: string[]): string {
	let hash = 0;

	for (const value of values) {
		for (let i = 0; i < value.length; i++) {
			hash = (hash * 31 + value.charCodeAt(i)) | 0; // 32-bit int
		}
		hash = (hash * 31 + 0) | 0;
	}

	// convert int32 → 4 bytes
	const bytes = new Uint8Array(4);
	bytes[0] = (hash >>> 24) & 0xff;
	bytes[1] = (hash >>> 16) & 0xff;
	bytes[2] = (hash >>> 8) & 0xff;
	bytes[3] = hash & 0xff;

	// base64
	let binary = '';
	for (const b of bytes) {
		binary += String.fromCharCode(b);
	}

	return btoa(binary);
}

function toHex(buffer: ArrayBuffer) {
	const array = Array.from(new Uint8Array(buffer));
	const hex = array.map((b) => b.toString(16).padStart(2, '0')).join('');
	return hex;
}
