import { get, keys } from 'idb-keyval';
import type { BookMetadata } from './ebook.types';
import { getBooksMetadataWithoutCover } from '$lib/remote/ebook.remote';
import { BOOK_PREFIX, METADATA_KEY } from './storage.utils';

export async function getLocalBooksMetadata(): Promise<BookMetadata[]> {
	const metadata = await get<BookMetadata[]>(METADATA_KEY);
	return metadata || [];
}

export async function getLocalBookData(bookId: string): Promise<ArrayBuffer | undefined> {
	return await get(`${BOOK_PREFIX}${bookId}`);
}

export async function hasLocalBookData(bookId: string) {
	const key = `${BOOK_PREFIX}${bookId}`;
	const storageKeys = await keys();
	return storageKeys.some((k) => k === key);
}

export async function getLocalBookMetadataById(bookId: string): Promise<BookMetadata | null> {
	const books = await getLocalBooksMetadata();
	return books.find((b) => b.id === bookId) || null;
}

export async function getRemoteBooksNotInLocal() {
	const result = await getBooksMetadataWithoutCover();
	if (!result.success) {
		console.error('Failed to fetch remote metadata:', result.error);
		return [];
	}

	const localMetadata = await getLocalBooksMetadata();
	const localIds = new Set(localMetadata.map((b) => b.id));

	return result.metadata.filter((b) => !localIds.has(b.id));
}

export async function hasLocalBooksMetadata() {
	const booksMetadata = await get(METADATA_KEY);

	if (booksMetadata == null) {
		return false;
	}

	return Array.isArray(booksMetadata) && booksMetadata.length > 0;
}
