import { command } from '$app/server';
import { UploadBookFormDataSchema } from '$lib/ebook/types';
import { uploadBookToDrive } from '$lib/server/books/book-storage.server';

export const uploadBookToServer = command(UploadBookFormDataSchema, async (input) => {
	try {
		const result = await uploadBookToDrive(input);
		return {
			result,
			success: true
		} as const;
	} catch (err) {
		console.error(err);
		const message = err instanceof Error ? err.message : 'Unknown error';

		return {
			success: false,
			error: message
		} as const;
	}
});
