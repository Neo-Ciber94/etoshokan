import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	// config
});

export async function isLoggedIn(): Promise<boolean> {
	try {
		const session = await authClient.getSession();
		return session.data != null;
	} catch (err) {
		console.error('Failed to fetch session', err);
		return false;
	}
}
