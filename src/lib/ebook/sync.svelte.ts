import { initSyncData } from './sync.mutation';
import type { BookSyncEntry } from './sync.types';

let loading = $state(true);
let syncEntries = $state<BookSyncEntry[]>([]);

$effect.root(() => {
	invalidate();
});

async function invalidate() {
	loading = true;

	try {
		syncEntries = await initSyncData();
	} catch (err) {
		console.error(err);
	} finally {
		loading = false;
	}
}

export function useSyncBookEntries() {
	return {
		invalidate,
		get loading() {
			return loading;
		},

		get value() {
			return syncEntries;
		}
	};
}
