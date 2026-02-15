import { get, set, del } from 'idb-keyval';
import type { BookMetadata, StoredBook } from './types';
import { Mutex } from '$lib/utils/mutex';
import ePub from 'epubjs';
import { blobToDataURL } from '$lib/utils/blobToDataURL';
import { uploadBookToServer } from '../../routes/remote/ebook.remote';

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

export async function getBookData(id: string): Promise<ArrayBuffer | undefined> {
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

export async function getBookMetadataById(bookId: string) {
	const books = await getBooksMetadata();
	const bookMetadata = books.find((b) => b.id === bookId) || null;
	return bookMetadata;
}

const bookMutex = new Mutex();

export async function updateBookZoom(id: string, zoom: number): Promise<void> {
	await bookMutex.run(async () => {
		const metadata = await getBooksMetadata();
		const book = metadata.find((m) => m.id === id);

		if (book) {
			book.zoom = zoom;
			await set(METADATA_KEY, metadata);
		}
	});
}

export async function updateBookProgress(id: string, cfi: string, progress: number): Promise<void> {
	await bookMutex.run(async () => {
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
		// TODO: Show actual error, or use placeholder
		console.error('Error loading cover:', error);
	}

	// const bookId = crypto.randomUUID(); // FIXME: The server should give us this
	// const bookMetadata: BookMetadata = {
	// 	id: bookId,
	// 	title: metadata.title || 'Unknown Title',
	// 	author: metadata.creator || 'Unknown Author',
	// 	cover: coverDataUrl,
	// 	addedAt: Date.now()
	// };

	// const uploadResult = await uploadBookToServer({
	// 	title: metadata.title || 'Unknown Title',
	// 	author: metadata.creator || 'Unknown Author',
	// 	cover: coverDataUrl,
	// 	ebookData: file
	// });

	const uploadResult = await uploadBookToServer({
		title: metadata.title || 'Unknown Title',
		author: metadata.creator || 'Unknown Author',
		cover: coverDataUrl,
		ebookData: await file.arrayBuffer()
	});

	if (uploadResult.success) {
		const bookMetadata = uploadResult.result;

		await saveBook({
			metadata: bookMetadata,
			file: arrayBuffer
		});
	} else {
		alert(`Failed to upload book: ${uploadResult.error}`);
	}
}
