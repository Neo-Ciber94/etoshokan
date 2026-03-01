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

	if (error instanceof Error) {
		return error.message;
	}

	if (error instanceof ZodError) {
		return z.prettifyError(error);
	}

	return 'Unknown error';
}
