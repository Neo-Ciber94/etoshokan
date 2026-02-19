import { getAllSyncEntries } from './sync.query';
import type { BookSyncEntry } from './sync.types';

let loading = $state(true);
let syncEntries = $state<BookSyncEntry[]>([]);

$effect.root(() => {
	invalidate();
});

async function invalidate() {
	loading = true;

	try {
		syncEntries = await getAllSyncEntries();
	} catch (err) {
		console.error(err);
	} finally {
		loading = false;
	}
}

function getEntry(bookId: string) {
	return syncEntries.find((x) => x.bookId === bookId);
}

export function useSyncBookEntries() {
	return {
		invalidate,
		getEntry,

		get loading() {
			return loading;
		},

		get value() {
			return syncEntries;
		}
	};
}
