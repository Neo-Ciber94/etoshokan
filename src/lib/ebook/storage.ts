import { get, set, del, keys } from 'idb-keyval';
import type { BookMetadata, StoredBook } from './types';

const BOOK_PREFIX = 'book:';
const METADATA_KEY = 'books:metadata';

export async function saveBook(book: StoredBook): Promise<void> {
	// Save the book file
	await set(`${BOOK_PREFIX}${book.metadata.id}`, book.file);

	// Update metadata list
	const metadata = await getBooksMetadata();
	const existingIndex = metadata.findIndex((m) => m.id === book.metadata.id);

	if (existingIndex >= 0) {
		metadata[existingIndex] = book.metadata;
	} else {
		metadata.push(book.metadata);
	}

	// Sort by last read date (most recent first)
	metadata.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));

	await set(METADATA_KEY, metadata);
}

export async function getBook(id: string): Promise<ArrayBuffer | undefined> {
	return await get(`${BOOK_PREFIX}${id}`);
}

export async function deleteBook(id: string): Promise<void> {
	await del(`${BOOK_PREFIX}${id}`);

	const metadata = await getBooksMetadata();
	const filtered = metadata.filter((m) => m.id !== id);
	await set(METADATA_KEY, filtered);
}

export async function getBooksMetadata(): Promise<BookMetadata[]> {
	const metadata = await get<BookMetadata[]>(METADATA_KEY);
	return metadata || [];
}

export async function updateBookProgress(
	id: string,
	cfi: string,
	progress: number
): Promise<void> {
	const metadata = await getBooksMetadata();
	const book = metadata.find((m) => m.id === id);

	if (book) {
		book.currentCfi = cfi;
		book.progress = progress;
		book.lastReadAt = Date.now();

		// Sort by last read date
		metadata.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));

		await set(METADATA_KEY, metadata);
	}
}
