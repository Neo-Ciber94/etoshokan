import z from 'zod';
import { StorageAdapter, type StorageAdapterContext } from '../storage-adapter';
import type { HasId } from '../types';

export class LocalStorageAdapter<T extends HasId> extends StorageAdapter<T> {
	private storage: () => Storage;

	constructor(
		readonly key: string,
		storage?: () => Storage
	) {
		super();
		this.storage = storage ?? (() => localStorage);
	}

	private getJson(ctx: StorageAdapterContext<T>) {
		const key = this.key;
		const storage = this.storage();
		const raw = storage.getItem(key);

		if (raw == null) {
			return [];
		}

		const result = z.array(ctx.schema).parse(JSON.parse(raw));
		return result;
	}

	private mutate(ctx: StorageAdapterContext<T>, updater: (values: T[]) => T[]) {
		const key = this.key;

		try {
			const value = this.getJson(ctx);
			const result = updater(value);
			localStorage.setItem(key, JSON.stringify(result));
		} catch (err) {
			console.error(err);
			const result = updater([]);
			localStorage.setItem(key, JSON.stringify(result));
		}
	}

	getAll(ctx: StorageAdapterContext<T>): Promise<T[]> {
		try {
			const result = this.getJson(ctx);
			return Promise.resolve(result);
		} catch (err) {
			console.error(err);
			return Promise.resolve([]);
		}
	}

	async getById(id: T['id'], ctx: StorageAdapterContext<T>): Promise<T | null> {
		const results = await this.getAll(ctx);
		return results.find((x) => x.id === id) ?? null;
	}

	async add(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T> {
		const id = crypto.randomUUID();
		const newValue = { id, ...value } as T;
		this.mutate(ctx, (values) => [...values, newValue]);
		return newValue;
	}

	async remove(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		if (!(await this.has(id, ctx))) {
			return false;
		}

		this.mutate(ctx, (values) => values.filter((x) => x.id !== id));
		return true;
	}

	async has(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		const result = await this.getById(id, ctx);
		return result != null;
	}

	clear(): Promise<void> {
		this.storage().removeItem(this.key);
		return Promise.resolve();
	}
}
