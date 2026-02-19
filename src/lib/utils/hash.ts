export async function hashSha1(value: ArrayBuffer) {
	const result = await crypto.subtle.digest('SHA-1', value);
	const hex = toHex(result);
	return btoa(hex);
}

function toHex(buffer: ArrayBuffer) {
	const array = Array.from(new Uint8Array(buffer));
	const hex = array.map((b) => b.toString(16).padStart(2, '0')).join('');
	return hex;
}
