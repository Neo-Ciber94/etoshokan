import { get, set, del } from 'idb-keyval';
import type { BookMetadata, StoredBook } from './types';
import { Mutex } from '$lib/utils/mutex';
import ePub from 'epubjs';
import { blobToDataURL } from '$lib/utils/blobToDataURL';
import { deleteBook, updateZoom, updateProgress, uploadBookToServer } from '../../routes/remote/ebook.remote';
import { authClient } from '$lib/auth-client';

async function isLoggedIn(): Promise<boolean> {
  const session = await authClient.getSession();
  return session.data != null;
}

const BOOK_PREFIX = 'book:';
const METADATA_KEY = 'books:metadata';

export async function saveLocalBook(book: StoredBook): Promise<void> {
	// Save the book file
	await set(`${BOOK_PREFIX}${book.metadata.id}`, book.file);

	// Update metadata list
	const metadata = await getLocalBooksMetadata();
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

export async function getLocalBookData(id: string): Promise<ArrayBuffer | undefined> {
	return await get(`${BOOK_PREFIX}${id}`);
}

export async function deleteLocalBook(id: string): Promise<void> {
	await del(`${BOOK_PREFIX}${id}`);

	const metadata = await getLocalBooksMetadata();
	const filtered = metadata.filter((m) => m.id !== id);
	await set(METADATA_KEY, filtered);

	if (await isLoggedIn()) {
		try {
			const result = await deleteBook({ id });
			if (!result.success) {
				console.error('Failed to delete book from server:', result.error);
			}
		} catch (err) {
			console.error('Failed to delete book from server:', err);
		}
	}
}

export async function getLocalBooksMetadata(): Promise<BookMetadata[]> {
	const metadata = await get<BookMetadata[]>(METADATA_KEY);
	return metadata || [];
}

export async function getLocalBookMetadataById(bookId: string) {
	const books = await getLocalBooksMetadata();
	const bookMetadata = books.find((b) => b.id === bookId) || null;
	return bookMetadata;
}

const bookMutex = new Mutex();

export async function updateLocalBookZoom(id: string, zoom: number): Promise<void> {
	await bookMutex.run(async () => {
		const metadata = await getLocalBooksMetadata();
		const book = metadata.find((m) => m.id === id);

		if (book) {
			book.zoom = zoom;
			await set(METADATA_KEY, metadata);
		}
	});

	if (await isLoggedIn()) {
		try {
			const result = await updateZoom({ id, zoom });
			if (!result.success) {
				console.error('Failed to update zoom on server:', result.error);
			}
		} catch (err) {
			console.error('Failed to update zoom on server:', err);
		}
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

			// Sort by last read date
			metadata.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));

			await set(METADATA_KEY, metadata);
		}
	});

	if (await isLoggedIn()) {
		try {
			const result = await updateProgress({ id, cfi, progress });
			if (!result.success) {
				console.error('Failed to update progress on server:', result.error);
			}
		} catch (err) {
			console.error('Failed to update progress on server:', err);
		}
	}
}

type UploadLocalBook = Omit<BookMetadata, 'id' | 'addedAt'>;

async function uploadLocalBook(metadata: UploadLocalBook, bookData: ArrayBuffer) {
	const bookId = crypto.randomUUID();

	await saveLocalBook({
		file: bookData,
		metadata: {
			...metadata,
			id: bookId,
			addedAt: Date.now()
		}
	});
}

export async function uploadBook(file: File) {
	const arrayBuffer = await file.arrayBuffer();
	const book = ePub(arrayBuffer); // Currently we only support eBooks

	// Load metadata
	await book.ready;
	const metadata = await book.loaded.metadata;

	// Get cover as a blob and convert to data URL
	let coverDataUrl: string | undefined;

	try {
		const coverUrl = await book.coverUrl();
		if (coverUrl) {
			// Fetch the blob URL and convert to data URL
			const response = await fetch(coverUrl);
			const blob = await response.blob();
			coverDataUrl = await blobToDataURL(blob);
		}
	} catch (error) {
		// No need to crash if we fail to get the cover
		console.error('Failed to load book cover', error);
	}

	const partialBookMetadata = {
		title: metadata.title || 'Unknown Title',
		author: metadata.creator || 'Unknown Author',
		cover: coverDataUrl
	};

	const bookData = await file.arrayBuffer();

	// If we fail we try to save it locally
	const tryUploadBookLocally = () => uploadLocalBook(partialBookMetadata, bookData);

	try {
		// FIXME: Bail if is not online
		const uploadResult = await uploadBookToServer({
			...partialBookMetadata,
			ebookData: bookData
		});

		if (uploadResult.success) {
			const bookMetadata = uploadResult.result;

			await saveLocalBook({
				metadata: bookMetadata,
				file: arrayBuffer
			});
		} else {
			await tryUploadBookLocally();
			throw new Error(uploadResult.error);
		}
	} catch (err) {
		await tryUploadBookLocally();
		throw err;
	}
}
