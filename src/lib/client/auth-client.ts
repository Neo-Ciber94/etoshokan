import { createAuthClient } from 'better-auth/svelte';
import { QUERY_CLIENT } from '../../routes/query';

export const authClient = createAuthClient({
	// config
});

export async function getSession() {
	return QUERY_CLIENT.fetchQuery({
		queryKey: ['session'],
		queryFn: async () => {
			try {
				const session = await authClient.getSession();
				return session.data;
			} catch (err) {
				console.error('Failed to fetch session', err);
				return null;
			}
		},
		staleTime: 1000 * 60 * 5
	});
}

export async function isLoggedIn(): Promise<boolean> {
	const session = await getSession();
	return session != null;
}
