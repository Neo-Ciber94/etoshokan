import { command, getRequestEvent, query } from '$app/server';
import { UploadBookFormDataSchema } from '$lib/data/ebook/ebook.types';
import { getGoogleAccessToken } from '$lib/server/auth/utils';
import {
	deleteBookFromDrive,
	getDriveBookData,
	getDriveBooksMetadata,
	updateDriveBookProgress,
	updateDriveBookZoom,
	uploadBookToDrive
} from '$lib/server/books/book-storage.server';
import { z } from 'zod';
import { Result } from './result';

async function getToken() {
	const event = getRequestEvent();
	const accessToken = await getGoogleAccessToken(event);

	if (accessToken == null) {
		return Result.err('Failed to get google access token');
	}

	return Result.ok(accessToken);
}

export const uploadBookToServer = command(UploadBookFormDataSchema, async (input) => {
	try {
		const { data: token, error } = await getToken();

		if (token == null) {
			return Result.err(error);
		}

		const result = await uploadBookToDrive(input, token);

		return Result.ok(result);
	} catch (err) {
		console.error(err);
		return Result.err(err);
	}
});

export const deleteBook = command(z.object({ id: z.string() }), async ({ id }) => {
	try {
		const { data: token, error } = await getToken();

		if (token == null) {
			return Result.err(error);
		}

		await deleteBookFromDrive(id, token);

		return Result.ok();
	} catch (err) {
		console.error(err);
		return Result.err(err);
	}
});

export const getBooksMetadata = query(async () => {
	try {
		const { data: token, error } = await getToken();

		if (token == null) {
			return Result.err(error);
		}

		const metadata = await getDriveBooksMetadata(token);

		return Result.ok(metadata)
	} catch (err) {
		console.error(err);
		return Result.err(err);
	}
});

export const getBooksMetadataWithoutCover = query(async () => {
	try {
		const { data: token, error } = await getToken();

		if (token == null) {
			return Result.err(error);
		}

		const metadata = await getDriveBooksMetadata(token);
		const metadataWithoutCover = metadata.map((book) => {
			return {
				id: book.id,
				title: book.title,
				author: book.author,
				addedAt: book.addedAt,
				lastReadAt: book.lastReadAt,
				currentCfi: book.currentCfi,
				progress: book.progress,
				zoom: book.zoom
			};
		});

		return Result.ok(metadataWithoutCover);
	} catch (err) {
		console.error(err);
		return Result.err(err);
	}
});

export const getBookData = query(z.object({ id: z.string() }), async ({ id }) => {
	try {
		const { data: token, error } = await getToken();

		if (token == null) {
			return Result.err(error);
		}

		const data = await getDriveBookData(id, token);

		return Result.ok(data);
	} catch (err) {
		console.error(err);
		return Result.err(err);
	}
});

export const updateZoom = command(
	z.object({ id: z.string(), zoom: z.number() }),
	async ({ id, zoom }) => {
		try {
			const { data: token, error } = await getToken();

			if (token == null) {
				return Result.err(error);
			}

			await updateDriveBookZoom({ id, zoom, token });
			return Result.ok();
		} catch (err) {
			return Result.err(err);
		}
	}
);

export const updateProgress = command(
	z.object({ id: z.string(), cfi: z.string(), progress: z.number() }),
	async ({ id, cfi, progress }) => {
		try {
			const { data: token, error } = await getToken();

			if (token == null) {
				return Result.err(error);
			}

			await updateDriveBookProgress({ id, cfi, progress, token });
			return Result.ok();
		} catch (err) {
			console.error(err);
			return Result.err(err);
		}
	}
);
