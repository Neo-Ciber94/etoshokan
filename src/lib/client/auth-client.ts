import { writable } from 'svelte/store';
import * as client from '@auth/sveltekit/client';
import type { Session } from '@auth/core/types';

const AUTH_BASE = '/api/auth';

type SessionStore = {
	data: Session | null;
	isPending: boolean;
};

function createSessionStore() {
	const store = writable<SessionStore>({ data: null, isPending: true });

	async function reload() {
		try {
			const res = await fetch(`${AUTH_BASE}/session`);
			const session: Session | null = res.ok ? await res.json() : null;
			store.set({ data: session?.user ? session : null, isPending: false });
		} catch (err) {
			console.error('Failed to fetch session', err);
			store.set({ data: null, isPending: false });
		}
	}

	if (typeof window !== 'undefined') {
		reload();
	}

	return { subscribe: store.subscribe, reload };
}

const _session = createSessionStore();

export const authClient = {
	useSession: () => _session,

	signIn: {
		social: ({ provider, callbackURL }: { provider: string; callbackURL?: string }) => {
			return client.signIn(provider, { callbackUrl: callbackURL });
		}
	},

	signOut: () => {
		return client.signOut();
	}
};

export async function isLoggedIn(): Promise<boolean> {
	try {
		const res = await fetch(`${AUTH_BASE}/session`);
		if (!res.ok) return false;
		const session: Session | null = await res.json();
		return session?.user != null;
	} catch (err) {
		console.error('Failed to check login status', err);
		return false;
	}
}

export async function clientAuthSignIn({
	provider,
	callbackURL
}: {
	provider: string;
	callbackURL?: string;
}) {
	try {
		await authClient.signIn.social({ provider, callbackURL });
		return { success: true } as const;
	} catch (err) {
		console.error(err);
		const error = err instanceof Error ? err.message : 'Failed to login';
		return { success: false, error } as const;
	}
}
