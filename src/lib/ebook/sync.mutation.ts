import { del, set } from 'idb-keyval';
import type { UploadState, SyncState, BookSyncEntry } from './sync.types';
import { getBooksMetadata, getBookData } from '$lib/remote/ebook.remote';
import { getAllSyncEntries, getBookSyncEntry } from './sync.query';
import { getLocalBooksMetadata, getLocalBookMetadataById, getLocalBookData } from './books.query';
import { saveLocalBook, mergeLocalBooksMetadata, uploadBook, migrateBook } from './books.mutation';
import { SYNC_TABLE_KEY } from './storage.utils';
import type { BookMetadata } from './ebook.types';

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

// FIXME: Use the actual book contents hash
type BookHash = string & { _hash: never };

function getBookHash(book: BookMetadata): BookHash {
	return book.title as BookHash;
}

// Syncs remote book state into local sync table.
// Existing entries are preserved; new remote books get 'uploaded' or 'missing' state.
export async function initSyncData(): Promise<BookSyncEntry[]> {
	const result = await getBooksMetadata();

	if (!result.success) {
		console.error('Failed to fetch remote metadata for sync init:', result.error);
		return [];
	}

	const localMetadata = await getLocalBooksMetadata();
	const localIds = new Set(localMetadata.map((b) => b.id));
	const syncEntriesMap = new Map<BookHash, BookSyncEntry>();

	// Check remote that don't exist on local
	for (const book of result.metadata) {
		const bookBash = getBookHash(book);

		if (localIds.has(book.id)) {
			syncEntriesMap.set(bookBash, {
				bookId: book.id,
				uploadState: 'uploaded',
				syncState: 'synced'
			});
		} else {
			syncEntriesMap.set(bookBash, {
				bookId: book.id,
				uploadState: 'missing',
				syncState: 'synced'
			});
		}
	}

	// Check local that do not exists on remote
	const remoteIds = new Set(result.metadata.map((b) => b.id));
	for (const book of localMetadata) {
		// Ignore already exists
		if (remoteIds.has(book.id)) {
			continue;
		}

		const bookHash = getBookHash(book);
		syncEntriesMap.set(bookHash, {
			bookId: book.id,
			uploadState: 'missing',
			syncState: 'synced'
		});
	}

	const syncEntries = [...syncEntriesMap.values()];
	await set(SYNC_TABLE_KEY, syncEntries);
	return syncEntries;
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

// Upload a missing book
export async function uploadMissingBook(bookId: string) {
	const syncEntry = await getBookSyncEntry(bookId);

	if (syncEntry == null) {
		console.error(`Sync entry not found: ${bookId}`);
		return;
	}

	const bookData = await getLocalBookData(bookId);
	const bookMetadata = await getLocalBookMetadataById(bookId);

	if (bookData == null) {
		throw new Error('Missing book data was not found');
	}

	if (bookMetadata == null) {
		throw new Error('Failed to upload missing book, metadata not found');
	}

	const { metadata } = await uploadBook(bookMetadata, bookData);
	await migrateBook(bookId, metadata.id);
	await removeBookSyncEntry(bookId);
}

// Clear the sync local cache
export async function clearSyncEntries() {
	await del(SYNC_TABLE_KEY);
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
