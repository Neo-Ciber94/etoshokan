import { get, set } from 'idb-keyval';
import { getBooksMetadata, getBooksMetadataWithoutCover, getBookData } from '$lib/remote/ebook.remote';
import type { UploadState, SyncState, BookSyncEntry } from './sync.types';
import {
	getLocalBooksMetadata,
	getLocalBookMetadataById,
	saveLocalBook,
	mergeLocalBooksMetadata
} from './books.storage';

const SYNC_TABLE_KEY = 'books:sync';

async function getAllSyncEntries(): Promise<BookSyncEntry[]> {
	const syncEntries = await get<BookSyncEntry[]>(SYNC_TABLE_KEY);
	return syncEntries ?? [];
}

async function upsertSyncEntry(entry: BookSyncEntry): Promise<void> {
	const entries = await getAllSyncEntries();
	const index = entries.findIndex((e) => e.bookId === entry.bookId);
	if (index >= 0) {
		entries[index] = entry;
	} else {
		entries.push(entry);
	}
	await set(SYNC_TABLE_KEY, entries);
}

export async function getBookSyncEntry(bookId: string): Promise<BookSyncEntry | null> {
	const entries = await getAllSyncEntries();
	return entries.find((e) => e.bookId === bookId) ?? null;
}

export async function setBookUploadState(bookId: string, uploadState: UploadState): Promise<void> {
	const existing = await getBookSyncEntry(bookId);
	await upsertSyncEntry({
		bookId,
		uploadState,
		syncState: existing?.syncState ?? 'synced'
	});
}

export async function setBookSyncState(bookId: string, syncState: SyncState): Promise<void> {
	const existing = await getBookSyncEntry(bookId);
	await upsertSyncEntry({
		bookId,
		uploadState: existing?.uploadState ?? 'uploaded',
		syncState
	});
}

export async function removeBookSyncEntry(bookId: string): Promise<void> {
	const entries = await getAllSyncEntries();
	await set(
		SYNC_TABLE_KEY,
		entries.filter((e) => e.bookId !== bookId)
	);
}

// Returns metadata of remote books that don't exist in local storage
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

// Fetches remote metadata and saves it locally for books not already present (no book file data)
export async function syncRemoteMetadata(): Promise<void> {
	const result = await getBooksMetadata();
	if (!result.success) {
		console.error('Failed to fetch remote metadata:', result.error);
		return;
	}

	await mergeLocalBooksMetadata(result.metadata);
}

// Downloads book file data from server and saves it to IndexDB
export async function downloadBookData(bookId: string): Promise<void> {
	const result = await getBookData({ id: bookId });
	if (!result.success) {
		console.error('Failed to download book data:', result.error);
		return;
	}

	if (!result.data) {
		console.error('No book data returned from server for book:', bookId);
		return;
	}

	const metadata = await getLocalBookMetadataById(bookId);
	if (!metadata) {
		console.error('No local metadata found for book:', bookId);
		return;
	}

	await saveLocalBook({ metadata, file: result.data });
}
