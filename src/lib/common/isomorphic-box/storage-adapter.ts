import type { ZodType } from 'zod';
import type { BaseModel } from './types';

export type StorageAdapterContext<T> = {
	schema: ZodType<T>;
};

type Sortable = number | string | boolean | Date;

type StorageAdapterQuery<T extends BaseModel, TResult = T> = {
	filter?: (value: T) => boolean;
	sort?: <K extends Sortable>(value: T) => K;
	select?: (value: T) => TResult;
	limit?: number;
	offset?: number;
};

export abstract class StorageAdapter<T extends BaseModel> {
	abstract getAll(ctx: StorageAdapterContext<T>): Promise<T[]>;
	abstract get(id: string, ctx: StorageAdapterContext<T>): Promise<T | null>;
	abstract set(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T>;
	abstract update(value: T, ctx: StorageAdapterContext<T>): Promise<T>;
	abstract remove(id: string, ctx: StorageAdapterContext<T>): Promise<boolean>;
	abstract has(id: string, ctx: StorageAdapterContext<T>): Promise<boolean>;
	abstract clear(ctx: StorageAdapterContext<T>): Promise<void>;

	async query<TResult = T>(
		ctx: StorageAdapterContext<T>,
		query: StorageAdapterQuery<T, TResult>
	): Promise<TResult[]> {
		let results = await this.getAll(ctx);

		if (query.filter) {
			results = results.filter(query.filter);
		}

		if (query.sort) {
			const orderBy = query.sort;

			results = results.sort((obj1, obj2) => {
				const a = orderBy(obj1);
				const b = orderBy(obj2);
				return compare(a, b);
			});
		}

		const offset = query.offset || 0;
		const limit = query.limit || 0;
		results = results.slice(offset, limit);

		if (query.select) {
			return results.map(query.select);
		}

		return results as unknown as TResult[];
	}

	async updateWith(ctx: StorageAdapterContext<T>, id: string, updater: (value: T) => T) {
		const prev = await this.get(id, ctx);

		if (prev == null) {
			return false;
		}

		const result = updater(prev);
		this.update(result, ctx);
		return true;
	}

	async first(ctx: StorageAdapterContext<T>, predicate: (value: T) => boolean) {
		const results = await this.getAll(ctx);
		const filtered = results.filter(predicate);

		if (filtered.length > 0) {
			return filtered[0];
		}

		return null;
	}
}

function compare<K extends Sortable>(a: K, b: K): number {
	if (typeof a === 'number' && typeof b === 'number') {
		return a - b;
	}

	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return Number(a) - Number(b);
	}

	if (typeof a === 'string' && typeof b === 'string') {
		return a.localeCompare(b);
	}

	if (a instanceof Date && b instanceof Date) {
		return a.getDate() - b.getDate();
	}

	return -1;
}
