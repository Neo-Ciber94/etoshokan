import { command, query, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { getGoogleAccessToken } from '$lib/server/auth/utils';
import {
	storedCategorySchema,
	wordsCollection,
	type StoredCategory
} from '$lib/data/words/words-collection';
import { GoogleDriveAdapter } from '$lib/common/isomorphic-box/adapters/google-drive-storage-adapter';
import { DRIVE_FOLDER_NAME } from '$lib/constants.server';
import { Result } from './result';

const storedCategoryInputSchema = storedCategorySchema.omit({ id: true });

async function getStorage() {
	const event = getRequestEvent();
	const token = await getGoogleAccessToken(event);

	if (!token) {
		throw new Error('Unauthorized');
	}

	return wordsCollection.adapt(
		new GoogleDriveAdapter<StoredCategory>({
			accessToken: token,
			fileName: 'saved-words.json',
			folderName: DRIVE_FOLDER_NAME
		})
	);
}

export const getAllWordCategories = query(async () => {
	try {
		const storage = await getStorage();
		return Result.ok(await storage.getAll());
	} catch (error) {
		return Result.err(error);
	}
});

export const createWordCategory = command(storedCategoryInputSchema, async (value) => {
	try {
		const storage = await getStorage();
		const data = await storage.$internals.adapter.set(value, storage.$internals.getContext());
		return Result.ok(data);
	} catch (error) {
		return Result.err(error);
	}
});

export const updateWordCategory = command(storedCategorySchema, async (value) => {
	try {
		const storage = await getStorage();
		const data = await storage.$internals.adapter.update(value, storage.$internals.getContext());
		return Result.ok(data);
	} catch (error) {
		return Result.err(error);
	}
});

export const removeWordCategory = command(z.object({ id: z.string() }), async ({ id }) => {
	try {
		const storage = await getStorage();
		const data = await storage.$internals.adapter.remove(id, storage.$internals.getContext());
		return Result.ok(data);
	} catch (error) {
		return Result.err(error);
	}
});
