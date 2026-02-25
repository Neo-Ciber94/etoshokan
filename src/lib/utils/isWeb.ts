export function isTauri() {
	if (typeof window === 'undefined') {
		return false;
	}

	return typeof window.__TAURI_INTERNALS__ !== 'undefined';
}

export function isWeb() {
	return !isTauri();
}
