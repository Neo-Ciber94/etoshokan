import { command } from '$app/server';
import { UploadBookFormDataSchema } from '$lib/ebook/types';
import { logger } from '$lib/logging/logger';
import { getGoogleAuthToken } from '$lib/server/auth/utils';
import { uploadBookToDrive } from '$lib/server/books/book-storage.server';
import { ZodError, z } from 'zod';

export const uploadBookToServer = command(UploadBookFormDataSchema, async (input) => {
	try {
		const googleTokens = await getGoogleAuthToken();

		if (googleTokens == null) {
			return {
				success: false,
				error: 'Failed to get google access token'
			} as const;
		}

		const result = await uploadBookToDrive(input, googleTokens.accessToken);

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

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	if (error instanceof ZodError) {
		return z.prettifyError(error);
	}

	return 'Unknown error';
}
