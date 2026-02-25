export function isTauri() {
	if (typeof window === 'undefined') {
		return false;
	}

	return '__TAURI_INTERNALS__' in window;
}

export function isWeb() {
	return !isTauri();
}
