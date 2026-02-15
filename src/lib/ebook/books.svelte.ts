import type { BookMetadata } from './types';
import { getBooksMetadata } from './books.storage';

let books = $state<BookMetadata[]>([]);
let loading = $state(true);

$effect.pre(() => {
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
