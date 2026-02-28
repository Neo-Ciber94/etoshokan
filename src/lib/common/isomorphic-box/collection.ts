import { z, type ZodType } from 'zod';
import type { StorageAdapter } from './storage-adapter';
import type { BaseModel } from './types';

type CollectionContext<E extends BaseModel, TSchema extends ZodType<E>> = {
	schema: TSchema;
	adapter: StorageAdapter<z.output<TSchema>>;
};

type AnyRecord = Record<string, unknown>;

type Initializer<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TOutput extends AnyRecord = AnyRecord
> = {
	(ctx: CollectionContext<E, TSchema>): TOutput;
};

type CollectionOptions<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TMethods extends Initializer<E, TSchema>
> = {
	schema: TSchema;
	methods: TMethods;
};

export function createCollection<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TMethods extends Initializer<E, TSchema>
>(options: CollectionOptions<E, TSchema, TMethods>) {
	return {
		adapt(adapter: StorageAdapter<z.output<TSchema>>) {
			const ctx: CollectionContext<E, TSchema> = { schema: options.schema, adapter };
			const methods = options.methods(ctx);
			return methods as ReturnType<TMethods>;
		}
	};
}
