import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	// config
});

export async function isLoggedIn(): Promise<boolean> {
	const session = await authClient.getSession();
	return session.data != null;
}

type ClientAuthSignInOptions = {
	provider: string;
};

export async function clientAuthSignIn(options: ClientAuthSignInOptions) {
	try {
		const res = await fetch('/api/auth/sign-in/social', {
			body: JSON.stringify(options),
			method: 'POST',
			headers: {
				'Content-Type': 'application-json'
			}
		});

		if (!res.ok) {
			throw new Error(`Failed to sign-in: ${res.status} (${res.statusText})`);
		}

		const json = await res.json();
		return {
			success: true,
			data: {
				redirect: Boolean(json.redirect),
				url: String(json.url)
			}
		} as const;
	} catch (err) {
		console.error(err);
		const error = err instanceof Error ? err.message : 'Failed to login';
		return { success: false, error } as const;
	}
}
