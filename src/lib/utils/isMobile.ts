declare global {
	interface Window {
		__TAURI_INTERNALS__: Record<string, unknown>;
	}
}

export function isMobile() {
	if (typeof window === 'undefined') {
		return false;
	}

	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
