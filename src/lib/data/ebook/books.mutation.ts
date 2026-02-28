import { set, del } from 'idb-keyval';
import type { BookMetadata, StoredBook } from './ebook.types';
import { Mutex } from '$lib/utils/mutex/mutex';
import ePub from 'epubjs';
import { blobToDataURL } from '$lib/utils/blobToDataURL';
import {
	deleteBook,
	updateZoom,
	updateProgress,
	uploadBookToServer
} from '$lib/remote/ebook.remote';
import { isLoggedIn } from '$lib/client/auth-client';
import { setBookUploadState, setBookSyncState } from './sync.mutation';
import { getLocalBooksMetadata, getLocalBookData } from './books.query';
import { BOOK_PREFIX, METADATA_KEY } from './storage.utils';
import type { UploadState } from './sync.types';

export async function saveLocalBook(book: StoredBook): Promise<void> {
	await set(`${BOOK_PREFIX}${book.metadata.id}`, book.file);

	const metadata = await getLocalBooksMetadata();
	const existingIndex = metadata.findIndex((m) => m.id === book.metadata.id);

	if (existingIndex >= 0) {
		metadata[existingIndex] = book.metadata;
	} else {
		metadata.push(book.metadata);
	}

	metadata.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));
	await set(METADATA_KEY, metadata);
}

export async function deleteLocalBook(id: string): Promise<void> {
	await del(`${BOOK_PREFIX}${id}`);

	const metadata = await getLocalBooksMetadata();
	await set(
		METADATA_KEY,
		metadata.filter((m) => m.id !== id)
	);

	const isLogged = await isLoggedIn();

	if (isLogged) {
		// Not need to wait for BE
		Promise.resolve().then(async () => {
			try {
				const result = await deleteBook({ id });
				if (!result.success) {
					console.error('Failed to delete book from server:', result.error);
					await setBookSyncState(id, 'pending');
				}
			} catch (err) {
				console.error('Failed to delete book from server:', err);
				await setBookSyncState(id, 'pending');
			}
		});
	} else {
		await setBookSyncState(id, 'pending');
	}
}

export async function mergeLocalBooksMetadata(books: BookMetadata[]): Promise<boolean> {
	const existing = await getLocalBooksMetadata();
	const existingIds = new Set(existing.map((b) => b.id));
	const newBooks = books.filter((b) => !existingIds.has(b.id));

	if (newBooks.length === 0) {
		return false;
	}

	const merged = [...existing, ...newBooks];
	merged.sort((a, b) => (b.lastReadAt ?? b.addedAt) - (a.lastReadAt ?? a.addedAt));
	await set(METADATA_KEY, merged);
	return true;
}

const bookMutex = new Mutex();

export async function migrateBook(fromBookId: string, toBookId: string) {
	const bookData = await getLocalBookData(fromBookId);

	if (bookData !== undefined) {
		await set(`${BOOK_PREFIX}${toBookId}`, bookData);
		await del(`${BOOK_PREFIX}${fromBookId}`);
	}

	await bookMutex.run(async () => {
		const allMetadata = await getLocalBooksMetadata();
		const index = allMetadata.findIndex((m) => m.id === fromBookId);

		if (index >= 0) {
			allMetadata[index] = { ...allMetadata[index], id: toBookId };
			await set(METADATA_KEY, allMetadata);
		}
	});
}

export async function updateLocalBookZoom(id: string, zoom: number): Promise<void> {
	await bookMutex.run(async () => {
		const metadata = await getLocalBooksMetadata();
		const book = metadata.find((m) => m.id === id);

		if (book) {
			book.zoom = zoom;
			await set(METADATA_KEY, metadata);
		}
	});

	const isLogged = await isLoggedIn();

	if (isLogged) {
		Promise.resolve().then(async () => {
			try {
				const result = await updateZoom({ id, zoom });
				if (!result.success) {
					console.error('Failed to update zoom on server:', result.error);
					await setBookSyncState(id, 'pending');
				}
			} catch (err) {
				console.error('Failed to update zoom on server:', err);
				await setBookSyncState(id, 'pending');
			}
		});
	} else {
		await setBookSyncState(id, 'pending');
	}
}

export async function updateLocalBookProgress(
	id: string,
	cfi: string,
	progress: number
): Promise<void> {
	await bookMutex.run(async () => {
		const metadata = await getLocalBooksMetadata();
		const book = metadata.find((m) => m.id === id);

		if (book) {
			book.currentCfi = cfi;
			book.progress = progress;
			book.lastReadAt = Date.now();

			metadata.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));

			await set(METADATA_KEY, metadata);
		}
	});

	const isLogged = await isLoggedIn();

	if (isLogged) {
		Promise.resolve().then(async () => {
			try {
				const result = await updateProgress({ id, cfi, progress });
				if (!result.success) {
					console.error('Failed to update progress on server:', result.error);
					await setBookSyncState(id, 'pending');
				}
			} catch (err) {
				console.error('Failed to update progress on server:', err);
				await setBookSyncState(id, 'pending');
			}
		});
	} else {
		await setBookSyncState(id, 'pending');
	}
}

type UploadLocalBook = Omit<BookMetadata, 'id' | 'addedAt'>;

async function uploadLocalBook(
	metadata: UploadLocalBook,
	bookData: ArrayBuffer,
	uploadState: UploadState = 'uploaded'
) {
	const bookId = crypto.randomUUID();
	const bookMetadata: BookMetadata = {
		...metadata,
		id: bookId,
		addedAt: Date.now()
	};

	await saveLocalBook({
		file: bookData,
		metadata: bookMetadata
	});

	await setBookUploadState(bookId, uploadState);
	return bookMetadata;
}

export async function uploadBookFromFile(file: File) {
	const bookData = await file.arrayBuffer();
	const book = ePub(bookData); // Currently we only support eBooks

	await book.ready;
	const metadata = await book.loaded.metadata;

	let coverDataUrl: string | undefined;

	try {
		const coverUrl = await book.coverUrl();
		if (coverUrl) {
			const response = await fetch(coverUrl);
			const blob = await response.blob();
			coverDataUrl = await blobToDataURL(blob);
		}
	} catch (error) {
		// No need to crash if we fail to get the cover
		console.error('Failed to load book cover', error);
	}

	const partialBookMetadata = {
		title: metadata.title || getAutoGeneratedTitle(),
		author: metadata.creator || 'Unknown Author',
		cover: coverDataUrl
	};

	return await uploadBook(partialBookMetadata, bookData);
}

export const enum UploadResultStatus {
	UploadedLocally = 'uploaded_locally',
	UploadedRemote = 'uploaded_remote',
	RemoteFailedUploadedLocally = 'remote_failed_uploaded_locally'
}

export type UploadResult = {
	status: UploadResultStatus;
	metadata: BookMetadata;
};

export async function uploadBook(
	metadata: UploadLocalBook,
	bookData: ArrayBuffer
): Promise<UploadResult> {
	// If we fail we try to save it locally
	const tryUploadBookLocally = () => uploadLocalBook(metadata, bookData, 'pending');

	const isLogged = await isLoggedIn();

	if (isLogged) {
		const uploadResult = await uploadBookToServer({
			...metadata,
			ebookData: bookData
		});

		if (uploadResult.success) {
			const bookMetadata = uploadResult.result;

			await saveLocalBook({
				metadata: bookMetadata,
				file: bookData
			});

			await setBookUploadState(bookMetadata.id, 'uploaded');
			return {
				status: UploadResultStatus.UploadedRemote,
				metadata: bookMetadata
			};
		} else {
			// Save locally on error
			const bookMetadata = await tryUploadBookLocally();
			return {
				status: UploadResultStatus.RemoteFailedUploadedLocally,
				metadata: bookMetadata
			};
		}
	} else {
		// Save locally
		const bookMetadata = await tryUploadBookLocally();
		return {
			status: UploadResultStatus.UploadedLocally,
			metadata: bookMetadata
		};
	}
}

export async function clearLocalBooks() {
	const localBooks = await getLocalBooksMetadata();

	for (const bookMetadata of localBooks) {
		const id = bookMetadata.id;
		await del(`${BOOK_PREFIX}${id}`);
	}

	await del(METADATA_KEY);
}

// FIXME: We use the title as the unique identifier
// we need to migrate to use a hash of the contents instead
function getAutoGeneratedTitle() {
	const id = crypto.randomUUID();
	return `Unknown Title | ${id}`;
}
