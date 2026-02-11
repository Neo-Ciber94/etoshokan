import type { BookMetadata } from './types';
import { getBooksMetadata } from './storage';

export function useAllBooksMetadata() {
	let loading = $state(true);
	let books = $state<BookMetadata[]>([]);

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

	$effect.pre(() => {
		invalidate();
	});

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
