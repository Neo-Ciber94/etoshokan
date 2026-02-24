import { z, type ZodType } from 'zod';
import type { BoxAdapter } from './box-adapter';
import type { HasId } from './types';

type IsomorphicBoxContext<E extends HasId, TSchema extends ZodType<E>> = {
	schema: TSchema;
	adapter: BoxAdapter<z.output<TSchema>>;
};

type AnyRecord = Record<string, unknown>;

type Initializer<
	E extends HasId,
	TSchema extends ZodType<E>,
	TOutput extends AnyRecord = AnyRecord
> = {
	(ctx: IsomorphicBoxContext<E, TSchema>): TOutput;
};

type IsomorphicBoxOptions<
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

export function createIsomorphicBox<
	E extends HasId,
	TSchema extends ZodType<E>,
	TQuery extends Initializer<E, TSchema>,
	TMutation extends Initializer<E, TSchema>
>(options: IsomorphicBoxOptions<E, TSchema, TQuery, TMutation>) {
	return {
		adapt(adapter: BoxAdapter<z.output<TSchema>>) {
			const ctx: IsomorphicBoxContext<E, TSchema> = { schema: options.schema, adapter };
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
