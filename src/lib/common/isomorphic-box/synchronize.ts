import type { ZodType } from 'zod';
import type { LocalFirstStorageAdapter } from './adapters/local-first-storage-adapter';
import type { BaseModel } from './types';
import type { ActionsInitializer, AdaptCollection } from '.';

export async function synchronizeCollection<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TActions extends ActionsInitializer<E, TSchema>
>(source: AdaptCollection<E, TSchema, TActions, LocalFirstStorageAdapter<E>>) {
	const isOnline = await source.$internals.adapter.isOnline();

	if (!isOnline) {
		return;
	}

	const ctx = source.$internals.getContext();
	const adapter = source.$internals.adapter;

	await adapter.pushChanges(ctx, (entries) => {
		if (entries.length > 0) {
			console.log(`[synchronize] push changes with ${entries.length} entries`);
		}
	});

	await adapter.pullChanges(ctx, (entries) => {
		if (entries.length > 0) {
			console.log(`[synchronize] pull changes with ${entries.length} entries`);
		}
	});
}
