import { z, type ZodType } from 'zod';
import type { StorageAdapter } from './storage-adapter';
import type { HasId } from './types';

type IsomorphicStorageContext<E extends HasId, TSchema extends ZodType<E>> = {
	schema: TSchema;
	adapter: StorageAdapter<z.output<TSchema>>;
};

type AnyRecord = Record<string, unknown>;

type Initializer<
	E extends HasId,
	TSchema extends ZodType<E>,
	TOutput extends AnyRecord = AnyRecord
> = {
	(ctx: IsomorphicStorageContext<E, TSchema>): TOutput;
};

type IsomorphicStorageOptions<
	E extends HasId,
	TSchema extends ZodType<E>,
	TQuery extends Initializer<E, TSchema>,
	TMutation extends Initializer<E, TSchema>
> = {
	schema: TSchema;
	prepare: {
		query: TQuery;
		mutation: TMutation;
	};
};

export function createIsometricStorage<
	E extends HasId,
	TSchema extends ZodType<E>,
	TQuery extends Initializer<E, TSchema>,
	TMutation extends Initializer<E, TSchema>
>(options: IsomorphicStorageOptions<E, TSchema, TQuery, TMutation>) {
	return {
		adapt(adapter: StorageAdapter<z.output<TSchema>>) {
			const ctx: IsomorphicStorageContext<E, TSchema> = { schema: options.schema, adapter };
			const query = options.prepare.query(ctx);
			const mutation = options.prepare.mutation(ctx);
			return {
				query,
				mutation
			} as {
				query: ReturnType<TQuery>;
				mutation: ReturnType<TMutation>;
			};
		}
	};
}
