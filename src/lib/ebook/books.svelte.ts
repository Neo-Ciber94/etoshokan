import { getBooksMetadata } from './books.storage';
import type { BookMetadata } from './types';

let loading = $state(true);
let books = $state<BookMetadata[]>([]);

$effect.root(() => {
	invalidate();
});

async function invalidate() {
	loading = true;

	try {
		books = await getBooksMetadata();
	} catch (err) {
		console.error(err);
	} finally {
		loading = false;
	}
}

export function useBooksMetadata() {
	return {
		invalidate,
		get loading() {
			return loading;
		},

		get value() {
			return books;
		}
	};
}
