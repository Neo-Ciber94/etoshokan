import { z, type ZodType } from 'zod';
import type { StorageAdapter } from './storage-adapter';
import type { BaseModel } from './types';

type CollectionContext<E extends BaseModel, TSchema extends ZodType<E>> = {
	schema: TSchema;
	adapter: StorageAdapter<z.output<TSchema>>;
};

type AnyRecord = Record<string, unknown>;

export type ActionsInitializer<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TOutput extends AnyRecord = AnyRecord
> = {
	(ctx: CollectionContext<E, TSchema>): TOutput;
};

type CollectionOptions<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TActions extends ActionsInitializer<E, TSchema>
> = {
	schema: TSchema;
	actions: TActions;
};

type CollectionInternals<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TActions extends ActionsInitializer<E, TSchema>,
	TAdapter extends StorageAdapter<E>
> = {
	schema: TSchema;
	actions: ReturnType<TActions>;
	adapter: TAdapter;
	getContext(): CollectionContext<E, TSchema>;
};

export type AdaptCollection<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TActions extends ActionsInitializer<E, TSchema>,
	TAdapter extends StorageAdapter<E>
> = ReturnType<TActions> & {
	$internals: CollectionInternals<E, TSchema, TActions, TAdapter>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAdapter = StorageAdapter<any>;

export function createCollection<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TActions extends ActionsInitializer<E, TSchema>
>(options: CollectionOptions<E, TSchema, TActions>) {
	return {
		adapt<TAdapter extends AnyAdapter>(adapter: TAdapter) {
			const { schema } = options;
			const ctx: CollectionContext<E, TSchema> = { schema, adapter };
			const actions = options.actions(ctx) as ReturnType<TActions>;
			const adapted = actions as AdaptCollection<E, TSchema, TActions, TAdapter>;

			adapted.$internals = {
				schema,
				actions,
				adapter,
				getContext() {
					return ctx;
				}
			};

			return adapted;
		}
	};
}
