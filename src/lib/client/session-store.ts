import type { Session } from '@auth/core/types';
import { createStore } from './store';
import { getSession } from '$lib/remote/auth.remote';

type SessionState = {
	value: Session | null;
	loading: boolean;
};

function createSessionStore() {
	const store = createStore<SessionState>({
		value: null,
		loading: true
	});

	let sessionPromise: Promise<Session | null> | null = null;

	function getAuth() {
		if (sessionPromise == null) {
			sessionPromise = getSession();
		}

		return sessionPromise;
	}

	async function invalidate() {
		sessionPromise = null;

		store.set({
			loading: true,
			value: store.getValue().value
		});

		try {
			const session = await getAuth();
			store.set({
				loading: false,
				value: session
			});
		} catch (err) {
			console.error('Failed to fetch session', err);
			store.set({
				loading: false,
				value: null
			});
		} finally {
			store.update((prev) => ({ ...prev, loading: false }));
		}
	}

	invalidate();

	return {
		invalidate,
		getAuth,
		...store
	};
}

export const sessionStore = createSessionStore();
