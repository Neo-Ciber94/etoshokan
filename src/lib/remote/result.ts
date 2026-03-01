import { z, ZodError } from 'zod';

export type RemoteResult<T> =
	| { success: true; data: T; error?: undefined }
	| { success: false; error: string; data?: undefined };

export abstract class Result {
	static ok(value?: void): RemoteResult<void>;
	static ok<T>(value: T): RemoteResult<T>;
	static ok<T>(value: T): RemoteResult<T> {
		return { data: value, success: true };
	}

	static err(err: unknown): RemoteResult<never> {
		const error = getErrorMessage(err);
		return { error, success: false };
	}
}

function getErrorMessage(error: unknown): string {
	if (typeof error === 'string') {
		return error;
	}

	const googleDriveError = getGoogleDriveError(error);

	if (googleDriveError) {
		return 'Google drive error';
	}

	if (error instanceof Error) {
		return 'Server error';
	}

	if (error instanceof ZodError) {
		return z.prettifyError(error);
	}

	return 'Unknown error';
}

const GoogleDriveErrorDetailSchema = z.object({
	message: z.string(),
	domain: z.string(),
	reason: z.string(),
	location: z.string().optional(),
	locationType: z.string().optional()
});

const GoogleDriveErrorSchema = z.object({
	error: z.object({
		code: z.number(),
		message: z.string(),
		status: z.string(),
		errors: z.array(GoogleDriveErrorDetailSchema).optional()
	})
});

type GoogleDriveErrorInfo = {
	code?: number;
	status?: string;
	message?: string;
	reason?: string;
	raw?: unknown;
};

function getGoogleDriveError(err: unknown): GoogleDriveErrorInfo | null {
	if (err instanceof Error) {
		try {
			const jsonStart = err.message.indexOf('{');
			if (jsonStart !== -1) {
				const parsed = JSON.parse(err.message.slice(jsonStart));
				const fromMessage = tryParse(parsed);
				if (fromMessage) return fromMessage;
			}

			return { message: err.message, raw: err };
		} catch {
			return null;
		}
	}

	// Fallback
	return null;
}

function tryParse(value: unknown): GoogleDriveErrorInfo | null {
	const parsed = GoogleDriveErrorSchema.safeParse(value);

	if (!parsed.success) {
		return null;
	}

	const error = parsed.data.error;

	return {
		code: error.code,
		status: error.status,
		message: error.message,
		reason: error.errors?.[0]?.reason,
		raw: value
	};
}
