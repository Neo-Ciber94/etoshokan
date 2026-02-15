export function getCookie(name: string): string | undefined {
	const encodedName = encodeURIComponent(name) + '=';
	const cookies = document.cookie.split('; ');

	for (const cookie of cookies) {
		if (cookie.startsWith(encodedName)) {
			return decodeURIComponent(cookie.slice(encodedName.length));
		}
	}

	return undefined;
}

export function setCookie(name: string, value: string, durationMs?: number): void {
	let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/`;

	if (durationMs !== undefined) {
		const expires = new Date(Date.now() + durationMs).toUTCString();
		cookie += `; expires=${expires}`;
	}

	document.cookie = cookie;
}
