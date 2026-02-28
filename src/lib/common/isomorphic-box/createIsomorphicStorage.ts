import { z, type ZodType } from 'zod';
import type { StorageAdapter } from './storage-adapter';
import type { BaseModel } from './types';

type IsomorphicStorageContext<E extends BaseModel, TSchema extends ZodType<E>> = {
	schema: TSchema;
	adapter: StorageAdapter<z.output<TSchema>>;
};

type AnyRecord = Record<string, unknown>;

type Initializer<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TOutput extends AnyRecord = AnyRecord
> = {
	(ctx: IsomorphicStorageContext<E, TSchema>): TOutput;
};

type IsomorphicStorageOptions<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TMethods extends Initializer<E, TSchema>
> = {
	schema: TSchema;
	methods: TMethods;
};

export function createIsometricStorage<
	E extends BaseModel,
	TSchema extends ZodType<E>,
	TMethods extends Initializer<E, TSchema>
>(options: IsomorphicStorageOptions<E, TSchema, TMethods>) {
	return {
		adapt(adapter: StorageAdapter<z.output<TSchema>>) {
			const ctx: IsomorphicStorageContext<E, TSchema> = { schema: options.schema, adapter };
			const methods = options.methods(ctx);
			return methods as ReturnType<TMethods>;
		}
	};
}
