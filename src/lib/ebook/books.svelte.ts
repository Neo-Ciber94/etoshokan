import { getLocalBooksMetadata } from './books.storage';
import type { BookMetadata } from './ebook.types';

let loading = $state(true);
let books = $state<BookMetadata[]>([]);

$effect.root(() => {
	invalidate();
});

async function invalidate() {
	loading = true;

	try {
		books = await getLocalBooksMetadata();
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
