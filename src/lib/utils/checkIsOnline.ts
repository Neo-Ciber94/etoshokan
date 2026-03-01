import { isLoggedIn } from '$lib/client/auth-client';

export async function checkIsOnline() {
	if (typeof navigator !== 'undefined' && !navigator.onLine) {
		return false;
	}

	const result = await isLoggedIn();
	return result;
}
