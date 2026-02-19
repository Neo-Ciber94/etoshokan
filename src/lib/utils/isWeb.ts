export function isWeb() {
	if (typeof window === 'undefined') {
		return false;
	}

	return typeof window.__TAURI_INTERNALS__ === 'undefined';
}
