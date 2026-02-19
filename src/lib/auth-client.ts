import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	// config
});

export async function isLoggedIn(): Promise<boolean> {
	const session = await authClient.getSession();
	return session.data != null;
}