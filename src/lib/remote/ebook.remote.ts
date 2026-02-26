import { command, getRequestEvent, query } from '$app/server';
import { UploadBookFormDataSchema } from '$lib/ebook/ebook.types';
import { logger } from '$lib/logging/logger';
import { getGoogleAccessToken } from '$lib/server/auth/googleAuth';
import {
	deleteBookFromDrive,
	getDriveBookData,
	getDriveBooksMetadata,
	updateDriveBookProgress,
	updateDriveBookZoom,
	uploadBookToDrive
} from '$lib/server/books/book-storage.server';
import { ZodError, z } from 'zod';

async function getToken() {
	return getGoogleAccessToken(getRequestEvent());
}

export const uploadBookToServer = command(UploadBookFormDataSchema, async (input) => {
	try {
		const { token, error } = await getToken();

		if (token == null) {
			return { success: false, error } as const;
		}

		const result = await uploadBookToDrive(input, token);

		return {
			result,
			success: true
		} as const;
	} catch (err) {
		logger.error(err);
		const message = getErrorMessage(err);

		return {
			success: false,
			error: message
		} as const;
	}
});

export const deleteBook = command(z.object({ id: z.string() }), async ({ id }) => {
	try {
		const { token, error } = await getToken();

		if (token == null) {
			return { success: false, error } as const;
		}

		await deleteBookFromDrive(id, token);

		return { success: true } as const;
	} catch (err) {
		logger.error(err);
		return { success: false, error: getErrorMessage(err) } as const;
	}
});

export const getBooksMetadata = query(async () => {
	try {
		const { token, error } = await getToken();

		if (token == null) {
			return { success: false, error } as const;
		}

		const metadata = await getDriveBooksMetadata(token);

		return { success: true, metadata } as const;
	} catch (err) {
		logger.error(err);
		return { success: false, error: getErrorMessage(err) } as const;
	}
});

export const getBooksMetadataWithoutCover = query(async () => {
	try {
		const { token, error } = await getToken();

		if (token == null) {
			return { success: false, error } as const;
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

		return { success: true, metadata: metadataWithoutCover } as const;
	} catch (err) {
		logger.error(err);
		return { success: false, error: getErrorMessage(err) } as const;
	}
});

export const getBookData = query(z.object({ id: z.string() }), async ({ id }) => {
	try {
		const { token, error } = await getToken();

		if (token == null) {
			return { success: false, error } as const;
		}

		const data = await getDriveBookData(id, token);

		return { success: true, data } as const;
	} catch (err) {
		logger.error(err);
		return { success: false, error: getErrorMessage(err) } as const;
	}
});

export const updateZoom = command(
	z.object({ id: z.string(), zoom: z.number() }),
	async ({ id, zoom }) => {
		try {
			const { token, error } = await getToken();

			if (token == null) {
				return { success: false, error } as const;
			}

			await updateDriveBookZoom({ id, zoom, token });

			return { success: true } as const;
		} catch (err) {
			logger.error(err);
			return { success: false, error: getErrorMessage(err) } as const;
		}
	}
);

export const updateProgress = command(
	z.object({ id: z.string(), cfi: z.string(), progress: z.number() }),
	async ({ id, cfi, progress }) => {
		try {
			const { token, error } = await getToken();

			if (token == null) {
				return { success: false, error } as const;
			}

			await updateDriveBookProgress({ id, cfi, progress, token });

			return { success: true } as const;
		} catch (err) {
			logger.error(err);
			return { success: false, error: getErrorMessage(err) } as const;
		}
	}
);

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	if (error instanceof ZodError) {
		return z.prettifyError(error);
	}

	return 'Unknown error';
}
