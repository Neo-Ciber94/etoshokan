import type { Session } from '@auth/core/types';
import { sessionStore } from './session-store';

let data = $state<Session | null>(sessionStore.getValue()?.value);
let isPending = $state(true);

$effect.root(() => {
	sessionStore.invalidate();

	const unsubscribe = sessionStore.subscribe((sessionState) => {
		console.log(sessionState);
		data = sessionState.value;
		isPending = sessionState.loading;
	});

	return () => {
		unsubscribe();
	};
});

export function useSession() {
	return {
		get data() {
			return data;
		},
		get isPending() {
			return isPending;
		},
		invalidate() {
			return sessionStore.invalidate();
		}
	};
}
